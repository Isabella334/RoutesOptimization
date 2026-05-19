from pydantic import BaseModel

class PlaceDTO(BaseModel):
    place_id: str
    name: str
    latitude: float
    longitude: float

class OptimizeRouteRequest(BaseModel):
    places: list[PlaceDTO]
    closed: bool = True