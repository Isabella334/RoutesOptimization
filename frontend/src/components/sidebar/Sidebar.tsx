import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Place } from '../../types';
import styles from './Sidebar.module.css';

const MAX_LOCATIONS = 15;
const MAX_RADIUS_KM = 100;

/** Distancia en km entre dos puntos usando haversine (línea recta). */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

async function geocodeQuery(query: string): Promise<Place | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'gt',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { 'Accept-Language': 'es' } }
  );

  const results: NominatimResult[] = await res.json();
  if (results.length === 0) return null;

  const r = results[0];
  return {
    name: query,
    address: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  };
}

interface SidebarProps {
  locations: Place[];
  setLocations: React.Dispatch<React.SetStateAction<Place[]>>;
  optimizedRoute: Place[];
  onCalculateRoute: () => Promise<void>;
  onClearRoute: () => void;
  onClearAll: () => void;
  loading: boolean;
  startIndex: number | null;
  setStartIndex: (i: number | null) => void;
}


export default function Sidebar({
  locations,
  setLocations,
  optimizedRoute,
  onCalculateRoute,
  onClearRoute,
  onClearAll,
  loading,
  startIndex,
  setStartIndex,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOptimized = optimizedRoute.length > 0;
  const canAdd = locations.length < MAX_LOCATIONS;
  const canOptimize = locations.length >= 2 && !loading;

  const handleAdd = async () => {
    if (!query.trim() || !canAdd) return;
    setSearching(true);
    setError(null);

    try {
      const place = await geocodeQuery(query.trim());
      if (!place) {
        setError('No se encontró el lugar. Intenta ser más específico.');
        return;
      }

      // Validar que el nuevo destino esté dentro del radio máximo respecto a los existentes
      const tooFar = locations.find(
        (existing) => haversineKm(existing.lat, existing.lng, place.lat, place.lng) > MAX_RADIUS_KM
      );
      if (tooFar) {
        setError(`"${place.name}" está a más de ${MAX_RADIUS_KM} km de "${tooFar.name}". Todos los destinos deben estar dentro de ${MAX_RADIUS_KM} km entre sí.`);
        return;
      }

      setLocations((prev) => [...prev, place]);
      onClearRoute();
      setQuery('');
    } catch {
      setError('Error al buscar el lugar. Verifica tu conexión.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (idx: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== idx));
    if (startIndex === idx) setStartIndex(null);
    else if (startIndex !== null && idx < startIndex) setStartIndex(startIndex - 1);
    if (isOptimized) onClearRoute();
  };

  const handleClear = () => {
    setLocations([]);
    onClearAll();
    setError(null);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⟳</span>
          <div>
            <h1 className={styles.title}>RouteOpt</h1>
            <p className={styles.subtitle}>Optimización genética de rutas</p>
          </div>
        </div>
      </div>

      <div className={styles.searchSection}>
        <label className={styles.label}>Agregar destino</label>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Busca una dirección..."
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={!canAdd || searching || loading}
          />
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={!query.trim() || !canAdd || searching || loading}
            title="Agregar"
          >
            {searching ? '…' : '+'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.counter}>
          <span
            className={`${styles.dot} ${
              locations.length >= MAX_LOCATIONS ? styles.dotFull : styles.dotOk
            }`}
          />
          {locations.length} / {MAX_LOCATIONS} destinos
        </div>
      </div>

      {isOptimized && (
        <p className={styles.optimizedLabel}>Ruta optimizada</p>
      )}

      <ul className={styles.list}>
        {/* Si hay ruta optimizada, mostrar en ese orden; si no, en el orden de entrada */}
        {(isOptimized ? optimizedRoute : locations).map((loc, idx) => {
          const originalIdx = isOptimized
            ? locations.findIndex((p) => p.lat === loc.lat && p.lng === loc.lng)
            : idx;
          const isStart = originalIdx === startIndex;

          return (
            <li key={`${loc.lat}-${loc.lng}-${idx}`} className={styles.item}>
              <span className={`${styles.badge} ${isOptimized ? styles.badgeGreen : isStart ? styles.badgeStart : styles.badgeBlue}`}>
                {isStart && !isOptimized ? '★' : idx + 1}
              </span>
              <span className={styles.itemText} title={loc.address}>
                {loc.name || loc.address.split(',')[0]}
                <small className={styles.itemSub}>
                  {loc.address.split(',').slice(1, 3).join(',')}
                </small>
              </span>
              {!isOptimized && (
                <button
                  className={`${styles.startBtn} ${isStart ? styles.startBtnActive : ''}`}
                  onClick={() => { setStartIndex(isStart ? null : originalIdx); onClearRoute(); }}
                  title={isStart ? 'Quitar como origen' : 'Fijar como punto de partida'}
                  disabled={loading}
                >
                  {isStart ? '★' : '☆'}
                </button>
              )}
              <button
                className={styles.removeBtn}
                onClick={() => handleRemove(originalIdx >= 0 ? originalIdx : idx)}
                title="Eliminar"
                disabled={loading || isOptimized}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={onCalculateRoute}
          disabled={!canOptimize}
        >
          {loading ? (
            <span className={styles.spinner}>Calculando...</span>
          ) : isOptimized ? (
            'Re-optimizar ruta'
          ) : (
            'Optimizar ruta'
          )}
        </button>

        {locations.length > 0 && (
          <button
            className={styles.secondaryBtn}
            onClick={handleClear}
            disabled={loading}
          >
            Limpiar todo
          </button>
        )}
      </div>
    </aside>
  );
}