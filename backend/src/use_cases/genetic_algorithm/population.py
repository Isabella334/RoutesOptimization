"""Población inicial del GA: N permutaciones aleatorias de los destinos."""
import random
from domain import Place
from .route import Route


class Population:
    def __init__(
        self,
        places: list[Place],
        population_size: int,
        closed: bool = True,
        dist_matrix: list[list[float]] | None = None,
    ):
        self.routes = self._generate_population(places, population_size, closed, dist_matrix)

    def _generate_population(
        self,
        places: list[Place],
        population_size: int,
        closed: bool,
        dist_matrix: list[list[float]] | None,
    ) -> list[Route]:
        """Genera population_size rutas aleatorias como punto de partida del GA."""
        return [
            Route(random.sample(places, len(places)), closed, dist_matrix)
            for _ in range(population_size)
        ]

    def get_best_route(self) -> Route:
        """Retorna la ruta con mayor fitness (menor distancia) de la generación actual."""
        return max(self.routes, key=lambda r: r.fitness)
