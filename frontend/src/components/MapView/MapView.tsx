import React, { useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import type { Place } from '../../types';

// ─── Module-level constants ───────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapViewProps {
  locations: Place[];
  optimizedRoute: Place[];
  closed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePinSvg(n: number, isOptimized: boolean): string {
  const bg = isOptimized ? '#10b981' : '#3b82f6';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 24 16 24S32 26.5 32 16C32 7.163 24.837 0 16 0z"
            fill="${bg}" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="9" fill="rgba(0,0,0,0.20)"/>
      <text x="16" y="21" text-anchor="middle"
            font-family="Inter,system-ui,sans-serif"
            font-size="11" font-weight="700" fill="#fff">${n}</text>
    </svg>`
  )}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapView({ locations, optimizedRoute, closed = true }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  // All map objects managed imperatively — this is what guarantees
  // they are actually removed from the map when we call setMap(null).
  // Using JSX <Marker> / <Polyline> wrappers has a known bug in
  // @react-google-maps/api where cleanup doesn't always fire.
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routePolyRef = useRef<google.maps.Polyline | null>(null);
  const previewPolyRef = useRef<google.maps.Polyline | null>(null);

  // ── Imperative cleanup helpers ────────────────────────────────────────────

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
  };

  const clearRoutePolyline = () => {
    routePolyRef.current?.setMap(null);
    routePolyRef.current = null;
  };

  const clearPreviewPolyline = () => {
    previewPolyRef.current?.setMap(null);
    previewPolyRef.current = null;
  };

  // ── Serialized keys — string primitives as useEffect dependencies ─────────
  // Arrays are compared by reference; a new [] on every render fires the effect
  // every render. Serializing to a string means "only re-run when coords change".

  const isOptimized = optimizedRoute.length > 0;
  const displayPoints = isOptimized ? optimizedRoute : locations;

  const displayKey = displayPoints.map(p => `${p.lat},${p.lng}`).join('|');
  const locKey     = locations.map(p => `${p.lat},${p.lng}`).join('|');
  const routeKey   =
    optimizedRoute.length >= 2
      ? optimizedRoute.map(p => `${p.lat},${p.lng}`).join('|') + (closed ? '+C' : '+O')
      : '';

  // ── Effect: markers ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;
    clearMarkers();

    displayPoints.forEach((place, idx) => {
      const marker = new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        icon: {
          url: makePinSvg(idx + 1, isOptimized),
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        },
      });
      markersRef.current.push(marker);
    });

    return clearMarkers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayKey, isOptimized]);

  // ── Effect: fit bounds ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;
    if (displayPoints.length === 0) {
      mapRef.current.panTo(GUATEMALA_CITY);
      mapRef.current.setZoom(13);
    } else if (displayPoints.length === 1) {
      mapRef.current.panTo({ lat: displayPoints[0].lat, lng: displayPoints[0].lng });
      mapRef.current.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      displayPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      mapRef.current.fitBounds(bounds, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayKey]);

  // ── Effect: optimized route polyline via DirectionsService ────────────────

  useEffect(() => {
    // Always wipe the previous route first, regardless of whether we draw a new one.
    // This is what makes "clear all" and "remove location" actually erase the green line.
    clearRoutePolyline();

    if (!mapRef.current || !routeKey) return;

    const stops = closed ? [...optimizedRoute, optimizedRoute[0]] : optimizedRoute;
    const origin      = { lat: stops[0].lat, lng: stops[0].lng };
    const destination = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
    const waypoints: google.maps.DirectionsWaypoint[] = stops.slice(1, -1).map(p => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: true,
    }));

    new google.maps.DirectionsService().route(
      { origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING, optimizeWaypoints: false },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result || !mapRef.current) return;

        const pts: google.maps.LatLngLiteral[] = [];
        result.routes[0].legs.forEach(leg =>
          leg.steps.forEach(step =>
            step.path.forEach(ll => pts.push({ lat: ll.lat(), lng: ll.lng() }))
          )
        );

        // Guard: another effect run may have cleared the ref while the async
        // request was in flight. Only draw if we're still on the same route.
        if (routePolyRef.current) routePolyRef.current.setMap(null);

        routePolyRef.current = new google.maps.Polyline({
          map: mapRef.current,
          path: pts,
          strokeColor: '#10b981',
          strokeWeight: 5,
          strokeOpacity: 0.85,
        });
      }
    );

    return clearRoutePolyline;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  // ── Effect: dashed preview polyline (pre-optimization) ───────────────────

  useEffect(() => {
    clearPreviewPolyline();

    if (!mapRef.current || isOptimized || locations.length < 2) return;

    previewPolyRef.current = new google.maps.Polyline({
      map: mapRef.current,
      path: locations.map(p => ({ lat: p.lat, lng: p.lng })),
      strokeColor: '#3b82f6',
      strokeWeight: 3,
      strokeOpacity: 0,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, strokeColor: '#3b82f6', scale: 4 },
        offset: '0',
        repeat: '16px',
      }],
    });

    return clearPreviewPolyline;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locKey, isOptimized]);

  // ── Full cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearMarkers();
      clearRoutePolyline();
      clearPreviewPolyline();
    };
  }, []);

  // ── Error / loading states ────────────────────────────────────────────────

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0f1117', color: '#f87171', fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        Failed to load Google Maps. Verify your API key and that the Maps JS API is enabled.
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

  // The <GoogleMap> is just the container — all markers/polylines live in refs.
  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={GUATEMALA_CITY}
      zoom={13}
      options={MAP_OPTIONS}
      onLoad={map => { mapRef.current = map; }}
      onUnmount={() => {
        clearMarkers();
        clearRoutePolyline();
        clearPreviewPolyline();
        mapRef.current = null;
      }}
    />
  );
}