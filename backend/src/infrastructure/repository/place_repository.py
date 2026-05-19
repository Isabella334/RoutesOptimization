from abc import ABC, abstractmethod
from domain.entities import Place

class PlaceRepository(ABC):
    @abstractmethod
    def get_places(self, query: str) -> list[Place]:
        pass
