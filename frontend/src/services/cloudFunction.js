// Servicio que conecta el frontend con el backend de Cloud Run.
// Gestiona el token de Firebase y el mapeo de tipos frontend ↔ backend.
import { obtenerIdToken } from './firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/**
 * Llama al endpoint del backend con los destinos del usuario y retorna la ruta optimizada.
 *
 * @param {import('../types').Place[]} places - Lista de destinos del usuario
 * @param {boolean} closed - true = ruta circular (regresa al origen), false = ruta abierta
 * @returns {{ orderedRoute: import('../types').Place[], totalDistanceKm: number }}
 */
export async function calcularRuta(places, closed, startIndex = null) {
  // El token expira cada hora; getIdToken() lo renueva automáticamente si expiró.
  const token = await obtenerIdToken();
  if (!token) throw new Error('No hay sesión activa');

  // El backend espera place_id (índice string), name, lat, lng.
  // address no viaja al backend porque el GA no lo necesita.
  const backendPlaces = places.map((p, i) => ({
    place_id: String(i),
    name: p.name,
    lat: p.lat,
    lng: p.lng,
  }));

  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      places: backendPlaces,
      closed,
      ...(startIndex !== null && { start_index: startIndex }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Reordenar los places originales según el orden devuelto por el backend.
  // Usamos place_id (índice string) para recuperar el Place original con su address, lat, lng.
  const orderedRoute = data.route
    .sort((a, b) => a.order - b.order)
    .map(item => places[parseInt(item.place_id)]);

  return {
    orderedRoute,
    totalDistanceKm: data.total_distance_km,
  };
}
