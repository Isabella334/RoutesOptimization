/** Representa un destino ingresado por el usuario. */
export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** Elemento de la ruta devuelto por el backend. */
export interface PlaceResult {
  place_id: string;
  name: string;
  order: number;
}

/** Respuesta completa del endpoint /routes/optimize. */
export interface RouteResponse {
  route: PlaceResult[];
  total_distance_km: number;
  closed: boolean;
}
