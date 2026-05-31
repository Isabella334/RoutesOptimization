import { getToken } from './firebase';
import type { Place, PlaceOption, RouteResult } from '../types';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('No active session');
  return token;
}

export async function searchPlaces(query: string): Promise<PlaceOption[]> {
  const token = await requireToken();

  const res = await fetch(`${BASE_URL}/places?query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  // Backend returns { places: PlaceOption[] }
  const data: { places: PlaceOption[] } = await res.json();
  return data.places;
}

export async function optimizeRoute(
  places: Place[],
  closed: boolean
): Promise<{ orderedRoute: Place[]; totalDistanceKm: number }> {
  const token = await requireToken();

  const payload = places.map((p, i) => ({
    place_id: String(i),
    name: p.name,
    latitude: p.lat,
    longitude: p.lng,
  }));

  const res = await fetch(`${BASE_URL}/routes/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ places: payload, closed }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  const data: { route: RouteResult[]; total_distance_km: number } = await res.json();

  const orderedRoute = [...data.route]
    .sort((a, b) => a.order - b.order)
    .map(item => places[parseInt(item.place_id)]);

  return {
    orderedRoute,
    totalDistanceKm: data.total_distance_km,
  };
}
