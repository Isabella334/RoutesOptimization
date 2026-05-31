"""
Representa una solución (cromosoma) del problema TSP.

Un cromosoma es una permutación de los destinos. El fitness es inversamente
proporcional a la distancia total: rutas más cortas tienen mayor fitness.
"""
from domain import Place


class Route:
    def __init__(
        self,
        route: list[Place],
        closed: bool = True,
        dist_matrix: list[list[float]] | None = None,
    ):
        self.route = route
        self.closed = closed
        # Matriz de distancias precomputada (opcional). Si es None, usa haversine.
        self._dist_matrix = dist_matrix
        self.fitness = self._calculate_fitness()

    def _get_distance(self, place_a: Place, place_b: Place) -> float:
        """
        Distancia entre dos lugares. Usa la matriz precomputada si está disponible.

        place_id es el índice string original ("0", "1", ...) — permite indexar
        la matriz incluso cuando la ruta es una permutación de los lugares originales.
        """
        if self._dist_matrix is not None:
            i, j = int(place_a.place_id), int(place_b.place_id)
            return self._dist_matrix[i][j]
        return place_a.distance_to(place_b)

    def _calculate_total_distance(self) -> float:
        """Suma de distancias entre paradas consecutivas. Si es cerrada, incluye el regreso."""
        if len(self.route) < 2:
            return 0.0

        total = sum(
            self._get_distance(self.route[i], self.route[i + 1])
            for i in range(len(self.route) - 1)
        )

        # Ruta cerrada: el último destino regresa al primero (ciclo hamiltoniano)
        if self.closed:
            total += self._get_distance(self.route[-1], self.route[0])

        return total

    def _calculate_fitness(self) -> float:
        """fitness = 1 / distancia_total. Mayor fitness = ruta más corta."""
        total = self._calculate_total_distance()
        return 1 / total if total > 0 else 0.0

    def copy(self) -> "Route":
        """Copia superficial que preserva la misma referencia a la matriz."""
        return Route(self.route[:], self.closed, self._dist_matrix)
