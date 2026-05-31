import { useState } from 'react';
import { optimizeRoute } from '../services/api';
import type { Place } from '../types';

export function useRoute() {
  const [optimizedRoute, setOptimizedRoute] = useState<Place[]>([]);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const optimize = async (places: Place[], closed: boolean) => {
    if (places.length < 2) return;
    setLoading(true);
    setOptimizedRoute([]);
    setTotalDistanceKm(null);

    try {
      const result = await optimizeRoute(places, closed);
      setOptimizedRoute(result.orderedRoute);
      setTotalDistanceKm(result.totalDistanceKm);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(`Route optimization failed:\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setOptimizedRoute([]);
    setTotalDistanceKm(null);
  };

  return { optimizedRoute, totalDistanceKm, loading, optimize, clear };
}
