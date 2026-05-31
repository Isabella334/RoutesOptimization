"""
Order Crossover (OX): operador de cruce que preserva permutaciones válidas.

Por qué OX y no cruce de un punto clásico:
Un cruce de un punto en permutaciones produce hijos con destinos repetidos y
otros faltantes (rutas inválidas). OX toma un segmento de parent1 y completa
el resto con el orden relativo de parent2, garantizando que cada destino
aparezca exactamente una vez en el hijo.
"""
import random
from .route import Route


class OrderedCrossover:
    def crossover(self, parent1: Route, parent2: Route) -> Route:
        """
        Genera un hijo combinando un segmento aleatorio de parent1 con el
        orden de parent2 para los elementos restantes.
        """
        size = len(parent1.route)
        start, end = sorted(random.sample(range(size), 2))
        child: list = [None] * size
        child[start:end] = parent1.route[start:end]
        remaining = [p for p in parent2.route if p not in child]
        pointer = 0
        for i in range(size):
            if child[i] is None:
                child[i] = remaining[pointer]
                pointer += 1
        return Route(child, parent1.closed, parent1._dist_matrix)
