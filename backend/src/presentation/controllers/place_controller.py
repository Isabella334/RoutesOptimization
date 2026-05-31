from fastapi import APIRouter, Depends, Query
from infrastructure import GoogleMapsPlaceRepository
from ..dtos.optimize_route_request import PlaceDTO
from ..dtos.places_response import PlacesResponse
from ..dependencies import require_auth

router = APIRouter(prefix="/places")


@router.get("", response_model=PlacesResponse, dependencies=[Depends(require_auth)])
def search_places(query: str = Query(..., min_length=1)) -> PlacesResponse:
    repository = GoogleMapsPlaceRepository()
    places = repository.get_places(query)
    return PlacesResponse(
        places=[
            PlaceDTO(
                place_id=p.place_id,
                name=p.name,
                latitude=p.coordinates.latitude,
                longitude=p.coordinates.longitude,
            )
            for p in places
        ]
    )
