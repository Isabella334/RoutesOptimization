from domain import Place

class Route:
    def __init__(self, route: list[Place], closed: bool = True):
        self.route = route
        self.closed = closed
        self.fitness = self._calculate_fitness()

    def _calculate_total_distance(self) -> float:
        if len(self.route) < 2:
            return 0.0

        total_distance = 0.0

        for i in range(len(self.route) - 1):
            total_distance += self.route[i].distance_to(self.route[i + 1])

        if self.closed:
            total_distance += self.route[-1].distance_to(self.route[0])

        return total_distance

    def _calculate_fitness(self) -> float:
        total_distance = self._calculate_total_distance()

        return 1 / total_distance if total_distance > 0 else 0.0
    
    def copy(self) -> "Route":
        return Route(self.route[:], self.closed)
