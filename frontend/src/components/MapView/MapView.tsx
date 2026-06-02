import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import type { Place } from '../../types';
import type { TravelMode } from '../../services/api';

const LIBRARIES: Libraries = ['geometry'];

const GUATEMALA_CITY = { lat: 14.6349, lng: -90.5069 };

const MAP_CONTAINER_STYLE: React.CSSProperties = { height: '100%', width: '100%' };

const DARK_MAP_STYLES = [
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

const MAP_OPTIONS = {
  styles: DARK_MAP_STYLES,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

function getGmapsTravelMode(mode: TravelMode): google.maps.TravelMode {
  switch (mode) {
    case 'walking':   return google.maps.TravelMode.WALKING;
    case 'bicycling': return google.maps.TravelMode.BICYCLING;
    case 'transit':   return google.maps.TravelMode.TRANSIT;
    default:          return google.maps.TravelMode.DRIVING;
  }
}

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

interface MapViewProps {
  locations: Place[];
  optimizedRoute: Place[];
  closed?: boolean;
  travelMode?: TravelMode;
}

export default function MapView({ locations, optimizedRoute, closed = true, travelMode = 'driving' }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routePolyRef = useRef<google.maps.Polyline | null>(null);
  const previewPolyRef = useRef<google.maps.Polyline | null>(null);
  const [routeWarning, setRouteWarning] = useState<string | null>(null);

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

  const isOptimized = optimizedRoute.length > 0;
  const displayPoints = isOptimized ? optimizedRoute : locations;

  const displayKey = displayPoints.map(p => `${p.lat},${p.lng}`).join('|');
  const locKey     = locations.map(p => `${p.lat},${p.lng}`).join('|');
  const routeKey   =
    optimizedRoute.length >= 2
      ? optimizedRoute.map(p => `${p.lat},${p.lng}`).join('|') + (closed ? '+C' : '+O') + `+${travelMode}`
      : '';


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
  }, [displayKey, isOptimized]);


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
  }, [displayKey]);


  useEffect(() => {
    clearRoutePolyline();
    setRouteWarning(null);

    if (!mapRef.current || !routeKey) return;

    const stops = closed ? [...optimizedRoute, optimizedRoute[0]] : optimizedRoute;
    const origin      = { lat: stops[0].lat, lng: stops[0].lng };
    const destination = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
    const waypoints: google.maps.DirectionsWaypoint[] = stops.slice(1, -1).map(p => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: true,
    }));

    new google.maps.DirectionsService().route(
      { origin, destination, waypoints, travelMode: getGmapsTravelMode(travelMode), optimizeWaypoints: false },
      (result, status) => {
        if (!mapRef.current) return;

        if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
          const modeLabels: Record<string, string> = {
            driving: 'driving', walking: 'walking',
            bicycling: 'bicycling', transit: 'public transit',
          };
          setRouteWarning(
            `No ${modeLabels[travelMode] ?? travelMode} route found between these destinations. ` +
            `The optimized order is still correct, only the visual path is unavailable.`
          );
          return;
        }

        if (status !== google.maps.DirectionsStatus.OK || !result) {
          setRouteWarning('Could not draw the route. The optimized order is still valid.');
          return;
        }

        const pts: google.maps.LatLngLiteral[] = [];
        result.routes[0].legs.forEach(leg =>
          leg.steps.forEach(step =>
            step.path.forEach(ll => pts.push({ lat: ll.lat(), lng: ll.lng() }))
          )
        );

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
  }, [routeKey]);


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
  }, [locKey, isOptimized]);


  useEffect(() => {
    return () => {
      clearMarkers();
      clearRoutePolyline();
      clearPreviewPolyline();
    };
  }, []);


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

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
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
      {routeWarning && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 17, 23, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          borderRadius: '10px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          maxWidth: '420px',
          width: 'calc(100% - 48px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
          <span style={{
            fontSize: '12px',
            color: '#fcd34d',
            lineHeight: '1.5',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            {routeWarning}
          </span>
          <button
            onClick={() => setRouteWarning(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: '1',
              flexShrink: 0,
              padding: '0',
              marginLeft: 'auto',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}