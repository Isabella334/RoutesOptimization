from abc import ABC, abstractmethod
from domain import Place

class PlaceRepository(ABC):
    @abstractmethod
    def get_places(self, query: str) -> list[Place]:
        pass
    @abstractmethod
    def get_place_by_id(self, place_id: str) -> Place:
        pass
