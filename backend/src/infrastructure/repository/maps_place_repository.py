import os
import requests
from data import PlaceMapper
from domain import Place
from .place_repository import PlaceRepository

PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

class GoogleMapsPlaceRepository(PlaceRepository):
    def __init__(self):
        self._api_key = os.getenv("GOOGLE_MAPS_API_KEY")

    def get_places(self, query: str) -> list[Place]:
        response = requests.get(
            PLACES_TEXT_SEARCH_URL,
            params={"query": query, "key": self._api_key},
        )
        response.raise_for_status()
        candidates = response.json().get("results", [])
        return [PlaceMapper.from_api_response(candidate) for candidate in candidates]

    def get_place_by_id(self, place_id: str) -> Place:
        response = requests.get(
            PLACE_DETAILS_URL,
            params={"place_id": place_id, "key": self._api_key},
        )
        response.raise_for_status()
        candidate = response.json().get("result", {})
        return PlaceMapper.from_api_response(candidate)
