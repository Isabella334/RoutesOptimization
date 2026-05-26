from domain import Coordinates, Place

class PlaceMapper:
    @staticmethod
    def from_api_response(api_data: dict) -> Place:
        coords_data = api_data['geometry']['location']
        coordinates = Coordinates(
            latitude=coords_data['lat'],
            longitude=coords_data['lng']
        )
        return Place(
            place_id=api_data['place_id'],
            name=api_data['name'],
            coordinates=coordinates
        )
