class Route:
    def __init__(self, route: list):
        self.route = route
        self.fitness = self._calculate_fitness()

    def _calculate_fitness(self) -> float:
        if len(self.route) < 2:
            return 0.0
        
        total_distance = sum(self.route[i].distance_to(self.route[i + 1]) for i in range(len(self.route) - 1))

        return 1 / total_distance if total_distance > 0 else 0.0
