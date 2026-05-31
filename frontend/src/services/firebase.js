// Inicialización de Firebase y helpers de autenticación.
// Este módulo es el único punto de contacto con el SDK de Firebase en el frontend.
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

// Configuración leída desde variables de entorno de Vite (prefijo VITE_ requerido).
// Las claves del firebaseConfig NO son secretos críticos (van en el bundle),
// pero se manejan por env por buena práctica y requisito de la rúbrica.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Evitar reinicialización al hacer hot reload en desarrollo
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/** Instancia de autenticación compartida en toda la app. */
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

/**
 * Abre el popup de Google y retorna el UserCredential.
 * Lanza FirebaseError si el usuario cierra el popup o si hay un error de red.
 */
export const loginConGoogle = () => signInWithPopup(auth, googleProvider);

/**
 * Inicia sesión con email y contraseña.
 * Lanza FirebaseError con codes como 'auth/wrong-password', 'auth/user-not-found'.
 */
export const loginConEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/**
 * Crea una nueva cuenta con email y contraseña.
 * Lanza FirebaseError con codes como 'auth/email-already-in-use', 'auth/weak-password'.
 */
export const registrarConEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

/** Cierra la sesión del usuario actual. */
export const logout = () => signOut(auth);

/**
 * Retorna el JWT firmado por Firebase del usuario actual.
 * El token expira cada hora; Firebase lo renueva automáticamente.
 * Llamar justo antes de cada request al backend (no cachear).
 */
export const obtenerIdToken = () => auth.currentUser?.getIdToken();
