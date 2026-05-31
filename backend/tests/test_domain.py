"""Tests para las entidades de dominio: Coordinates y Place."""
import math
import pytest
from domain import Place, Coordinates


class TestCoordinates:
    def test_distance_same_point_is_zero(self):
        c = Coordinates(14.6349, -90.5069)
        assert c.distance_to(c) == 0.0

    def test_distance_is_symmetric(self):
        """La distancia de A a B debe ser igual a la de B a A."""
        a = Coordinates(14.6349, -90.5069)  # Guatemala City
        b = Coordinates(14.8333, -91.5167)  # Quetzaltenango
        assert abs(a.distance_to(b) - b.distance_to(a)) < 0.001

    def test_distance_known_value(self):
        """Guatemala City a Quetzaltenango ≈ 120 km en línea recta."""
        guatemala = Coordinates(14.6349, -90.5069)
        xela = Coordinates(14.8333, -91.5167)
        dist = guatemala.distance_to(xela)
        assert 115 < dist < 130

    def test_distance_short_range(self):
        """Dos puntos cercanos dentro de Guatemala (~5 km)."""
        a = Coordinates(14.6349, -90.5069)
        b = Coordinates(14.6799, -90.5069)
        dist = a.distance_to(b)
        assert 4 < dist < 6

    def test_distance_returns_float(self):
        a = Coordinates(14.0, -90.0)
        b = Coordinates(14.1, -90.1)
        assert isinstance(a.distance_to(b), float)


class TestPlace:
    def test_distance_delegates_to_coordinates(self):
        """Place.distance_to debe usar las coordenadas de ambos lugares."""
        p1 = Place("1", "A", Coordinates(14.6349, -90.5069))
        p2 = Place("2", "B", Coordinates(14.6799, -90.5069))
        assert p1.distance_to(p2) == p1.coordinates.distance_to(p2.coordinates)

    def test_place_attributes(self):
        p = Place("id1", "Parque Central", Coordinates(14.6349, -90.5069))
        assert p.place_id == "id1"
        assert p.name == "Parque Central"
        assert p.coordinates.latitude == 14.6349
        assert p.coordinates.longitude == -90.5069
