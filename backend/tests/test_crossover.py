from domain.entities import Place, Coordinates
from use_cases.genetic_algorithm.route import Route
from use_cases.genetic_algorithm.crossover import OrderedCrossover


def make_place(place_id: str, name: str):
    return Place(place_id, name, Coordinates(0, 0))


PLACE_A = make_place("1", "A")
PLACE_B = make_place("2", "B")
PLACE_C = make_place("3", "C")
PLACE_D = make_place("4", "D")
PLACE_E = make_place("5", "E")


def test_crossover_creates_valid_child():

    parent1 = Route([
        PLACE_A,
        PLACE_B,
        PLACE_C,
        PLACE_D,
        PLACE_E
    ])

    parent2 = Route([
        PLACE_C,
        PLACE_E,
        PLACE_A,
        PLACE_B,
        PLACE_D
    ])

    crossover = OrderedCrossover()
    child = crossover.crossover(parent1, parent2)
    assert len(child.route) == 5
    assert len(set(child.route)) == 5
    assert set(child.route) == {
        PLACE_A,
        PLACE_B,
        PLACE_C,
        PLACE_D,
        PLACE_E
    }