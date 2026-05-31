import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logout } from './services/firebase';
import 'leaflet/dist/leaflet.css';
import MapView from './components/MapView';
import Sidebar from './components/sidebar/Sidebar';
import Login from './components/Login';
import type { Place } from './types';

export default function App() {
  // Estado del usuario autenticado (null = no autenticado, undefined = cargando)
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [locations, setLocations] = useState<Place[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<Place[]>([]);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // true = ruta circular (regresa al origen), false = ruta abierta
  const [closed, setClosed] = useState(true);

  // Escucha cambios de sesión de Firebase. Se ejecuta al montar y limpia al desmontar.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  const handleCalculateRoute = async () => {
    if (locations.length < 2) return;
    setLoading(true);
    setOptimizedRoute([]);
    setTotalDistanceKm(null);

    try {
      // Import dinámico para evitar que cloudFunction.js se ejecute antes de que
      // Firebase esté inicializado
      const { calcularRuta } = await import('./services/cloudFunction');
      const result = await calcularRuta(locations, closed);
      setOptimizedRoute(result.orderedRoute);
      setTotalDistanceKm(result.totalDistanceKm);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error al optimizar la ruta:\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRoute = () => {
    setOptimizedRoute([]);
    setTotalDistanceKm(null);
  };

  // Mientras Firebase resuelve el estado de autenticación, mostrar spinner
  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  // Sin sesión activa → pantalla de login
  if (user === null) {
    return <Login />;
  }

  // Con sesión → app completa
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
        {/* Barra superior con info del usuario, toggle de modo y distancia */}
        <div style={topBarStyle}>
          <span style={{ fontSize: '0.85rem', color: '#555' }}>
            {user.email ?? user.displayName}
          </span>
          <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="checkbox"
              checked={closed}
              onChange={e => setClosed(e.target.checked)}
            />
            Ruta cerrada
          </label>
          {totalDistanceKm !== null && (
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
              Distancia: {totalDistanceKm.toFixed(2)} km
            </span>
          )}
          <button onClick={() => logout()} style={logoutBtnStyle}>
            Cerrar sesión
          </button>
        </div>
        <MapView locations={locations} optimizedRoute={optimizedRoute} />
      </div>
    </div>
  );
}

const topBarStyle: React.CSSProperties = {
  position: 'absolute', top: 10, right: 10, zIndex: 1000,
  display: 'flex', alignItems: 'center', gap: '12px',
  background: 'white', padding: '8px 14px', borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

const logoutBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#e53e3e', color: 'white',
  border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem',
};
