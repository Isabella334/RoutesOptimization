class Coordinates:
    def __init__(self, latitude: float, longitude: float):
        self.latitude = latitude
        self.longitude = longitude

class Place:
    def __init__(self, place_id: str, name: str, coordinates: Coordinates):
        self.place_id = place_id
        self.name = name
        self.coordinates = coordinates
