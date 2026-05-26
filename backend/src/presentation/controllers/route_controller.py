from fastapi import APIRouter
from ..dtos.optimize_route_request import OptimizeRouteRequest
from ..dtos.optimize_route_response import OptimizeRouteResponse, PlaceResultDTO
from use_cases import GeneticAlgorithm
from domain import Place, Coordinates

router = APIRouter(prefix="/routes")

@router.post("/optimize", response_model=OptimizeRouteResponse)
def optimize_route(request: OptimizeRouteRequest) -> OptimizeRouteResponse:
    places = [
        Place(
            place_id=p.place_id,
            name=p.name,
            coordinates=Coordinates(p.latitude, p.longitude)
        )
        for p in request.places
    ]
    ga = GeneticAlgorithm()
    best_route = ga.run(places, closed=request.closed)
    total_distance = 1 / best_route.fitness
    route_result = [
        PlaceResultDTO(place_id=p.place_id, name=p.name, order=i + 1)
        for i, p in enumerate(best_route.route)
    ]

    return OptimizeRouteResponse(
        route=route_result,
        total_distance_km=round(total_distance, 2)
    )
