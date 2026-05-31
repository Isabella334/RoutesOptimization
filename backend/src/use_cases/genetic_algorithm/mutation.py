"""
Mutación por swap: intercambia dos posiciones aleatorias de la ruta.

Cada posición tiene una probabilidad mutation_rate de ser intercambiada con otra
posición aleatoria. Es simple y efectiva para TSP, aunque la inversión de segmentos
(2-opt) converge mejor porque desenreda cruces de la ruta.

La mutación opera sobre una copia (route.copy()) para no modificar el padre original.
"""
import random
from .route import Route


class SwapMutation:
    def __init__(self, mutation_rate: float = 0.01):
        self.mutation_rate = mutation_rate

    def mutate(self, route: Route) -> Route:
        mutated = route.copy()
        for i in range(len(mutated.route)):
            if random.random() < self.mutation_rate:
                j = random.randint(0, len(mutated.route) - 1)
                mutated.route[i], mutated.route[j] = mutated.route[j], mutated.route[i]
        mutated.fitness = mutated._calculate_fitness()
        return mutated
