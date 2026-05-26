from domain import Coordinates, Place
from .place_repository import PlaceRepository

class MockPlaceRepository(PlaceRepository):
    def get_places(self, query: str) -> list[Place]:
        return [
            Place("ChIJcyoRXi2iiYURjC2n6GwgCDo", "Torre del Reformador", Coordinates(14.6130084, -90.5165861)),
            Place("ChIJ0WGURRKiiYURFgbHnXEMpoc", "Parque Central", Coordinates(14.6408485, -90.5132907)),
            Place("ChIJrR3YINB5iYURl6NO-aFn1Oo", "Zoológico La Aurora", Coordinates(14.5894284, -90.5196122)),
            Place("ChIJ5XGTmQmiiYURqnjRPe0GNUQ", "Mercado Central", Coordinates(14.6404800, -90.5127400)),
            Place("ChIJN1t_tDeuEmsRUsoyG83frY4", "Museo Nacional de Arte Moderno", Coordinates(14.5892300, -90.5177600)),
        ]
