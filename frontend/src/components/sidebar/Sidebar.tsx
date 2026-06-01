import React, { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';
import { Car, PersonStanding, Bike, Bus } from 'lucide-react';
import type { Place, PlaceOption } from '../../types';
import { searchPlaces, type TravelMode } from '../../services/api';
import styles from './Sidebar.module.css';

const MAX_LOCATIONS = 15;
const MAX_RADIUS_KM = 100;
const DEBOUNCE_MS = 400;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const TRAVEL_MODE_OPTIONS: { value: TravelMode; label: string; icon: React.ReactNode }[] = [
  { value: 'driving',   label: 'Car',     icon: <Car size={18} /> },
  { value: 'walking',   label: 'Walking', icon: <PersonStanding size={18} /> },
  { value: 'bicycling', label: 'Bicycle', icon: <Bike size={18} /> },
  { value: 'transit',   label: 'Transit', icon: <Bus size={18} /> },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Place[];
  setLocations: React.Dispatch<React.SetStateAction<Place[]>>;
  optimizedRoute: Place[];
  closed: boolean;
  onClosedChange: (closed: boolean) => void;
  travelMode: TravelMode;
  onTravelModeChange: (mode: TravelMode) => void;
  onCalculateRoute: () => Promise<void>;
  onClearRoute: () => void;
  loading: boolean;
}

export default function Sidebar({
  isOpen,
  onClose,
  locations,
  setLocations,
  optimizedRoute,
  closed,
  onClosedChange,
  travelMode,
  onTravelModeChange,
  onCalculateRoute,
  onClearRoute,
  loading,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOptimized = optimizedRoute.length > 0;
  const canAdd = locations.length < MAX_LOCATIONS;
  const canOptimize = locations.length >= 2 && !loading;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || !canAdd) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(value.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  };

  const addPlace = (option: PlaceOption) => {
    const place: Place = {
      name: option.name,
      address: option.address ?? option.name,
      lat: option.latitude,
      lng: option.longitude,
    };
    const tooFar = locations.find(
      existing => haversineKm(existing.lat, existing.lng, place.lat, place.lng) > MAX_RADIUS_KM
    );
    if (tooFar) {
      setError(`"${place.name}" is more than ${MAX_RADIUS_KM} km from "${tooFar.name}".`);
      setSuggestions([]);
      return;
    }
    setLocations(prev => [...prev, place]);
    onClearRoute();
    setQuery('');
    setSuggestions([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setSuggestions([]);
    else if (e.key === 'Enter' && suggestions.length > 0) addPlace(suggestions[0]);
  };

  const handleRemove = (locToRemove: Place) => {
    setLocations(prev => prev.filter(p => !(p.lat === locToRemove.lat && p.lng === locToRemove.lng)));
    onClearRoute();
  };

  const handleClear = () => {
    setLocations([]);
    onClearRoute();
    setError(null);
    setSuggestions([]);
    setQuery('');
  };

  const displayList = isOptimized ? optimizedRoute : locations;

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⟳</span>
          <div>
            <h1 className={styles.title}>RouteOpt</h1>
            <p className={styles.subtitle}>Genetic route optimization</p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">✕</button>
      </div>

      <div className={styles.searchSection}>
        {/* Travel mode selector */}
        <label className={styles.label}>Travel mode</label>
        <div className={styles.modeGrid}>
          {TRAVEL_MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.modeBtn} ${travelMode === opt.value ? styles.modeBtnActive : ''}`}
              onClick={() => onTravelModeChange(opt.value)}
              disabled={loading}
              title={opt.label}
            >
              <span className={styles.modeIcon} aria-hidden="true">{opt.icon}</span>
              <span className={styles.modeLabel}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Closed / open route toggle */}
        <div className={styles.routeTypeRow}>
          <span className={styles.routeTypeLabel}>Route type</span>
          <button
            className={`${styles.routeTypeToggle} ${closed ? styles.routeTypeClosed : styles.routeTypeOpen}`}
            onClick={() => onClosedChange(!closed)}
            disabled={loading}
          >
            <span className={styles.routeTypeIndicator} />
            <span>{closed ? '⟳ Closed route' : '→ Open route'}</span>
          </button>
        </div>

        {/* Destination search */}
        <label className={styles.label} style={{ marginTop: '14px' }}>Add destination</label>
        <div className={styles.inputRow} ref={dropdownRef}>
          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              type="text"
              placeholder="Search for a place..."
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              disabled={!canAdd || loading}
              autoComplete="off"
            />
            {searching && <span className={styles.inputSpinner} />}
            {suggestions.length > 0 && (
              <ul className={styles.dropdown}>
                {suggestions.map(opt => (
                  <li
                    key={opt.place_id}
                    className={styles.dropdownItem}
                    onMouseDown={() => addPlace(opt)}
                  >
                    <span className={styles.dropdownName}>{opt.name}</span>
                    <span className={styles.dropdownAddr}>{opt.address}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.counter}>
          <span className={`${styles.dot} ${locations.length >= MAX_LOCATIONS ? styles.dotFull : styles.dotOk}`} />
          {locations.length} / {MAX_LOCATIONS} destinations
        </div>
      </div>

      {isOptimized && <p className={styles.optimizedLabel}>Optimized route</p>}

      <ul className={styles.list}>
        {displayList.map((loc, idx) => (
          <li key={`${loc.lat}-${loc.lng}-${idx}`} className={styles.item}>
            <span className={`${styles.badge} ${isOptimized ? styles.badgeGreen : styles.badgeBlue}`}>
              {idx + 1}
            </span>
            <span className={styles.itemText} title={loc.address}>
              {loc.name || loc.address.split(',')[0]}
              <small className={styles.itemSub}>
                {loc.address.split(',').slice(1, 3).join(',')}
              </small>
            </span>
            <button
              className={styles.removeBtn}
              onClick={() => handleRemove(loc)}
              title="Remove"
              disabled={loading}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={onCalculateRoute} disabled={!canOptimize}>
          {loading ? (
            <span className={styles.spinner}>Calculating...</span>
          ) : isOptimized ? (
            'Re-optimize route'
          ) : (
            'Optimize route'
          )}
        </button>

        {locations.length > 0 && (
          <button className={styles.secondaryBtn} onClick={handleClear} disabled={loading}>
            Clear all
          </button>
        )}
      </div>
    </aside>
  );
}