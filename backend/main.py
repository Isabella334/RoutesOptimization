"""
Entry point HTTP de la Cloud Function / Cloud Run.

Orden de validación (nunca reordenar):
  1. CORS preflight
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

import functions_framework
import firebase_admin
from firebase_admin import auth

# Asegurar que los paquetes locales (domain, use_cases, etc.) sean importables
# cuando se ejecuta desde el directorio backend/ en local sin instalación previa.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from domain import Place, Coordinates
from use_cases import GeneticAlgorithm

# Inicializar firebase_admin una sola vez (en Cloud Run usa ADC automáticamente;
# en local requiere la variable GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON
# de la service account del proyecto Firebase).
if not firebase_admin._apps:
    firebase_admin.initialize_app()

# Cabeceras CORS que van en toda respuesta (incluyendo errores).
_CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Content-Type": "application/json",
}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distancia en km entre dos puntos usando la fórmula de haversine."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _verificar_ip(request) -> bool:
    """
    Comprueba si la IP del cliente está en la allowlist.

    Lee el primer valor de X-Forwarded-For (IP real del cliente cuando pasa
    por el load balancer de Google). Si ALLOWED_IPS está vacío, permite todo.

    Trade-off: X-Forwarded-For puede falsificarse si alguien llega directo a
    Cloud Run sin pasar por el LB. Cloud Armor (Opción A) es más robusto.
    """
    allowed_raw = os.environ.get("ALLOWED_IPS", "").strip()
    if not allowed_raw:
        # Sin allowlist configurada → no restringir (útil en desarrollo)
        return True

    forwarded = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else request.remote_addr
    allowed = {ip.strip() for ip in allowed_raw.split(",") if ip.strip()}
    return client_ip in allowed


def _verificar_token(request) -> bool:
    """
    Verifica el ID token de Firebase en el header Authorization.

    El token es un JWT firmado por Firebase válido por 1 hora.
    firebase_admin.auth.verify_id_token() verifica firma, expiración y emisor.
    """
    auth_header = request.headers.get("Authorization", "")
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

    Se usa haversine (línea recta) porque es barato (sin llamadas a API) y
    conservador: la distancia real por carretera siempre es mayor, así que si
    la línea recta supera los 100 km, la ruta por carretera también los superaría.
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


@functions_framework.http
def main(request):
    """Endpoint principal de la Cloud Function. Recibe POST con destinos y retorna la ruta óptima."""

    # 1. CORS preflight — el navegador envía OPTIONS antes del POST real
    if request.method == "OPTIONS":
        return ("", 204, _CORS_HEADERS)

    # 2. Verificación de IP
    if not _verificar_ip(request):
        return (json.dumps({"error": "Forbidden: IP no permitida"}), 403, _CORS_HEADERS)

    # 3. Verificación del token de Firebase
    if not _verificar_token(request):
        return (json.dumps({"error": "Unauthorized: token inválido o ausente"}), 401, _CORS_HEADERS)

    # 4. Parsear body
    data = request.get_json(silent=True)
    if not data:
        return (json.dumps({"error": "Body JSON requerido"}), 400, _CORS_HEADERS)

    places_data = data.get("places", [])
    closed = bool(data.get("closed", True))

    # Validar cantidad de destinos
    if not (2 <= len(places_data) <= 15):
        return (
            json.dumps({"error": "Se requieren entre 2 y 15 destinos"}),
            400, _CORS_HEADERS,
        )

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
        return (json.dumps({"error": f"Formato de destino inválido: {e}"}), 400, _CORS_HEADERS)

    # Validar radio máximo entre pares de destinos
    if not _validar_radio(places):
        return (
            json.dumps({"error": "Algún par de destinos supera los 100 km"}),
            400, _CORS_HEADERS,
        )

    # 5. Correr el algoritmo genético
    ga = GeneticAlgorithm()
    best_route = ga.run(places, closed=closed)

    # fitness = 1 / distancia_total → distancia = 1 / fitness
    total_distance_km = round(1 / best_route.fitness, 2)

    # 6. Construir respuesta
    response = {
        "route": [
            {"place_id": p.place_id, "name": p.name, "order": i + 1}
            for i, p in enumerate(best_route.route)
        ],
        "total_distance_km": total_distance_km,
        "closed": closed,
    }

    return (json.dumps(response), 200, _CORS_HEADERS)
