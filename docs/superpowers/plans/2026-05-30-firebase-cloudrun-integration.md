# Firebase Auth + Cloud Run Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar Firebase Authentication (Google + Email/Password) al frontend y desplegar el backend Python en Cloud Run, con la integración frontend ↔ backend usando Bearer tokens.

**Architecture:** El frontend usa Firebase SDK para auth; cada llamada al backend lleva un JWT en el header `Authorization`. El backend (Cloud Function en `main.py`) verifica el token con `firebase-admin`, valida inputs, corre el GA existente y retorna la ruta optimizada.

**Tech Stack:** React 19 + TypeScript + Firebase JS SDK v10 | Python 3.13 + functions-framework + firebase-admin | Cloud Run (us-central1) | Leaflet + OSRM

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `frontend/src/services/firebase.js` | Crear |
| `frontend/src/components/Login.jsx` | Crear |
| `frontend/src/App.tsx` | Modificar |
| `frontend/src/types/index.ts` | Modificar |
| `frontend/src/services/cloudFunction.js` | Crear |
| `frontend/.env.example` | Modificar |
| `backend/main.py` | Reescribir |
| `backend/pyproject.toml` | Modificar |
| `backend/Dockerfile` | Crear |
| `backend/src/use_cases/genetic_algorithm/route.py` | Modificar |
| `backend/src/use_cases/genetic_algorithm/population.py` | Modificar |
| `backend/src/use_cases/genetic_algorithm/genetic_algorithm.py` | Modificar |
| `backend/src/use_cases/genetic_algorithm/crossover.py` | Modificar |
| `backend/distance_matrix.py` | Crear |

---

## Task 1: Configurar proyecto Firebase (manual en consola)

**Archivos:** ninguno (pasos manuales en browser)

- [ ] **Step 1: Crear proyecto Firebase**

  1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
  2. Click **Add project** → nombre: `routes-optimizer`
  3. En "Google Analytics" puedes desactivarlo → **Create project**

- [ ] **Step 2: Habilitar proveedores de autenticación**

  1. En el menú izquierdo → **Build → Authentication**
  2. Click **Get started**
  3. Tab **Sign-in method** → habilitar **Google** (necesita support email) → **Save**
  4. Tab **Sign-in method** → habilitar **Email/Password** → **Save**

- [ ] **Step 3: Registrar la Web App y copiar el config**

  1. En la consola del proyecto → ⚙️ Project settings → **General**
  2. Scroll hasta "Your apps" → click **</>** (Web)
  3. App nickname: `routes-frontend` → **Register app**
  4. Copiar el objeto `firebaseConfig` (lo necesitas en el siguiente task)
  5. **No** instalar Firebase SDK desde aquí (lo haremos con npm)

- [ ] **Step 4: Anotar el Project ID**

  En **Project settings → General**, copiar el **Project ID** (ej. `routes-optimizer-abc12`).
  Este valor va en `FIREBASE_PROJECT_ID` del backend.

- [ ] **Step 5: Agregar dominio autorizado para auth**

  **Authentication → Settings → Authorized domains** → confirmar que `localhost` está en la lista (viene por defecto).

---

## Task 2: Instalar Firebase SDK en el frontend

**Archivos:** `frontend/package.json` (modificado automáticamente por npm)

- [ ] **Step 1: Instalar firebase**

  ```bash
  cd frontend
  npm install firebase
  ```

  Salida esperada: `added X packages` sin errores.

- [ ] **Step 2: Crear `frontend/.env` con el firebaseConfig**

  Crear `frontend/.env` (nunca se sube al repo):

  ```
  VITE_FIREBASE_API_KEY=AIzaSy...
  VITE_FIREBASE_AUTH_DOMAIN=routes-optimizer-abc12.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=routes-optimizer-abc12
  VITE_FIREBASE_APP_ID=1:123456:web:abc123
  VITE_BACKEND_URL=http://localhost:8000
  ```

  Reemplazar los valores con los del `firebaseConfig` copiado en Task 1.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/package.json frontend/package-lock.json
  git commit -m "feat(frontend): install Firebase SDK"
  ```

---

## Task 3: Crear `frontend/src/services/firebase.js`

**Archivos:**
- Crear: `frontend/src/services/firebase.js`

- [ ] **Step 1: Crear el archivo**

  ```javascript
  // Inicialización de Firebase y helpers de autenticación.
  // Este módulo es el único punto de contacto con el SDK de Firebase en el frontend.
  import { initializeApp } from 'firebase/app';
  import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
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

  const app = initializeApp(firebaseConfig);

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

  /** Cierra la sesión del usuario actual. */
  export const logout = () => signOut(auth);

  /**
   * Retorna el JWT firmado por Firebase del usuario actual.
   * El token expira cada hora; Firebase lo renueva automáticamente.
   * Llamar justo antes de cada request al backend (no cachear).
   */
  export const obtenerIdToken = () => auth.currentUser?.getIdToken();
  ```

- [ ] **Step 2: Verificar que no hay errores de importación**

  ```bash
  cd frontend
  npm run build 2>&1 | head -30
  ```

  Salida esperada: build exitoso o errores de TypeScript (no de módulos de Firebase).

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/services/firebase.js
  git commit -m "feat(frontend): add Firebase auth service"
  ```

