import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Place } from '../../types';
import styles from './Sidebar.module.css';

const MAX_LOCATIONS = 15;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

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
  loading: boolean;
}


export default function Sidebar({
  locations,
  setLocations,
  optimizedRoute,
  onCalculateRoute,
  onClearRoute,
  loading,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOptimized = optimizedRoute.length > 0;
  const canAdd = locations.length < MAX_LOCATIONS;
  const canOptimize = locations.length >= 2 && !loading && !isOptimized;

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
      setLocations((prev) => [...prev, place]);
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
    if (isOptimized) onClearRoute();
  };

  const handleClear = () => {
    setLocations([]);
    onClearRoute();
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

      <ul className={styles.list}>
        {locations.map((loc, idx) => {
          const isRouted = isOptimized;
          const routeIdx = isRouted
            ? optimizedRoute.findIndex(
                (p) => p.lat === loc.lat && p.lng === loc.lng
              )
            : -1;

          return (
            <li key={`${loc.lat}-${loc.lng}-${idx}`} className={styles.item}>
              <span
                className={`${styles.badge} ${
                  isRouted ? styles.badgeGreen : styles.badgeBlue
                }`}
              >
                {isRouted && routeIdx >= 0 ? routeIdx + 1 : idx + 1}
              </span>
              <span className={styles.itemText} title={loc.address}>
                {loc.name || loc.address.split(',')[0]}
                <small className={styles.itemSub}>
                  {loc.address.split(',').slice(1, 3).join(',')}
                </small>
              </span>
              <button
                className={styles.removeBtn}
                onClick={() => handleRemove(idx)}
                title="Eliminar"
                disabled={loading}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.actions}>
        {!isOptimized ? (
          <button
            className={styles.primaryBtn}
            onClick={onCalculateRoute}
            disabled={!canOptimize}
          >
            {loading ? (
              <span className={styles.spinner}>Calculando...</span>
            ) : (
              'Optimizar ruta'
            )}
          </button>
        ) : (
          <div className={styles.optimizedBanner}>
            <span>Ruta optimizada</span>
            <button className={styles.resetBtn} onClick={handleClear}>
              Reiniciar
            </button>
          </div>
        )}

        {locations.length > 0 && !isOptimized && (
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