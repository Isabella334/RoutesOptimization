"""Tests para el algoritmo genético: Route, Population, operadores y GeneticAlgorithm."""
import pytest
from domain import Place, Coordinates
from use_cases.genetic_algorithm.route import Route
from use_cases.genetic_algorithm.population import Population
from use_cases.genetic_algorithm.crossover import OrderedCrossover
from use_cases.genetic_algorithm.mutation import SwapMutation
from use_cases.genetic_algorithm.selection import TournamentSelection
from use_cases import GeneticAlgorithm


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_places(n: int) -> list[Place]:
    """Genera n lugares distribuidos en una cuadrícula alrededor de Guatemala City."""
    base_lat, base_lng = 14.63, -90.50
    return [
        Place(str(i), f"Lugar {i}", Coordinates(base_lat + i * 0.01, base_lng + i * 0.01))
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class TestRoute:
    def test_fitness_is_positive(self):
        places = make_places(3)
        route = Route(places, closed=True)
        assert route.fitness > 0

    def test_closed_route_longer_than_open(self):
        """Una ruta cerrada recorre más distancia que una abierta con los mismos puntos."""
        places = make_places(4)
        closed = Route(places, closed=True)
        open_ = Route(places, closed=False)
        assert closed.fitness < open_.fitness  # menor fitness = mayor distancia

    def test_fitness_inverse_of_distance(self):
        """fitness = 1 / distancia_total."""
        places = make_places(3)
        route = Route(places, closed=False)
        total = sum(places[i].distance_to(places[i + 1]) for i in range(len(places) - 1))
        assert abs(route.fitness - 1 / total) < 1e-9

    def test_copy_is_independent(self):
        """La copia no debe compartir la lista de ruta con el original."""
        places = make_places(3)
        original = Route(places, closed=True)
        copy = original.copy()
        copy.route[0] = places[2]
        assert original.route[0] == places[0]

    def test_single_place_fitness_is_zero(self):
        places = make_places(1)
        route = Route(places, closed=True)
        assert route.fitness == 0.0


# ---------------------------------------------------------------------------
# Population
# ---------------------------------------------------------------------------

class TestPopulation:
    def test_population_size(self):
        places = make_places(5)
        pop = Population(places, population_size=20, closed=True)
        assert len(pop.routes) == 20

    def test_all_routes_are_permutations(self):
        """Cada ruta debe contener exactamente los mismos lugares, en distinto orden."""
        places = make_places(5)
        pop = Population(places, population_size=10, closed=True)
        place_ids = {p.place_id for p in places}
        for route in pop.routes:
            assert {p.place_id for p in route.route} == place_ids

    def test_get_best_route_has_highest_fitness(self):
        places = make_places(5)
        pop = Population(places, population_size=30, closed=True)
        best = pop.get_best_route()
        assert all(best.fitness >= r.fitness for r in pop.routes)


# ---------------------------------------------------------------------------
# Crossover (Order Crossover — OX)
# ---------------------------------------------------------------------------

class TestOrderedCrossover:
    def test_child_is_valid_permutation(self):
        """El hijo debe contener exactamente los mismos lugares que los padres."""
        places = make_places(6)
        p1 = Route(places[:], closed=True)
        p2 = Route(list(reversed(places)), closed=True)
        cx = OrderedCrossover()
        child = cx.crossover(p1, p2)
        assert {p.place_id for p in child.route} == {p.place_id for p in places}
        assert len(child.route) == len(places)

    def test_child_has_no_duplicates(self):
        places = make_places(8)
        p1 = Route(places[:], closed=True)
        p2 = Route(list(reversed(places)), closed=True)
        cx = OrderedCrossover()
        child = cx.crossover(p1, p2)
        ids = [p.place_id for p in child.route]
        assert len(ids) == len(set(ids))

    def test_child_inherits_closed_mode(self):
        places = make_places(4)
        p1 = Route(places, closed=False)
        p2 = Route(list(reversed(places)), closed=False)
        cx = OrderedCrossover()
        child = cx.crossover(p1, p2)
        assert child.closed is False


# ---------------------------------------------------------------------------
# Mutation
# ---------------------------------------------------------------------------

class TestSwapMutation:
    def test_mutated_is_still_valid_permutation(self):
        places = make_places(6)
        route = Route(places[:], closed=True)
        mut = SwapMutation(mutation_rate=1.0)  # mutación garantizada
        mutated = mut.mutate(route)
        assert {p.place_id for p in mutated.route} == {p.place_id for p in places}

    def test_mutation_rate_zero_preserves_order(self):
        """Con tasa 0, la ruta mutada debe tener el mismo orden que la original."""
        places = make_places(6)
        route = Route(places[:], closed=True)
        mut = SwapMutation(mutation_rate=0.0)
        mutated = mut.mutate(route)
        assert [p.place_id for p in mutated.route] == [p.place_id for p in route.route]

    def test_mutated_fitness_is_recalculated(self):
        places = make_places(5)
        route = Route(places[:], closed=False)  # abierta para simplificar el cálculo
        mut = SwapMutation(mutation_rate=1.0)
        mutated = mut.mutate(route)
        # El fitness debe ser consistente con la nueva ruta (solo pares consecutivos)
        total = sum(
            mutated.route[i].distance_to(mutated.route[i + 1])
            for i in range(len(mutated.route) - 1)
        )
        expected = 1 / total
        assert abs(mutated.fitness - expected) < 1e-9


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

class TestTournamentSelection:
    def test_returns_a_route(self):
        places = make_places(5)
        pop = Population(places, 20, closed=True)
        sel = TournamentSelection(tournament_size=3)
        winner = sel.select(pop.routes)
        assert isinstance(winner, Route)

    def test_winner_is_from_population(self):
        places = make_places(5)
        pop = Population(places, 20, closed=True)
        sel = TournamentSelection(tournament_size=3)
        winner = sel.select(pop.routes)
        assert winner in pop.routes


# ---------------------------------------------------------------------------
# GeneticAlgorithm — integración
# ---------------------------------------------------------------------------

class TestGeneticAlgorithm:
    def test_returns_valid_permutation(self):
        places = make_places(5)
        ga = GeneticAlgorithm(population_size=20, generations=10)
        result = ga.run(places, closed=True)
        assert {p.place_id for p in result.route} == {p.place_id for p in places}

    def test_open_route_does_not_close(self):
        """La ruta abierta no debe incluir el segmento de regreso al origen."""
        places = make_places(4)
        ga = GeneticAlgorithm(population_size=10, generations=5)
        result = ga.run(places, closed=False)
        assert result.closed is False

    def test_result_fitness_is_positive(self):
        places = make_places(4)
        ga = GeneticAlgorithm(population_size=10, generations=5)
        result = ga.run(places, closed=True)
        assert result.fitness > 0

    def test_more_generations_same_or_better_fitness(self):
        """Con más generaciones, el fitness debe ser igual o mejor."""
        places = make_places(6)
        ga_few = GeneticAlgorithm(population_size=20, generations=5)
        ga_many = GeneticAlgorithm(population_size=20, generations=50)
        result_few = ga_few.run(places, closed=True)
        result_many = ga_many.run(places, closed=True)
        assert result_many.fitness >= result_few.fitness * 0.95  # margen del 5%
