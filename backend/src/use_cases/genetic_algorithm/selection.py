import random
from .route import Route


class TournamentSelection:
    def __init__(self, tournament_size: int = 5):
        self.tournament_size = tournament_size

    def select(self, population: list[Route]) -> Route:
        tournament = random.sample(population, self.tournament_size)

        return max(tournament, key=lambda route: route.fitness)