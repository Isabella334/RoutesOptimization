from domain.entities import Place, Coordinates
from use_cases.genetic_algorithm.route import Route

def make_place(place_id: str, name: str, lat: float, lng: float) -> Place:
    return Place(place_id=place_id, name=name, coordinates=Coordinates(lat, lng))

PLACE_A = make_place("1", "Torre del Reformador", 14.6130, -90.5165)
PLACE_B = make_place("2", "Parque Central", 14.6408, -90.5133)
PLACE_C = make_place("3", "Zoológico La Aurora", 14.5894, -90.5196)


def test_route_stores_places():
    route = Route([PLACE_A, PLACE_B, PLACE_C])
    assert len(route.route) == 3

def test_fitness_is_positive():
    route = Route([PLACE_A, PLACE_B, PLACE_C])
    assert route.fitness > 0.0

def test_single_place_returns_zero_fitness():
    route = Route([PLACE_A])
    assert route.fitness == 0.0

def test_empty_route_returns_zero_fitness():
    route = Route([])
    assert route.fitness == 0.0

def test_shorter_route_has_higher_fitness():
    close_place = make_place("4", "Nearby Place", 14.6131, -90.5166)
    far_place = make_place("5", "Far Place", 15.9000, -88.0000)

    short_route = Route([PLACE_A, close_place])
    long_route = Route([PLACE_A, far_place])

    assert short_route.fitness > long_route.fitness
