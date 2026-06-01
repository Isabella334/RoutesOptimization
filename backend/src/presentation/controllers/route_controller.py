from fastapi import APIRouter, Depends, HTTPException
from ..dtos.optimize_route_request import OptimizeRouteRequest
from ..dtos.optimize_route_response import OptimizeRouteResponse, PlaceResultDTO
from ..dependencies import require_auth
from use_cases import GeneticAlgorithm
from infrastructure import DistanceMatrixService
from domain import Place, Coordinates

router = APIRouter(prefix="/routes")

_MAX_RADIUS_KM = 100
_MIN_PLACES = 2
_MAX_PLACES = 15

def _build_dist_fn(places: list[Place], mode: str):
    try:
        matrix = DistanceMatrixService().build(places, mode=mode)
        idx = {p.place_id: i for i, p in enumerate(places)}
        return lambda a, b: matrix[idx[a.place_id]][idx[b.place_id]]
    except Exception:
        return None

@router.post("/optimize", response_model=OptimizeRouteResponse, dependencies=[Depends(require_auth)])
def optimize_route(request: OptimizeRouteRequest) -> OptimizeRouteResponse:
    if not (_MIN_PLACES <= len(request.places) <= _MAX_PLACES):
        raise HTTPException(status_code=400, detail=f"Between {_MIN_PLACES} and {_MAX_PLACES} destinations required")

    places = [
        Place(place_id=p.place_id, name=p.name, coordinates=Coordinates(p.latitude, p.longitude))
        for p in request.places
    ]

    for i in range(len(places)):
        for j in range(i + 1, len(places)):
            if places[i].distance_to(places[j]) > _MAX_RADIUS_KM:
                raise HTTPException(status_code=400, detail=f"A pair of destinations exceeds {_MAX_RADIUS_KM} km")

    dist_fn = _build_dist_fn(places, request.travel_mode)
    best_route = GeneticAlgorithm().run(places, closed=request.closed, dist_fn=dist_fn)
    total_distance = 1 / best_route.fitness

    return OptimizeRouteResponse(
        route=[
            PlaceResultDTO(place_id=p.place_id, name=p.name, order=i + 1)
            for i, p in enumerate(best_route.route)
        ],
        total_distance_km=round(total_distance, 2),
    )
