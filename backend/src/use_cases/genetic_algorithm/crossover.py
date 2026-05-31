"""
Order Crossover (OX): operador de cruce que preserva permutaciones válidas.

Por qué OX y no cruce de un punto clásico:
Un cruce de un punto en permutaciones produce hijos con destinos repetidos y
otros faltantes (rutas inválidas). OX toma un segmento de parent1 y completa
el resto con el orden relativo de parent2, garantizando que cada destino
aparezca exactamente una vez en el hijo.

Si fixed_start=True, la posición 0 (punto de partida) se mantiene fija y OX
opera únicamente sobre las posiciones 1..n-1.
"""
import random
from .route import Route


class OrderedCrossover:
    def crossover(self, parent1: Route, parent2: Route) -> Route:
        """Genera un hijo combinando segmentos de parent1 y parent2 con OX."""
        if parent1._fixed_start and len(parent1.route) > 1:
            return self._crossover_with_fixed_start(parent1, parent2)
        return self._crossover_standard(parent1, parent2)

    def _crossover_standard(self, parent1: Route, parent2: Route) -> Route:
        """OX clásico sobre toda la permutación."""
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
        return Route(child, parent1.closed, parent1._dist_matrix, parent1._fixed_start)

    def _crossover_with_fixed_start(self, parent1: Route, parent2: Route) -> Route:
        """OX aplicado solo a posiciones 1..n-1; posición 0 siempre es el punto de partida."""
        fixed = parent1.route[0]
        sub1 = parent1.route[1:]
        sub2 = [p for p in parent2.route if p.place_id != fixed.place_id]
        size = len(sub1)

        start, end = sorted(random.sample(range(size), 2))
        child_sub: list = [None] * size
        child_sub[start:end] = sub1[start:end]
        remaining = [p for p in sub2 if p not in child_sub]
        pointer = 0
        for i in range(size):
            if child_sub[i] is None:
                child_sub[i] = remaining[pointer]
                pointer += 1

        return Route([fixed] + child_sub, parent1.closed, parent1._dist_matrix, True)
