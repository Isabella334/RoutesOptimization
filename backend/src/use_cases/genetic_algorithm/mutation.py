"""
Mutación por swap: intercambia dos posiciones aleatorias de la ruta.

Cada posición tiene una probabilidad mutation_rate de ser intercambiada con otra
posición aleatoria. Es simple y efectiva para TSP.

Si fixed_start=True, la posición 0 (punto de partida) nunca se intercambia.
"""
import random
from .route import Route


class SwapMutation:
    def __init__(self, mutation_rate: float = 0.01):
        self.mutation_rate = mutation_rate

    def mutate(self, route: Route) -> Route:
        mutated = route.copy()
        # Si hay punto de partida fijo, empezar desde el índice 1
        start_idx = 1 if mutated._fixed_start else 0
        n = len(mutated.route)

        for i in range(start_idx, n):
            if random.random() < self.mutation_rate:
                j = random.randint(start_idx, n - 1)
                mutated.route[i], mutated.route[j] = mutated.route[j], mutated.route[i]

        mutated.fitness = mutated._calculate_fitness()
        return mutated
