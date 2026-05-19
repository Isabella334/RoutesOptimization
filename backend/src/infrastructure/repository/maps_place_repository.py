from domain.entities import Place
from infrastructure.repository.place_repository import PlaceRepository

class GoogleMapsPlaceRepository(PlaceRepository):
    def get_places(self, query: str) -> list[Place]:
        raise NotImplementedError("Google Maps API integration not yet implemented")
