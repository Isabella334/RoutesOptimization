import random
from .route import Route


class OrderedCrossover:
    def crossover(self, parent1: Route, parent2: Route) -> Route:
        size = len(parent1.route)
        start, end = sorted(random.sample(range(size), 2))

        child = [None] * size
        child[start:end] = parent1.route[start:end]

        remaining = [place for place in parent2.route if place not in child]
        pointer = 0
        for i in range(size):
            if child[i] is None:
                child[i] = remaining[pointer]
                pointer += 1

        return Route(child, parent1.closed, parent1._dist_fn)
