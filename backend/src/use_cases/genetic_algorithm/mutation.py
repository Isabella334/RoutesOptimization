import random
from .route import Route

class SwapMutation:
    def __init__(self, mutation_rate: float = 0.01):
        self.mutation_rate = mutation_rate

    def mutate(self, route: Route) -> Route:

        mutated_route = route.copy()

        for i in range(len(mutated_route.route)):
            if random.random() < self.mutation_rate:
                j = random.randint(0, len(mutated_route.route) - 1)
                mutated_route.route[i], mutated_route.route[j] = (
                    mutated_route.route[j],
                    mutated_route.route[i]
                )

        mutated_route.fitness = mutated_route._calculate_fitness()

        return mutated_route