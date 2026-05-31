from pydantic import BaseModel
from .optimize_route_request import PlaceDTO

class PlacesResponse(BaseModel):
    places: list[PlaceDTO]
