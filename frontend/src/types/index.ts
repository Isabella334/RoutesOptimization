export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
}
 
export interface RouteResponse {
  orderedRoute: Place[];
}