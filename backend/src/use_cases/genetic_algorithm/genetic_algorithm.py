from typing import Callable
from domain import Place
from .population import Population
from .selection import TournamentSelection
from .crossover import OrderedCrossover
from .mutation import SwapMutation
from .route import Route


class GeneticAlgorithm:
    def __init__(
        self,
        population_size: int = 100,
        generations: int = 500,
        mutation_rate: float = 0.01,
        tournament_size: int = 5,
        elitism: bool = True,
    ):
        self.population_size = population_size
        self.generations = generations
        self.elitism = elitism
        self.selection = TournamentSelection(tournament_size=tournament_size)
        self.crossover = OrderedCrossover()
        self.mutation = SwapMutation(mutation_rate=mutation_rate)

    def run(
        self,
        places: list[Place],
        closed: bool = True,
        dist_fn: Callable[[Place, Place], float] | None = None,
    ) -> Route:
        population = Population(places, self.population_size, closed, dist_fn)
        best_route = population.get_best_route()

        for _ in range(self.generations):
            new_routes: list[Route] = []
            if self.elitism:
                new_routes.append(best_route.copy())

            while len(new_routes) < self.population_size:
                parent1 = self.selection.select(population.routes)
                parent2 = self.selection.select(population.routes)
                child = self.crossover.crossover(parent1, parent2)
                child = self.mutation.mutate(child)
                new_routes.append(child)

            population.routes = new_routes
            generation_best = population.get_best_route()
            if generation_best.fitness > best_route.fitness:
                best_route = generation_best

        return best_route
