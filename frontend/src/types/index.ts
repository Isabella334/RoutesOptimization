export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface PlaceOption {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteResult {
  place_id: string;
  name: string;
  order: number;
}

export interface RouteResponse {
  route: RouteResult[];
  total_distance_km: number;
  closed: boolean;
}
