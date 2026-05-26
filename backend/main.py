from infrastructure import GoogleMapsPlaceRepository
from dotenv import load_dotenv

def main():
    load_dotenv()

    repository = GoogleMapsPlaceRepository()
    places = repository.get_places("Universidad")

    for place in places:
        print(place.name, place.coordinates.latitude, place.coordinates.longitude)

if __name__ == "__main__":
    main()
