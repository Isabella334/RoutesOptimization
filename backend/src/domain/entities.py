from __future__ import annotations
import math

class Coordinates:
    def __init__(self, latitude: float, longitude: float):
        self.latitude = latitude
        self.longitude = longitude

    def distance_to(self, other: Coordinates) -> float:
        EARTH_RADIUS_KM = 6371.0

        origin_lat = math.radians(self.latitude)
        origin_lng = math.radians(self.longitude)

        destination_lat = math.radians(other.latitude)
        destination_lng = math.radians(other.longitude)

        lat_difference = destination_lat - origin_lat
        lng_difference = destination_lng - origin_lng

        haversine_a = (math.sin(lat_difference / 2) ** 2 + math.cos(origin_lat) * math.cos(destination_lat) * math.sin(lng_difference / 2) ** 2)

        return EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(haversine_a))

class Place:
    def __init__(self, place_id: str, name: str, coordinates: Coordinates):
        self.place_id = place_id
        self.name = name
        self.coordinates = coordinates

    def distance_to(self, other: Place) -> float:
        return self.coordinates.distance_to(other.coordinates)
