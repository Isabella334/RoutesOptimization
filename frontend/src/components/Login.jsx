// Pantalla de login/registro que se muestra cuando no hay sesión activa.
// Soporta autenticación con Google (popup) y email/password (login y registro).
import { useState } from 'react';
import { loginConGoogle, loginConEmail, registrarConEmail } from '../services/firebase';

/** Traduce códigos de error de Firebase a mensajes legibles en español. */
function traducirError(code) {
  const mensajes = {
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/invalid-email': 'El formato del email no es válido.',
    'auth/invalid-credential': 'Credenciales inválidas. Verifica email y contraseña.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/popup-closed-by-user': 'Se cerró el popup antes de completar el login.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  };
  return mensajes[code] ?? `Error: ${code}`;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Alterna entre modo login y modo registro
  const [modo, setModo] = useState('login');

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginConGoogle();
      // onAuthStateChanged en App.tsx detecta el cambio y desmonta este componente
    } catch (e) {
      setError(traducirError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Ingresa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      if (modo === 'login') {
        await loginConEmail(email, password);
      } else {
        await registrarConEmail(email, password);
      }
    } catch (e) {
      setError(traducirError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>Route Optimizer</h2>
        <p style={styles.subtitle}>
          {modo === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>

        <button style={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          Continuar con Google
        </button>

        <hr style={styles.divider} />

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          style={styles.input}
          type="password"
          placeholder={modo === 'login' ? 'Contraseña' : 'Contraseña (mín. 6 caracteres)'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
        />
        <button style={styles.emailBtn} onClick={handleEmailSubmit} disabled={loading}>
          {loading ? 'Cargando...' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        {/* Toggle login/registro */}
        <p style={styles.toggle}>
          {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <span
            style={styles.toggleLink}
            onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); }}
          >
            {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </span>
        </p>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: '#fff', padding: '2rem', borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)', width: '320px',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
  },
  title: { margin: 0, textAlign: 'center', fontSize: '1.5rem' },
  subtitle: { margin: 0, textAlign: 'center', color: '#666', fontSize: '0.9rem' },
  googleBtn: {
    padding: '0.75rem', background: '#4285F4', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
  },
  divider: { border: 'none', borderTop: '1px solid #eee', margin: '0.25rem 0' },
  input: {
    padding: '0.65rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem',
  },
  emailBtn: {
    padding: '0.75rem', background: '#333', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
  },
  toggle: { margin: 0, textAlign: 'center', fontSize: '0.85rem', color: '#555' },
  toggleLink: { color: '#4285F4', cursor: 'pointer', fontWeight: 600 },
  error: { color: '#e53e3e', fontSize: '0.85rem', margin: 0 },
};
