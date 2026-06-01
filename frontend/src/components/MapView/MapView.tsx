import React, { useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
  InfoWindow,
} from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import type { Place } from '../../types';

const LIBRARIES: Libraries = ['geometry'];

const GUATEMALA_CITY: google.maps.LatLngLiteral = { lat: 14.6349, lng: -90.5069 };

const MAP_CONTAINER_STYLE: React.CSSProperties = { height: '100%', width: '100%' };

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1117' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3548' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4560' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1520' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  styles: DARK_MAP_STYLES,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};


interface MapViewProps {
  locations: Place[];
  optimizedRoute: Place[];
  closed?: boolean;
}


function makeNumberedPin(n: number, isOptimized: boolean): string {
  const bg = isOptimized ? '#10b981' : '#3b82f6';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 24 16 24S32 26.5 32 16C32 7.163 24.837 0 16 0z"
          fill="${bg}" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="9" fill="rgba(0,0,0,0.20)"/>
    <text x="16" y="21" text-anchor="middle"
          font-family="Inter,system-ui,sans-serif"
          font-size="11" font-weight="700" fill="#fff">${n}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}


function useDirectionsPath(waypoints: Place[], closed: boolean): google.maps.LatLngLiteral[] {
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);

  const waypointKey = waypoints.map(p => `${p.lat},${p.lng}`).join('|') + (closed ? '+C' : '+O');

  useEffect(() => {
    if (waypoints.length < 2) {
      setPath([]);
      return;
    }

    const stops = closed ? [...waypoints, waypoints[0]] : waypoints;
    const origin = { lat: stops[0].lat, lng: stops[0].lng };
    const destination = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
    const middle: google.maps.DirectionsWaypoint[] = stops.slice(1, -1).map(p => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: true,
    }));

    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin,
        destination,
        waypoints: middle,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const pts: google.maps.LatLngLiteral[] = [];
          result.routes[0].legs.forEach(leg =>
            leg.steps.forEach(step =>
              step.path.forEach(ll => pts.push({ lat: ll.lat(), lng: ll.lng() }))
            )
          );
          setPath(pts);
        } else {
          console.warn('[Directions] request failed, status:', status);
          setPath([]);
        }
      }
    );
  }, [waypointKey]);

  return path;
}


export default function MapView({ locations, optimizedRoute, closed = true }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const isOptimized = optimizedRoute.length > 0;
  const displayPoints = isOptimized ? optimizedRoute : locations;

  const displayKey = displayPoints.map(p => `${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    if (!mapRef.current || displayPoints.length === 0) return;
    if (displayPoints.length === 1) {
      mapRef.current.panTo({ lat: displayPoints[0].lat, lng: displayPoints[0].lng });
      mapRef.current.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    displayPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(bounds, 60);
  }, [displayKey]);

  const optimizedPath = useDirectionsPath(isOptimized ? optimizedRoute : [], closed);
  const previewPath: google.maps.LatLngLiteral[] = locations.map(p => ({ lat: p.lat, lng: p.lng }));


  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0f1117', color: '#f87171', fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        Failed to load Google Maps.<br />
        Verify that <code>VITE_GOOGLE_MAPS_API_KEY</code> is set, the Maps JS API is enabled,
        and <code>localhost:5173</code> is in your key's allowed HTTP referrers.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0f1117', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={GUATEMALA_CITY}
      zoom={13}
      options={MAP_OPTIONS}
      onLoad={map => { mapRef.current = map; }}
      onUnmount={() => { mapRef.current = null; }}
    >
      {displayPoints.map((place, idx) => (
        <Marker
          key={`${place.lat}-${place.lng}-${idx}`}
          position={{ lat: place.lat, lng: place.lng }}
          icon={{
            url: makeNumberedPin(idx + 1, isOptimized),
            scaledSize: new google.maps.Size(32, 40),
            anchor: new google.maps.Point(16, 40),
          }}
          onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
        >
          {activeIdx === idx && (
            <InfoWindow onCloseClick={() => setActiveIdx(null)}>
              <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0f1117' }}>
                <strong>{isOptimized ? `Stop #${idx + 1}` : `Destination ${idx + 1}`}</strong>
                <br />
                <span style={{ fontSize: '12px' }}>{place.name}</span>
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}

      {optimizedPath.length > 0 && (
        <Polyline
          path={optimizedPath}
          options={{ strokeColor: '#10b981', strokeWeight: 5, strokeOpacity: 0.85 }}
        />
      )}

      {!isOptimized && locations.length >= 2 && (
        <Polyline
          path={previewPath}
          options={{
            strokeColor: '#3b82f6',
            strokeWeight: 3,
            strokeOpacity: 0,
            icons: [{
              icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeColor: '#3b82f6', scale: 4 },
              offset: '0',
              repeat: '16px',
            }],
          }}
        />
      )}
    </GoogleMap>
  );
}