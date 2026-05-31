from __future__ import annotations
from typing import Callable
from domain import Place


class Route:
    def __init__(
        self,
        route: list[Place],
        closed: bool = True,
        dist_fn: Callable[[Place, Place], float] | None = None,
    ):
        self.route = route
        self.closed = closed
        self._dist_fn = dist_fn or (lambda a, b: a.distance_to(b))
        self.fitness = self._calculate_fitness()

    def _calculate_total_distance(self) -> float:
        if len(self.route) < 2:
            return 0.0
        total = sum(self._dist_fn(self.route[i], self.route[i + 1]) for i in range(len(self.route) - 1))
        if self.closed:
            total += self._dist_fn(self.route[-1], self.route[0])
        return total

    def _calculate_fitness(self) -> float:
        total = self._calculate_total_distance()
        return 1 / total if total > 0 else 0.0

    def copy(self) -> Route:
        return Route(self.route[:], self.closed, self._dist_fn)