---

## Task 4: Crear `frontend/src/components/Login.jsx`

**Archivos:**
- Crear: `frontend/src/components/Login.jsx`

- [ ] **Step 1: Crear el componente**

  ```jsx
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
  ```

- [ ] **Step 2: Verificar build**

  ```bash
  cd frontend && npm run build 2>&1 | head -20
  ```

  Esperado: sin errores nuevos.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/components/Login.jsx
  git commit -m "feat(frontend): add Login component with Google and email/password"
  ```

---

## Task 5: Modificar `App.tsx` — auth gate + modo cerrado/abierto

**Archivos:**
- Modificar: `frontend/src/App.tsx`
- Modificar: `frontend/src/types/index.ts`

- [ ] **Step 1: Actualizar `frontend/src/types/index.ts`**

  Reemplazar el contenido completo con:

  ```typescript
  /** Representa un destino ingresado por el usuario. */
  export interface Place {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }

  /** Elemento de la ruta devuelto por el backend. */
  export interface PlaceResult {
    place_id: string;
    name: string;
    order: number;
  }

  /** Respuesta completa del endpoint /routes/optimize. */
  export interface RouteResponse {
    route: PlaceResult[];
    total_distance_km: number;
    closed: boolean;
  }
  ```

- [ ] **Step 2: Reemplazar el contenido de `frontend/src/App.tsx`**

  ```tsx
  import { useState, useEffect } from 'react';
  import type { User } from 'firebase/auth';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth, logout } from './services/firebase';
  import 'leaflet/dist/leaflet.css';
  import MapView from './components/MapView';
  import Sidebar from './components/sidebar/Sidebar';
  import Login from './components/Login';
  import type { Place } from './types';

  export default function App() {
    // Estado del usuario autenticado (null = no autenticado, undefined = cargando)
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [locations, setLocations] = useState<Place[]>([]);
    const [optimizedRoute, setOptimizedRoute] = useState<Place[]>([]);
    const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    // true = ruta circular (regresa al origen), false = ruta abierta
    const [closed, setClosed] = useState(true);

    // Escucha cambios de sesión de Firebase. Se ejecuta al montar y limpia al desmontar.
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
      });
      return unsubscribe;
    }, []);

    const handleCalculateRoute = async () => {
      if (locations.length < 2) return;
      setLoading(true);
      setOptimizedRoute([]);
      setTotalDistanceKm(null);

      try {
        // Import dinámico para evitar que cloudFunction.js se ejecute antes de que
        // Firebase esté inicializado
        const { calcularRuta } = await import('./services/cloudFunction');
        const result = await calcularRuta(locations, closed);
        setOptimizedRoute(result.orderedRoute);
        setTotalDistanceKm(result.totalDistanceKm);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        alert(`Error al optimizar la ruta:\n${message}`);
      } finally {
        setLoading(false);
      }
    };

    const handleClearRoute = () => {
      setOptimizedRoute([]);
      setTotalDistanceKm(null);
    };

    // Mientras Firebase resuelve el estado de autenticación, mostrar spinner
    if (user === undefined) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <p>Cargando...</p>
        </div>
      );
    }

    // Sin sesión activa → pantalla de login
    if (user === null) {
      return <Login />;
    }

    // Con sesión → app completa
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Sidebar
          locations={locations}
          setLocations={setLocations}
          optimizedRoute={optimizedRoute}
          onCalculateRoute={handleCalculateRoute}
          onClearRoute={handleClearRoute}
          loading={loading}
        />
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Barra superior con info del usuario y controles de sesión */}
          <div style={topBarStyle}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>
              {user.email ?? user.displayName}
            </span>
            <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={closed}
                onChange={e => setClosed(e.target.checked)}
              />
              Ruta cerrada
            </label>
            {totalDistanceKm !== null && (
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
                Distancia: {totalDistanceKm.toFixed(2)} km
              </span>
            )}
            <button onClick={() => logout()} style={logoutBtnStyle}>
              Cerrar sesión
            </button>
          </div>
          <MapView locations={locations} optimizedRoute={optimizedRoute} />
        </div>
      </div>
    );
  }

  const topBarStyle: React.CSSProperties = {
    position: 'absolute', top: 10, right: 10, zIndex: 1000,
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'white', padding: '8px 14px', borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };

  const logoutBtnStyle: React.CSSProperties = {
    padding: '4px 10px', background: '#e53e3e', color: 'white',
    border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem',
  };
  ```

- [ ] **Step 3: Ejecutar el dev server y verificar el flujo de login**

  ```bash
  cd frontend && npm run dev
  ```

  Abrir `http://localhost:5173`. Debe aparecer la pantalla de Login (no el mapa). Probar el login con Google. Al iniciar sesión, debe aparecer el mapa con el email del usuario en la barra superior.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/App.tsx frontend/src/types/index.ts
  git commit -m "feat(frontend): add Firebase auth gate and closed/open route toggle"
  ```

---

## Task 6: Preparar el backend — dependencias + Dockerfile

**Archivos:**
- Modificar: `backend/pyproject.toml`
- Crear: `backend/Dockerfile`

- [ ] **Step 1: Agregar `firebase-admin` y `requests` a `pyproject.toml`**

  En la sección `[project] dependencies`, agregar las dos líneas nuevas:

  ```toml
  dependencies = [
      "dotenv>=0.9.9",
      "fastapi>=0.136.1",
      "firebase-admin>=6.5.0",
      "functions-framework>=3.10.1",
      "pydantic>=2.13.4",
      "requests>=2.34.2",
      "uvicorn>=0.47.0",
  ]
  ```

- [ ] **Step 2: Instalar las nuevas dependencias**

  ```bash
  cd backend && uv sync
  ```

  Salida esperada: `Resolved X packages` con `firebase-admin` incluido.

- [ ] **Step 3: Crear `backend/Dockerfile`**

  ```dockerfile
  # Imagen base oficial de Python 3.13 slim (menor tamaño que full)
  FROM python:3.13-slim

  WORKDIR /app

  # Copiar todo el proyecto al contenedor
  COPY . .

  # Instalar dependencias del proyecto (incluyendo los paquetes locales src/)
  # --no-cache-dir reduce el tamaño de la imagen final
  RUN pip install --no-cache-dir .

  # Cloud Run inyecta el puerto en la variable de entorno PORT
  ENV PORT=8080
  EXPOSE 8080

  # functions-framework arranca el servidor HTTP apuntando a la función `main`
  CMD ["sh", "-c", "functions-framework --target=main --port=$PORT"]
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd backend
  git add pyproject.toml Dockerfile
  git commit -m "feat(backend): add firebase-admin dep and Dockerfile for Cloud Run"
  ```

---

## Task 7: Reescribir `backend/main.py` como Cloud Function

**Archivos:**
- Reescribir: `backend/main.py`

- [ ] **Step 1: Reemplazar el contenido de `backend/main.py`**

  ```python
  """
  Entry point HTTP de la Cloud Function / Cloud Run.
  
  Orden de validación (nunca reordenar):
    1. CORS preflight
    2. Verificación de IP contra allowlist
    3. Verificación del ID token de Firebase
    4. Validación del body (cantidad de destinos, radio máximo)
    5. Algoritmo genético
    6. Respuesta JSON
  """
  import json
  import math
  import os
  import sys

  import functions_framework
  import firebase_admin
  from firebase_admin import auth

  # Asegurar que los paquetes locales (domain, use_cases, etc.) sean importables
  # cuando se ejecuta desde el directorio backend/ en local sin instalación previa.
  sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

  from domain import Place, Coordinates
  from use_cases import GeneticAlgorithm

  # Inicializar firebase_admin una sola vez (en Cloud Run usa ADC automáticamente;
  # en local requiere la variable GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON
  # de la service account del proyecto Firebase).
  if not firebase_admin._apps:
      firebase_admin.initialize_app()

  # Cabeceras CORS que van en toda respuesta (incluyendo errores).
  _CORS_HEADERS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Content-Type": "application/json",
  }


  def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
      """Distancia en km entre dos puntos usando la fórmula de haversine."""
      R = 6371.0
      phi1, phi2 = math.radians(lat1), math.radians(lat2)
      dphi = math.radians(lat2 - lat1)
      dlambda = math.radians(lng2 - lng1)
      a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
      return R * 2 * math.asin(math.sqrt(a))


  def _verificar_ip(request) -> bool:
      """
      Comprueba si la IP del cliente está en la allowlist.
      
      Lee el primer valor de X-Forwarded-For (IP real del cliente cuando pasa
      por el load balancer de Google). Si ALLOWED_IPS está vacío, permite todo.
      
      Trade-off: X-Forwarded-For puede falsificarse si alguien llega directo a
      Cloud Run sin pasar por el LB. Cloud Armor (Opción A) es más robusto.
      """
      allowed_raw = os.environ.get("ALLOWED_IPS", "").strip()
      if not allowed_raw:
          # Sin allowlist configurada → no restringir (útil en desarrollo)
          return True

      forwarded = request.headers.get("X-Forwarded-For", "")
      client_ip = forwarded.split(",")[0].strip() if forwarded else request.remote_addr
      allowed = {ip.strip() for ip in allowed_raw.split(",") if ip.strip()}
      return client_ip in allowed


  def _verificar_token(request) -> bool:
      """
      Verifica el ID token de Firebase en el header Authorization.
      
      El token es un JWT firmado por Firebase válido por 1 hora.
      firebase_admin.auth.verify_id_token() verifica firma, expiración y emisor.
      """
      auth_header = request.headers.get("Authorization", "")
      if not auth_header.startswith("Bearer "):
          return False
      token = auth_header[len("Bearer "):]
      try:
          auth.verify_id_token(token)
          return True
      except Exception:
          return False


  def _validar_radio(places: list[Place]) -> bool:
      """
      Verifica que ningún par de destinos supere 100 km entre sí (haversine).
      
      Se usa haversine (línea recta) porque es barato (sin llamadas a API) y
      conservador: la distancia real por carretera siempre es mayor, así que si
      la línea recta pasa los 100 km, la ruta por carretera también los pasaría.
      """
      for i in range(len(places)):
          for j in range(i + 1, len(places)):
              d = _haversine_km(
                  places[i].coordinates.latitude, places[i].coordinates.longitude,
                  places[j].coordinates.latitude, places[j].coordinates.longitude,
              )
              if d > 100:
                  return False
      return True


  @functions_framework.http
  def main(request):
      """Endpoint principal de la Cloud Function. Recibe POST con destinos y retorna la ruta óptima."""

      # 1. CORS preflight — el navegador envía OPTIONS antes del POST real
      if request.method == "OPTIONS":
          return ("", 204, _CORS_HEADERS)

      # 2. Verificación de IP
      if not _verificar_ip(request):
          return (json.dumps({"error": "Forbidden: IP no permitida"}), 403, _CORS_HEADERS)

      # 3. Verificación del token de Firebase
      if not _verificar_token(request):
          return (json.dumps({"error": "Unauthorized: token inválido o ausente"}), 401, _CORS_HEADERS)

      # 4. Parsear body
      data = request.get_json(silent=True)
      if not data:
          return (json.dumps({"error": "Body JSON requerido"}), 400, _CORS_HEADERS)

      places_data = data.get("places", [])
      closed = bool(data.get("closed", True))

      # Validar cantidad de destinos
      if not (2 <= len(places_data) <= 15):
          return (
              json.dumps({"error": "Se requieren entre 2 y 15 destinos"}),
              400, _CORS_HEADERS,
          )

      # Construir objetos de dominio
      # place_id es el índice string ("0", "1", ...) para poder mapear de vuelta en el frontend
      try:
          places = [
              Place(
                  place_id=str(i),
                  name=p["name"],
                  coordinates=Coordinates(float(p["lat"]), float(p["lng"])),
              )
              for i, p in enumerate(places_data)
          ]
      except (KeyError, ValueError) as e:
          return (json.dumps({"error": f"Formato de destino inválido: {e}"}), 400, _CORS_HEADERS)

      # Validar radio máximo entre pares de destinos
      if not _validar_radio(places):
          return (
              json.dumps({"error": "Algún par de destinos supera los 100 km"}),
              400, _CORS_HEADERS,
          )

      # 5. Correr el algoritmo genético
      ga = GeneticAlgorithm()
      best_route = ga.run(places, closed=closed)

      # fitness = 1 / distancia_total → distancia = 1 / fitness
      total_distance_km = round(1 / best_route.fitness, 2)

      # 6. Construir respuesta
      response = {
          "route": [
              {"place_id": p.place_id, "name": p.name, "order": i + 1}
              for i, p in enumerate(best_route.route)
          ],
          "total_distance_km": total_distance_km,
          "closed": closed,
      }

      return (json.dumps(response), 200, _CORS_HEADERS)
  ```

- [ ] **Step 2: Probar la función localmente**

  ```bash
  cd backend
  functions-framework --target=main --debug --port=8080
  ```

  En otra terminal:

  ```bash
  curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer dummy-token-for-testing" \
    -d '{"places":[{"name":"A","lat":14.63,"lng":-90.50},{"name":"B","lat":14.64,"lng":-90.51}],"closed":true}'
  ```

  Esperado: respuesta `401` (token inválido) → confirma que el servidor está corriendo y la verificación de token funciona.

  Para probar sin auth temporalmente, comentar la línea `if not _verificar_token(request)` y verificar que responde `200` con la ruta.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/main.py
  git commit -m "feat(backend): rewrite main.py as Cloud Function with auth and validation"
  ```

