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
        fixed_start: bool = False,
    ):
        self.routes = self._generate_population(places, population_size, closed, dist_matrix, fixed_start)

    def _generate_population(
        self,
        places: list[Place],
        population_size: int,
        closed: bool,
        dist_matrix: list[list[float]] | None,
        fixed_start: bool,
    ) -> list[Route]:
        """
        Genera population_size rutas aleatorias.

        Si fixed_start=True, places[0] siempre ocupa la primera posición y solo
        se permutan los demás — garantiza que el punto de partida nunca cambie.
        """
        population = []
        for _ in range(population_size):
            if fixed_start and len(places) > 1:
                # Mantener el primer lugar fijo, permutar el resto
                shuffled = [places[0]] + random.sample(places[1:], len(places) - 1)
            else:
                shuffled = random.sample(places, len(places))
            population.append(Route(shuffled, closed, dist_matrix, fixed_start))
        return population

    def get_best_route(self) -> Route:
        """Retorna la ruta con mayor fitness (menor distancia) de la generación actual."""
        return max(self.routes, key=lambda r: r.fitness)
