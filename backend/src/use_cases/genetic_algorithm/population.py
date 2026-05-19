import random
from src.domain.entities import Place
from .route import Route


class Population:
    def __init__(self, places: list[Place], population_size: int, closed: bool = True):
        self.routes = self._generate_population(places, population_size, closed)

    def _generate_population(
        self,
        places: list[Place],
        population_size: int,
        closed: bool
    ) -> list[Route]:

        population = []

        for _ in range(population_size):
            shuffled = random.sample(places, len(places))
            population.append(Route(shuffled, closed))

        return population

    def get_best_route(self) -> Route:
        return max(self.routes, key=lambda route: route.fitness)