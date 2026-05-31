import random
from typing import Callable
from domain import Place
from .route import Route


class Population:
    def __init__(
        self,
        places: list[Place],
        population_size: int,
        closed: bool = True,
        dist_fn: Callable[[Place, Place], float] | None = None,
    ):
        self.routes = self._generate_population(places, population_size, closed, dist_fn)

    def _generate_population(
        self,
        places: list[Place],
        population_size: int,
        closed: bool,
        dist_fn: Callable[[Place, Place], float] | None,
    ) -> list[Route]:
        return [Route(random.sample(places, len(places)), closed, dist_fn) for _ in range(population_size)]

    def get_best_route(self) -> Route:
        return max(self.routes, key=lambda route: route.fitness)
