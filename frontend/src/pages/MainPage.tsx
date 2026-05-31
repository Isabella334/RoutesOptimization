import { useState } from 'react';
import type { User } from 'firebase/auth';
import { signOutUser } from '../services/firebase';
import { useRoute } from '../hooks/useRoute';
import MapView from '../components/MapView/MapView';
import Sidebar from '../components/sidebar/Sidebar';
import TopBar from '../components/TopBar/TopBar';
import type { Place } from '../types';

interface MainPageProps {
  user: User;
}

export default function MainPage({ user }: MainPageProps) {
  const [locations, setLocations] = useState<Place[]>([]);
  const [closed, setClosed] = useState(true);
  const { optimizedRoute, totalDistanceKm, loading, optimize, clear } = useRoute();

  const handleClosedChange = (next: boolean) => {
    setClosed(next);
    clear();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        locations={locations}
        setLocations={setLocations}
        optimizedRoute={optimizedRoute}
        onCalculateRoute={() => optimize(locations, closed)}
        onClearRoute={clear}
        loading={loading}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <TopBar
          userLabel={user.email ?? user.displayName ?? ''}
          closed={closed}
          onClosedChange={handleClosedChange}
          totalDistanceKm={totalDistanceKm}
          onSignOut={signOutUser}
        />
        <MapView locations={locations} optimizedRoute={optimizedRoute} closed={closed} />
      </div>
    </div>
  );
}
