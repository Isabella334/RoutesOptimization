from domain.entities import Place, Coordinates
from use_cases.genetic_algorithm.population import Population


def make_place(place_id: str, name: str, lat: float, lng: float) -> Place:
    return Place(place_id, name, Coordinates(lat, lng))


PLACE_A = make_place("1", "A", 14.0, -90.0)
PLACE_B = make_place("2", "B", 14.1, -90.1)
PLACE_C = make_place("3", "C", 14.2, -90.2)


def test_population_generates_correct_size():
    population = Population(
        places=[PLACE_A, PLACE_B, PLACE_C],
        population_size=10
    )
    assert len(population.routes) == 10


def test_each_route_contains_all_places():
    population = Population(
        places=[PLACE_A, PLACE_B, PLACE_C],
        population_size=5
    )

    for route in population.routes:
        assert len(route.route) == 3
        assert set(route.route) == {PLACE_A, PLACE_B, PLACE_C}


def test_get_best_route_returns_route():
    population = Population(
        places=[PLACE_A, PLACE_B, PLACE_C],
        population_size=5
    )

    best_route = population.get_best_route()

    assert best_route is not None
    assert hasattr(best_route, "fitness")