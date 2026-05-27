import { useState } from 'react';
import 'leaflet/dist/leaflet.css';
import MapView from './components/MapView';
import Sidebar from './components/sidebar/Sidebar';
import type { Place, RouteResponse } from './types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

export default function App() {
  const [locations, setLocations] = useState<Place[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  // const handleCalculateRoute = async () => {
  //   if (locations.length < 2) return;
  //   setLoading(true);

  //   try {
  //     const response = await fetch(`${BACKEND_URL}/optimize`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ destinations: locations }),
  //     });

  //     if (!response.ok) {
  //       const text = await response.text();
  //       throw new Error(`Backend error ${response.status}: ${text}`);
  //     }

  //     const data: RouteResponse = await response.json();
  //     setOptimizedRoute(data.orderedRoute);
  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : 'Error desconocido';
  //     alert(`Error al optimizar la ruta:\n${message}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCalculateRoute = async () => {
    alert('Funcionalidad de optimización de ruta deshabilitada temporalmente. Por favor, inténtalo de nuevo más tarde.');
  }

  const handleClearRoute = () => setOptimizedRoute([]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        locations={locations}
        setLocations={setLocations}
        optimizedRoute={optimizedRoute}
        onCalculateRoute={handleCalculateRoute}
        onClearRoute={handleClearRoute}
        loading={loading}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView locations={locations} optimizedRoute={optimizedRoute} />
      </div>
    </div>
  );
}