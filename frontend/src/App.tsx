import 'leaflet/dist/leaflet.css';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';

export default function App() {
  const user = useAuth();

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
          Loading...
        </p>
      </div>
    );
  }

  if (user === null) {
    return <LoginPage />;
  }

  return <MainPage user={user} />;
}
