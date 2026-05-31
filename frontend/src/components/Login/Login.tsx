import { useState } from 'react';
import { signInWithGoogle, signInWithEmail, registerWithEmail } from '../../services/firebase';
import styles from './Login.module.css';

type Mode = 'login' | 'register';

const ERROR_MESSAGES: Record<string, string> = {
  'auth/wrong-password': 'Incorrect password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/invalid-email': 'Invalid email format.',
  'auth/invalid-credential': 'Invalid credentials. Check your email and password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
};

function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? `Error: ${code}`;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('login');

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? 'unknown';
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? 'unknown';
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'register' : 'login'));
    setError('');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>Route Optimizer</h2>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </p>

        <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          Continue with Google
        </button>

        <hr className={styles.divider} />

        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          className={styles.input}
          type="password"
          placeholder={mode === 'login' ? 'Password' : 'Password (min. 6 characters)'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={loading}
        />
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <p className={styles.toggle}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <span className={styles.toggleLink} onClick={toggleMode}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </p>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