---

## Task 8: Desplegar el backend en Cloud Run

**Archivos:** ninguno (comandos de despliegue)

- [ ] **Step 1: Autenticarse con GCP (en Cloud Shell ya estás autenticado)**

  Si trabajas en local (no Cloud Shell):
  ```bash
  gcloud auth login
  gcloud config set project tough-electron-388917
  ```

  Si estás en Cloud Shell: ya estás autenticado con el proyecto `tough-electron-388917`.

- [ ] **Step 2: Crear la nueva API key de Google Maps (Distance Matrix)**

  En [console.cloud.google.com](https://console.cloud.google.com):
  1. **APIs & Services → Credentials → Create Credentials → API key**
  2. Click **Restrict key** → en "API restrictions" → seleccionar solo **Distance Matrix API**
  3. Copiar la key (la usarás en el siguiente step como `GOOGLE_MAPS_API_KEY`)

- [ ] **Step 3: Obtener tu IP pública actual (para ALLOWED_IPS)**

  ```bash
  curl ifconfig.me
  ```

  Copiar la IP. Si la dejas vacía en `ALLOWED_IPS`, se desactiva la restricción de IP (útil para demo).

- [ ] **Step 4: Desplegar en Cloud Run**

  Ejecutar desde el directorio `backend/`:

  ```bash
  cd backend
  gcloud run deploy routes-optimizer \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "FIREBASE_PROJECT_ID=<TU_FIREBASE_PROJECT_ID>,GOOGLE_MAPS_API_KEY=<TU_KEY>,ALLOWED_IPS="
  ```

  Reemplazar:
  - `<TU_FIREBASE_PROJECT_ID>` → el Project ID del paso Task 1, Step 4
  - `<TU_KEY>` → la API key creada en Step 2

  Esperado al final: `Service URL: https://routes-optimizer-XXXXXX-uc.a.run.app`

  **Copiar esa URL** — la necesitas en Task 9.

- [ ] **Step 5: Verificar el despliegue con curl**

  ```bash
  curl -X POST https://routes-optimizer-XXXXXX-uc.a.run.app \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer token-invalido" \
    -d '{"places":[],"closed":true}'
  ```

  Esperado: `{"error": "Unauthorized: token inválido o ausente"}` → el backend está arriba y la auth funciona.

- [ ] **Step 6: Agregar el dominio del frontend a Firebase Auth**

  Si el frontend está en Vercel/Netlify (dominio distinto a localhost):
  1. Firebase Console → **Authentication → Settings → Authorized domains**
  2. Agregar el dominio de producción

- [ ] **Step 7: Commit con la URL actualizada en .env.example**

  ```bash
  # Actualizar frontend/.env con la URL real del backend
  # (VITE_BACKEND_URL=https://routes-optimizer-XXXXXX-uc.a.run.app)
  git add backend/uv.lock
  git commit -m "feat(backend): deploy routes-optimizer to Cloud Run"
  ```

---

## Task 9: Crear `frontend/src/services/cloudFunction.js`

**Archivos:**
- Crear: `frontend/src/services/cloudFunction.js`

- [ ] **Step 1: Crear el archivo**

  ```javascript
  // Servicio que conecta el frontend con el backend de Cloud Run.
  // Gestiona el token de Firebase y el mapeo de tipos frontend ↔ backend.
  import { obtenerIdToken } from './firebase';

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  /**
   * Llama al endpoint /routes/optimize del backend con los destinos del usuario.
   * 
   * @param {import('../types').Place[]} places - Lista de destinos del usuario
   * @param {boolean} closed - true = ruta circular, false = ruta abierta
   * @returns {{ orderedRoute: import('../types').Place[], totalDistanceKm: number }}
   */
  export async function calcularRuta(places, closed) {
    // El token expira cada hora; getIdToken() lo renueva automáticamente si expiró.
    const token = await obtenerIdToken();
    if (!token) throw new Error('No hay sesión activa');

    // El backend espera place_id (string index), name, lat, lng.
    // El address no viaja al backend porque no es necesario para el GA.
    const backendPlaces = places.map((p, i) => ({
      place_id: String(i),
      name: p.name,
      lat: p.lat,
      lng: p.lng,
    }));

    const res = await fetch(`${BACKEND_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ places: backendPlaces, closed }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend ${res.status}: ${text}`);
    }

    const data = await res.json();

    // Reordenar los places originales según el orden devuelto por el backend.
    // Usamos place_id (que es el índice string) para mapear de vuelta al Place original,
    // preservando name, address, lat y lng que el frontend necesita.
    const orderedRoute = data.route
      .sort((a, b) => a.order - b.order)
      .map(item => places[parseInt(item.place_id)]);

    return {
      orderedRoute,
      totalDistanceKm: data.total_distance_km,
    };
  }
  ```

- [ ] **Step 2: Actualizar `frontend/.env` con la URL del backend desplegado**

  ```
  VITE_BACKEND_URL=https://routes-optimizer-XXXXXX-uc.a.run.app
  ```

- [ ] **Step 3: Probar la integración completa**

  ```bash
  cd frontend && npm run dev
  ```

  Flujo a verificar:
  1. Login con Google o email/password → aparece el mapa
  2. Agregar 2+ destinos en Guatemala
  3. Click "Optimizar ruta"
  4. Esperar la respuesta del backend (puede tardar ~5 seg por el GA)
  5. Los marcadores deben tornarse verdes y reordenarse
  6. La distancia total debe mostrarse en la barra superior

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/services/cloudFunction.js frontend/.env.example
  git commit -m "feat(frontend): add cloudFunction service and connect to deployed backend"
  ```

---

## Task 10: Actualizar `.env.example` y auditar `.gitignore`

**Archivos:**
- Modificar: `frontend/.env.example`
- Modificar: `backend/.env.example`
- Verificar: `.gitignore`

- [ ] **Step 1: Actualizar `frontend/.env.example`**

  ```
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_APP_ID=
  VITE_BACKEND_URL=
  ```

- [ ] **Step 2: Actualizar `backend/.env.example`**

  ```
  GOOGLE_MAPS_API_KEY=
  FIREBASE_PROJECT_ID=
  ALLOWED_IPS=
  GOOGLE_APPLICATION_CREDENTIALS=
  ```

- [ ] **Step 3: Verificar que `.gitignore` cubre todos los secretos**

  Correr desde la raíz:

  ```bash
  git check-ignore -v frontend/.env backend/.env
  ```

  Esperado: ambas líneas deben aparecer como ignoradas. Si no aparecen, agregar a `.gitignore`:

  ```
  .env
  **/.env
  *.json.key
  service-account*.json
  ```

- [ ] **Step 4: Escaneo de secretos en el historial**

  ```bash
  git log -p | grep -i "AIzaSy"
  ```

  Esperado: sin resultados (ninguna API key en el historial). Si aparece algo, rotar la key en GCP Console inmediatamente.

- [ ] **Step 5: Commit final**

  ```bash
  git add frontend/.env.example backend/.env.example .gitignore
  git commit -m "chore: update .env.example files and verify .gitignore"
  ```

---

## Task 11 (Opcional): Integrar Distance Matrix API en el GA

**Archivos:**
- Crear: `backend/distance_matrix.py`
- Modificar: `backend/src/use_cases/genetic_algorithm/route.py`
- Modificar: `backend/src/use_cases/genetic_algorithm/population.py`
- Modificar: `backend/src/use_cases/genetic_algorithm/genetic_algorithm.py`
- Modificar: `backend/src/use_cases/genetic_algorithm/crossover.py`
- Modificar: `backend/main.py` (llamar a distance_matrix antes del GA)

Este task reemplaza el haversine del GA por distancias reales de carretera. Requiere `GOOGLE_MAPS_API_KEY` con Distance Matrix API habilitada.

- [ ] **Step 1: Crear `backend/distance_matrix.py`**

  ```python
  """
  Construcción de la matriz de distancias NxN usando Google Distance Matrix API.
  
  La matriz se precomputa UNA sola vez antes de correr el GA.
  Razón: el GA evalúa miles de permutaciones; llamar a la API en cada evaluación
  sería O(N² × generaciones) llamadas — prohibitivamente caro y lento.
  Con la matriz precomputada, cada evaluación es O(N) operaciones en memoria.
  """
  import os
  import requests
  from domain import Place


  def construir_matriz(places: list[Place]) -> list[list[float]]:
      """
      Construye una matriz NxN donde M[i][j] es la distancia en km de place[i] a place[j].
      
      Usa la Google Distance Matrix API con modo 'driving'.
      Si la API falla, lanza RuntimeError (el caller debe decidir si hacer fallback a haversine).
      """
      api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
      if not api_key:
          raise RuntimeError("GOOGLE_MAPS_API_KEY no configurada")

      # Construir strings de coordenadas para la API: "lat,lng|lat,lng|..."
      coords = "|".join(f"{p.coordinates.latitude},{p.coordinates.longitude}" for p in places)

      url = "https://maps.googleapis.com/maps/api/distancematrix/json"
      params = {
          "origins": coords,
          "destinations": coords,
          "mode": "driving",
          "units": "metric",
          "key": api_key,
      }

      response = requests.get(url, params=params, timeout=10)
      response.raise_for_status()
      data = response.json()

      if data.get("status") != "OK":
          raise RuntimeError(f"Distance Matrix API error: {data.get('status')}")

      n = len(places)
      # Convertir de metros a kilómetros
      matrix = [
          [
              data["rows"][i]["elements"][j]["distance"]["value"] / 1000
              if data["rows"][i]["elements"][j]["status"] == "OK"
              else places[i].distance_to(places[j])  # fallback a haversine si no hay ruta
              for j in range(n)
          ]
          for i in range(n)
      ]

      return matrix
  ```

- [ ] **Step 2: Modificar `backend/src/use_cases/genetic_algorithm/route.py`**

  Reemplazar el contenido completo:

  ```python
  """
  Representa una solución (cromosoma) del problema TSP.
  
  Un cromosoma es una permutación de los destinos. El fitness es inversamente
  proporcional a la distancia total: rutas más cortas tienen mayor fitness.
  """
  from domain import Place


  class Route:
      def __init__(
          self,
          route: list[Place],
          closed: bool = True,
          dist_matrix: list[list[float]] | None = None,
      ):
          self.route = route
          self.closed = closed
          # Matriz de distancias precomputada (opcional). Si es None, usa haversine.
          self._dist_matrix = dist_matrix
          self.fitness = self._calculate_fitness()

      def _get_distance(self, place_a: Place, place_b: Place) -> float:
          """
          Distancia entre dos lugares. Usa la matriz precomputada si está disponible.
          
          place_id es el índice string original ("0", "1", ...) — permite indexar la matriz
          incluso cuando la ruta es una permutación de los lugares originales.
          """
          if self._dist_matrix is not None:
              i, j = int(place_a.place_id), int(place_b.place_id)
              return self._dist_matrix[i][j]
          return place_a.distance_to(place_b)

      def _calculate_total_distance(self) -> float:
          """Suma de distancias entre paradas consecutivas. Si la ruta es cerrada, incluye el regreso."""
          if len(self.route) < 2:
              return 0.0

          total = sum(
              self._get_distance(self.route[i], self.route[i + 1])
              for i in range(len(self.route) - 1)
          )

          # Ruta cerrada: el último destino regresa al primero (ciclo hamiltoniano)
          if self.closed:
              total += self._get_distance(self.route[-1], self.route[0])

          return total

      def _calculate_fitness(self) -> float:
          """fitness = 1 / distancia_total. Mayor fitness = ruta más corta."""
          total = self._calculate_total_distance()
          return 1 / total if total > 0 else 0.0

      def copy(self) -> "Route":
          """Copia superficial que preserva la misma referencia a la matriz."""
          return Route(self.route[:], self.closed, self._dist_matrix)
  ```

- [ ] **Step 3: Modificar `backend/src/use_cases/genetic_algorithm/population.py`**

  ```python
  """Población inicial del GA: N permutaciones aleatorias de los destinos."""
  import random
  from domain import Place
  from .route import Route


  class Population:
      def __init__(
          self,
          places: list[Place],
          population_size: int,
          closed: bool = True,
          dist_matrix: list[list[float]] | None = None,
      ):
          self.routes = self._generate_population(places, population_size, closed, dist_matrix)

      def _generate_population(
          self,
          places: list[Place],
          population_size: int,
          closed: bool,
          dist_matrix: list[list[float]] | None,
      ) -> list[Route]:
          """Genera population_size rutas aleatorias como punto de partida del GA."""
          return [
              Route(random.sample(places, len(places)), closed, dist_matrix)
              for _ in range(population_size)
          ]

      def get_best_route(self) -> Route:
          """Retorna la ruta con mayor fitness (menor distancia) de la generación actual."""
          return max(self.routes, key=lambda r: r.fitness)
  ```

- [ ] **Step 4: Modificar `backend/src/use_cases/genetic_algorithm/crossover.py`**

  ```python
  """
  Order Crossover (OX): operador de cruce que preserva permutaciones válidas.
  
  Por qué OX y no cruce de un punto clásico:
  Un cruce de un punto en permutaciones produce hijos con destinos repetidos y
  otros faltantes (rutas inválidas). OX toma un segmento de parent1 y completa
  el resto con el orden relativo de parent2, garantizando que cada destino
  aparezca exactamente una vez en el hijo.
  """
  import random
  from .route import Route


  class OrderedCrossover:
      def crossover(self, parent1: Route, parent2: Route) -> Route:
          """
          Genera un hijo combinando un segmento aleatorio de parent1 con el
          orden de parent2 para los elementos restantes.
          """
          size = len(parent1.route)
          start, end = sorted(random.sample(range(size), 2))

          # Segmento heredado directamente de parent1
          child: list = [None] * size
          child[start:end] = parent1.route[start:end]

          # Completar con los places de parent2 que no están ya en el hijo,
          # en el orden en que aparecen en parent2
          remaining = [p for p in parent2.route if p not in child]
          pointer = 0
          for i in range(size):
              if child[i] is None:
                  child[i] = remaining[pointer]
                  pointer += 1

          # El hijo hereda el modo (cerrado/abierto) y la matriz de parent1
          return Route(child, parent1.closed, parent1._dist_matrix)
  ```

- [ ] **Step 5: Modificar `backend/src/use_cases/genetic_algorithm/genetic_algorithm.py`**

  ```python
  """
  Orquestador del algoritmo genético para TSP.
  
  Parámetros elegidos:
  - population_size=100: balance entre diversidad y tiempo de cómputo
  - generations=500: suficiente para convergencia con ≤15 destinos
  - mutation_rate=0.01: baja para no destruir buenas soluciones (exploración fina)
  - tournament_size=5: presión selectiva moderada
  - elitism=True: preserva la mejor solución entre generaciones
  """
  from domain import Place
  from .population import Population
  from .selection import TournamentSelection
  from .crossover import OrderedCrossover
  from .mutation import SwapMutation
  from .route import Route


  class GeneticAlgorithm:
      def __init__(
          self,
          population_size: int = 100,
          generations: int = 500,
          mutation_rate: float = 0.01,
          tournament_size: int = 5,
          elitism: bool = True,
      ):
          self.population_size = population_size
          self.generations = generations
          self.elitism = elitism
          self.selection = TournamentSelection(tournament_size=tournament_size)
          self.crossover = OrderedCrossover()
          self.mutation = SwapMutation(mutation_rate=mutation_rate)

      def run(
          self,
          places: list[Place],
          closed: bool = True,
          dist_matrix: list[list[float]] | None = None,
      ) -> Route:
          """
          Ejecuta el GA y retorna la mejor ruta encontrada.
          
          Si dist_matrix es None, usa haversine para calcular distancias.
          Si dist_matrix es una matriz NxN, usa distancias reales de carretera.
          """
          population = Population(places, self.population_size, closed, dist_matrix)
          best_route = population.get_best_route()

          for _ in range(self.generations):
              new_routes: list[Route] = []

              # Elitismo: copia el mejor individuo para no perderlo por azar
              if self.elitism:
                  new_routes.append(best_route.copy())

              while len(new_routes) < self.population_size:
                  parent1 = self.selection.select(population.routes)
                  parent2 = self.selection.select(population.routes)
                  child = self.crossover.crossover(parent1, parent2)
                  child = self.mutation.mutate(child)
                  new_routes.append(child)

              population.routes = new_routes
              generation_best = population.get_best_route()

              if generation_best.fitness > best_route.fitness:
                  best_route = generation_best

          return best_route
  ```

- [ ] **Step 6: Actualizar `backend/main.py` para usar la matriz**

  En la sección `# 5. Correr el algoritmo genético`, reemplazar:

  ```python
  # 5. Correr el algoritmo genético
  ga = GeneticAlgorithm()
  best_route = ga.run(places, closed=closed)
  ```

  Con:

  ```python
  # 5. Construir matriz de distancias y correr el GA
  # La matriz se precomputa una sola vez para evitar llamadas a la API por evaluación.
  dist_matrix = None
  try:
      from distance_matrix import construir_matriz
      dist_matrix = construir_matriz(places)
  except Exception as e:
      # Si la API falla, el GA usa haversine como fallback (menos preciso pero funcional)
      print(f"[WARN] Distance Matrix API falló, usando haversine: {e}")

  ga = GeneticAlgorithm()
  best_route = ga.run(places, closed=closed, dist_matrix=dist_matrix)
  ```

- [ ] **Step 7: Probar localmente con mock de la Distance Matrix API**

  Editar temporalmente `distance_matrix.py` para retornar una matriz de prueba y verificar que el GA usa la matriz correctamente. Luego revertir.

- [ ] **Step 8: Re-desplegar el backend**

  ```bash
  cd backend
  gcloud run deploy routes-optimizer \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "FIREBASE_PROJECT_ID=<ID>,GOOGLE_MAPS_API_KEY=<KEY>,ALLOWED_IPS="
  ```

- [ ] **Step 9: Agregar docstrings a `mutation.py` (no requiere cambios de lógica)**

  `SwapMutation.mutate()` ya funciona con `dist_matrix` porque usa `route.copy()` que lo propaga.
  Solo agregar documentación al inicio del archivo:

  ```python
  """
  Mutación por swap: intercambia dos posiciones aleatorias de la ruta.
  
  Cada posición tiene una probabilidad mutation_rate de ser intercambiada con otra
  posición aleatoria. Es simple y efectiva para TSP, aunque la inversión de segmentos
  (2-opt) converge mejor porque desenreda cruces de la ruta.
  
  La mutación opera sobre una copia (route.copy()) para no modificar el padre original.
  """
  ```

- [ ] **Step 10: Commit**

  ```bash
  git add backend/distance_matrix.py \
          backend/src/use_cases/genetic_algorithm/route.py \
          backend/src/use_cases/genetic_algorithm/population.py \
          backend/src/use_cases/genetic_algorithm/genetic_algorithm.py \
          backend/src/use_cases/genetic_algorithm/crossover.py \
          backend/src/use_cases/genetic_algorithm/mutation.py \
          backend/main.py
  git commit -m "feat(backend): integrate Distance Matrix API for real road distances in GA"
  ```
