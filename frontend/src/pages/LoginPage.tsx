import MapView from '../components/MapView/MapView';
import Login from '../components/Login/Login';

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1000,
  backdropFilter: 'blur(6px)',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function LoginPage() {
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <MapView locations={[]} optimizedRoute={[]} closed={false} />
      <div style={overlayStyle}>
        <Login />
      </div>
    </div>
  );
}
