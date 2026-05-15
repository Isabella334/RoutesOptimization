from domain.entities import Place, Coordinates
from use_cases.genetic_algorithm.route import Route
from use_cases.genetic_algorithm.selection import TournamentSelection


def make_place(place_id: str, name: str, lat: float, lng: float):
    return Place(place_id, name, Coordinates(lat, lng))


PLACE_A = make_place("1", "Torre del Reformador", 14.6130, -90.5165)
PLACE_B = make_place("2", "Parque Central", 14.6408, -90.5133)
PLACE_C = make_place("3", "Zoológico La Aurora", 14.5894, -90.5196)


def test_selection_returns_route():
    routes = [
        Route([PLACE_A, PLACE_B, PLACE_C]),
        Route([PLACE_C, PLACE_B, PLACE_A]),
        Route([PLACE_B, PLACE_A, PLACE_C]),
    ]

    selector = TournamentSelection(tournament_size=3)
    selected = selector.select(routes)

    assert isinstance(selected, Route)

def test_selection_returns_route_with_highest_fitness():
    close_place = make_place("4", "Nearby Place", 14.6131, -90.5166)
    far_place = make_place("5", "Far Place", 15.9000, -88.0000)

    routes = [
        Route([PLACE_A, close_place]),
        Route([PLACE_A, far_place]),
    ]

    selector = TournamentSelection(tournament_size=2)

    selected = selector.select(routes)

    assert selected.route == [PLACE_A, close_place]