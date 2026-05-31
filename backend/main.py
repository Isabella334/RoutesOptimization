"""
Entry point HTTP del backend desplegado en Cloud Run con FastAPI.

Orden de validación en cada request:
  1. CORS (manejado por middleware)
  2. Verificación de IP contra allowlist
  3. Verificación del ID token de Firebase
  4. Validación del body (cantidad de destinos, radio máximo)
  5. Algoritmo genético
  6. Respuesta JSON
"""
import json
import math
import os
import sys

import firebase_admin
from firebase_admin import auth
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Permite importar domain, use_cases, etc. cuando se ejecuta desde backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from domain import Place, Coordinates
from use_cases import GeneticAlgorithm

# Inicializar firebase_admin una sola vez.
# Se pasa el project ID explícitamente porque el proyecto GCP (tough-electron-388917)
# puede ser distinto al proyecto Firebase (routesoptimizer-53444).
# En Cloud Run usa Application Default Credentials automáticamente.
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={
        "projectId": os.environ.get("FIREBASE_PROJECT_ID", "routesoptimizer-53444")
    })

app = FastAPI(title="Route Optimizer API")

# CORS: permite llamadas desde el frontend (cualquier origen en desarrollo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distancia en km entre dos puntos usando la fórmula de haversine."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _verificar_ip(request: Request) -> bool:
    """
    Comprueba si la IP del cliente está en la allowlist.

    Lee X-Forwarded-For (IP real cuando pasa por el load balancer de Google).
    Si ALLOWED_IPS está vacío, permite todo (útil en desarrollo).

    Trade-off: X-Forwarded-For puede falsificarse si se accede directo a Cloud Run
    sin pasar por el LB. Cloud Armor es más robusto pero más complejo de configurar.
    """
    allowed_raw = os.environ.get("ALLOWED_IPS", "").strip()
    if not allowed_raw:
        return True

    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    allowed = {ip.strip() for ip in allowed_raw.split(",") if ip.strip()}
    return client_ip in allowed


def _verificar_token(request: Request) -> bool:
    """
    Verifica el ID token de Firebase en el header Authorization.

    El token es un JWT firmado por Firebase válido por 1 hora.
    firebase_admin.auth.verify_id_token() verifica firma, expiración e issuer.
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return False
    token = auth_header[len("Bearer "):]
    try:
        auth.verify_id_token(token)
        return True
    except Exception:
        return False


def _validar_radio(places: list) -> bool:
    """
    Verifica que ningún par de destinos supere 100 km entre sí (haversine).

    Usa línea recta porque es barato y conservador: la distancia real por carretera
    siempre es mayor, así que si haversine supera 100 km, la ruta también lo haría.
    """
    for i in range(len(places)):
        for j in range(i + 1, len(places)):
            d = _haversine_km(
                places[i].coordinates.latitude, places[i].coordinates.longitude,
                places[j].coordinates.latitude, places[j].coordinates.longitude,
            )
            if d > 100:
                return False
    return True


@app.post("/")
async def optimize(request: Request):
    """Recibe destinos y retorna la ruta óptima calculada con el algoritmo genético."""

    # 1. Verificación de IP
    if not _verificar_ip(request):
        return JSONResponse({"error": "Forbidden: IP no permitida"}, status_code=403)

    # 2. Verificación del token de Firebase
    if not _verificar_token(request):
        return JSONResponse({"error": "Unauthorized: token inválido o ausente"}, status_code=401)

    # 3. Parsear body
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Body JSON requerido"}, status_code=400)

    places_data = data.get("places", [])
    closed = bool(data.get("closed", True))

    # Validar cantidad de destinos
    if not (2 <= len(places_data) <= 15):
        return JSONResponse({"error": "Se requieren entre 2 y 15 destinos"}, status_code=400)

    # Construir objetos de dominio.
    # place_id es el índice string ("0", "1", ...) para mapear de vuelta en el frontend.
    try:
        places = [
            Place(
                place_id=str(i),
                name=p["name"],
                coordinates=Coordinates(float(p["lat"]), float(p["lng"])),
            )
            for i, p in enumerate(places_data)
        ]
    except (KeyError, ValueError) as e:
        return JSONResponse({"error": f"Formato de destino inválido: {e}"}, status_code=400)

    # Validar radio máximo entre pares de destinos
    if not _validar_radio(places):
        return JSONResponse({"error": "Algún par de destinos supera los 100 km"}, status_code=400)

    # Construir matriz de distancias reales y correr el GA
    dist_matrix = None
    try:
        from distance_matrix import construir_matriz
        dist_matrix = construir_matriz(places)
    except Exception as e:
        print(f"[WARN] Distance Matrix API no disponible, usando haversine: {e}")

    ga = GeneticAlgorithm()
    best_route = ga.run(places, closed=closed, dist_matrix=dist_matrix)

    total_distance_km = round(1 / best_route.fitness, 2)

    return JSONResponse({
        "route": [
            {"place_id": p.place_id, "name": p.name, "order": i + 1}
            for i, p in enumerate(best_route.route)
        ],
        "total_distance_km": total_distance_km,
        "closed": closed,
    })
