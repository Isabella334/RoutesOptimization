"""
Construcción de la matriz de distancias NxN usando Google Distance Matrix API.

La matriz se precomputa UNA sola vez antes de correr el GA.
Razón: el GA evalúa miles de permutaciones; llamar a la API en cada evaluación
sería O(N² × generaciones) llamadas — prohibitivamente caro y lento.
Con la matriz precomputada, cada evaluación es O(N) operaciones en memoria.
"""
import os
import requests
from domain import Place


def construir_matriz(places: list[Place]) -> list[list[float]]:
    """
    Construye una matriz NxN donde M[i][j] es la distancia en km de place[i] a place[j].

    Usa Google Distance Matrix API con modo 'driving'.
    Si la API falla o la key no está configurada, lanza RuntimeError
    para que el caller decida si hacer fallback a haversine.
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY no configurada")

    # Construir string de coordenadas: "lat,lng|lat,lng|..."
    coords = "|".join(
        f"{p.coordinates.latitude},{p.coordinates.longitude}" for p in places
    )

    response = requests.get(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
        params={
            "origins": coords,
            "destinations": coords,
            "mode": "driving",
            "units": "metric",
            "key": api_key,
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()

    if data.get("status") != "OK":
        raise RuntimeError(f"Distance Matrix API error: {data.get('status')}")

    n = len(places)
    # Convertir metros a kilómetros; si un par no tiene ruta, usar haversine como fallback
    matrix = [
        [
            data["rows"][i]["elements"][j]["distance"]["value"] / 1000
            if data["rows"][i]["elements"][j]["status"] == "OK"
            else places[i].distance_to(places[j])
            for j in range(n)
        ]
        for i in range(n)
    ]

    return matrix
