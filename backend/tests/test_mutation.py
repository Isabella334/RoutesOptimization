from domain.entities import Place, Coordinates
from use_cases.genetic_algorithm.route import Route
from use_cases.genetic_algorithm.mutation import SwapMutation


def make_place(place_id: str, name: str):
    return Place(place_id, name, Coordinates(0, 0))


PLACE_A = make_place("1", "A")
PLACE_B = make_place("2", "B")
PLACE_C = make_place("3", "C")
PLACE_D = make_place("4", "D")


def test_mutation_preserves_all_places():

    route = Route([
        PLACE_A,
        PLACE_B,
        PLACE_C,
        PLACE_D
    ])

    mutation = SwapMutation(mutation_rate=1.0)
    mutated = mutation.mutate(route)
    assert len(mutated.route) == 4
    assert set(mutated.route) == {
        PLACE_A,
        PLACE_B,
        PLACE_C,
        PLACE_D
    }


def test_mutation_returns_route():
    route = Route([
        PLACE_A,
        PLACE_B,
        PLACE_C,
        PLACE_D
    ])

    mutation = SwapMutation()
    mutated = mutation.mutate(route)
    assert isinstance(mutated, Route)