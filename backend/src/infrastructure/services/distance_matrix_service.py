import os
import requests
from domain import Place

class DistanceMatrixService:
    _URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

    def __init__(self):
        self._api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()

    def build(self, places: list[Place], mode: str = "driving") -> list[list[float]]:
        if not self._api_key:
            raise RuntimeError("GOOGLE_MAPS_API_KEY not configured")

        coords = "|".join(
            f"{p.coordinates.latitude},{p.coordinates.longitude}" for p in places
        )
        response = requests.get(
            self._URL,
            params={"origins": coords, "destinations": coords, "mode": mode, "units": "metric", "key": self._api_key},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "OK":
            raise RuntimeError(f"Distance Matrix API error: {data.get('status')}")

        n = len(places)
        return [
            [
                data["rows"][i]["elements"][j]["distance"]["value"] / 1000
                if data["rows"][i]["elements"][j]["status"] == "OK"
                else places[i].distance_to(places[j])
                for j in range(n)
            ]
            for i in range(n)
        ]
