// Pantalla de login que se muestra cuando no hay sesión activa.
// Soporta autenticación con Google (popup) y email/password.
import { useState } from 'react';
import { loginConGoogle, loginConEmail } from '../services/firebase';

/** Traduce códigos de error de Firebase a mensajes legibles en español. */
function traducirError(code) {
  const mensajes = {
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/invalid-email': 'El formato del email no es válido.',
    'auth/invalid-credential': 'Credenciales inválidas. Verifica email y contraseña.',
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

  const handleEmail = async () => {
    setError('');
    if (!email || !password) {
      setError('Ingresa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await loginConEmail(email, password);
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
        <p style={styles.subtitle}>Inicia sesión para continuar</p>

        {/* Botón de Google */}
        <button style={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          Continuar con Google
        </button>

        <hr style={styles.divider} />

        {/* Formulario email/password */}
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
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
        />
        <button style={styles.emailBtn} onClick={handleEmail} disabled={loading}>
          {loading ? 'Cargando...' : 'Iniciar sesión'}
        </button>

        {/* Mensaje de error */}
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#f0f2f5',
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
  error: { color: '#e53e3e', fontSize: '0.85rem', margin: 0 },
};
