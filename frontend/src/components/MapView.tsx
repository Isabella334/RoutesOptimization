import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '../types';

import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadowPng,
});

// Crea un ícono circular numerado para cada marcador
function createNumberedIcon(n: number, isOptimized: boolean): L.DivIcon {
  const bg = isOptimized ? '#10b981' : '#ff3b22';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        background:${bg};
        color:#fff;
        width:28px;height:28px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        border:2px solid rgba(0,0,0,.2);
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      ">
        <span style="transform:rotate(45deg);font-weight:700;font-size:12px;line-height:1">${n}</span>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

// Decodifica la geometría comprimida que devuelve OSRM (formato Polyline5)
function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coords: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let shift = 0, result = 0, byte: number;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / factor, lng / factor]);
  }
  return coords;
}

// Ajusta el zoom del mapa para mostrar todos los puntos visibles
function BoundsFitter({ points }: { points: Place[] }) {
  const map = useMap();
  const prevLen = useRef(0);

  useEffect(() => {
    if (points.length === 0 || points.length === prevLen.current) return;
    prevLen.current = points.length;
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [points, map]);

  return null;
}

// Obtiene la ruta real por carretera desde OSRM (gratuito, sin API key)
function useOsrmRoute(waypoints: Place[]) {
  const [geometry, setGeometry] = useState<[number, number][]>([]);

  useEffect(() => {
    if (waypoints.length < 2) { setGeometry([]); return; }
    const coords = waypoints.map((p) => `${p.lng},${p.lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full`)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 'Ok' && data.routes.length > 0) {
          setGeometry(decodePolyline(data.routes[0].geometry));
        } else {
          setGeometry([]);
        }
      })
      .catch((err) => console.error('[OSRM] routing error:', err));
  }, [waypoints]);

  return geometry;
}

interface MapProps {
  locations: Place[];
  optimizedRoute: Place[];
  closed?: boolean;
}

const GUATEMALA_CITY: [number, number] = [14.6349, -90.5069];

export default function MapView({ locations, optimizedRoute, closed = true }: MapProps) {
  const isOptimized = optimizedRoute.length > 0;
  const displayPoints = isOptimized ? optimizedRoute : locations;
  const geometry = useOsrmRoute(isOptimized ? optimizedRoute : []);

  // Segmento de cierre: último → primero, solo para ruta cerrada
  const closingPoints = isOptimized && closed && optimizedRoute.length > 1
    ? [optimizedRoute[optimizedRoute.length - 1], optimizedRoute[0]]
    : [];
  const closingGeometry = useOsrmRoute(closingPoints);

  return (
    <MapContainer
      center={GUATEMALA_CITY}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {displayPoints.map((place, idx) => (
        <Marker
          key={`${place.lat}-${place.lng}-${idx}`}
          position={[place.lat, place.lng]}
          icon={createNumberedIcon(idx + 1, isOptimized)}
        >
          <Popup>
            <strong>{isOptimized ? `Parada #${idx + 1}` : `Destino ${idx + 1}`}</strong>
            <br />
            <span style={{ fontSize: '12px' }}>{place.address}</span>
          </Popup>
        </Marker>
      ))}

      {/* Polilínea de la ruta optimizada por carretera */}
      {geometry.length > 0 && (
        <Polyline positions={geometry} color="#10b981" weight={5} opacity={0.85} />
      )}

      {/* Segmento de cierre por carretera: último → primero (solo ruta cerrada) */}
      {closingGeometry.length > 0 && (
        <Polyline positions={closingGeometry} color="#10b981" weight={5} opacity={0.85} />
      )}

      {/* Polilínea punteada entre destinos sin optimizar */}
      {!isOptimized && locations.length >= 2 && (
        <Polyline
          positions={locations.map((p) => [p.lat, p.lng])}
          color="#3b82f6"
          weight={3}
          opacity={0.5}
          dashArray="8 6"
        />
      )}

      <BoundsFitter points={displayPoints} />
    </MapContainer>
  );
}
