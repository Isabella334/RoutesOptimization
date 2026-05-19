from pydantic import BaseModel

class PlaceResultDTO(BaseModel):
    place_id: str
    name: str
    order: int

class OptimizeRouteResponse(BaseModel):
    route: list[PlaceResultDTO]
    total_distance_km: float