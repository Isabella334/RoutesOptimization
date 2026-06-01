import { useState } from 'react';
import type { User } from 'firebase/auth';
import { signOutUser } from '../services/firebase';
import { useRoute } from '../hooks/useRoute';
import MapView from '../components/MapView/MapView';
import Sidebar from '../components/sidebar/Sidebar';
import TopBar from '../components/TopBar/TopBar';
import type { Place } from '../types';
import type { TravelMode } from '../services/api';
import styles from './MainPage.module.css';

interface MainPageProps {
  user: User;
}

export default function MainPage({ user }: MainPageProps) {
  const [locations, setLocations] = useState<Place[]>([]);
  const [closed, setClosed] = useState(true);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { optimizedRoute, totalDistanceKm, loading, optimize, clear } = useRoute();

  const handleClosedChange = (next: boolean) => {
    setClosed(next);
    clear();
  };

  const handleTravelModeChange = (next: TravelMode) => {
    setTravelMode(next);
    clear();
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        locations={locations}
        setLocations={setLocations}
        optimizedRoute={optimizedRoute}
        closed={closed}
        onClosedChange={handleClosedChange}
        travelMode={travelMode}
        onTravelModeChange={handleTravelModeChange}
        onCalculateRoute={() => optimize(locations, closed, travelMode)}
        onClearRoute={clear}
        loading={loading}
      />

      {sidebarOpen && (
        <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />
      )}

      <div className={styles.mapArea}>
        <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <TopBar
          userLabel={user.email ?? user.displayName ?? ''}
          totalDistanceKm={totalDistanceKm}
          onSignOut={signOutUser}
        />
        <MapView locations={locations} optimizedRoute={optimizedRoute} closed={closed} travelMode={travelMode}/>
      </div>
    </div>
  );
}
