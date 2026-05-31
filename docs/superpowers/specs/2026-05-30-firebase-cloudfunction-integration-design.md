# Diseño: Integración Firebase Auth + Cloud Function

**Fecha:** 2026-05-30  
**Proyecto:** RoutesOptimization  
**Alcance:** Firebase Authentication (frontend) + despliegue del backend en Cloud Run + integración frontend↔backend

---

## Contexto

El frontend (React + Leaflet) y el backend (Python + GA) ya están implementados pero desconectados. La integración requiere:
1. Proteger la app con Firebase Auth (Google + Email/Password)
2. Desplegar el backend en Cloud Run (proyecto GCP `tough-electron-388917`)
3. Conectar el frontend al backend con Bearer token

---

## Arquitectura final

```
Usuario
  → Login (Google o Email/Password) → Firebase ID token (JWT)
  → Frontend React: agrega destinos en el mapa
  → Click "Optimizar ruta"
  → POST https://<cloud-run-url>/routes/optimize
      headers: { Authorization: Bearer <token> }
      body: { places: [...], closed: bool }
  → Backend Cloud Run:
      1. CORS
      2. Verificar token (firebase-admin)  → 401 si inválido
      3. Verificar IP (X-Forwarded-For)    → 403 si no permitida
      4. Validar inputs                    → 400 si inválido
      5. Construir matriz (Distance Matrix API)
      6. Correr GA
      7. Responder { orden, distancia_total_m }
  → Frontend: reordena marcadores, dibuja polilínea, muestra distancia
```

---

## Sección 1: Firebase Authentication

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `frontend/src/services/firebase.js` | Crear — init + helpers de auth |
| `frontend/src/components/Login.jsx` | Crear — UI de login |
| `frontend/src/App.tsx` | Modificar — gate de autenticación |
| `frontend/.env.example` | Modificar — agregar vars VITE_FIREBASE_* |

### `firebase.js`
- `initializeApp(firebaseConfig)` leyendo `import.meta.env.VITE_FIREBASE_*`
- Exporta: `auth`, `loginConGoogle()` (signInWithPopup), `loginConEmail(email, pass)`, `logout()`, `obtenerIdToken()` → `auth.currentUser.getIdToken()`

### `Login.jsx`
- Botón "Continuar con Google" → `signInWithPopup`
- Formulario email + password → `signInWithEmailAndPassword`
- Manejo de errores: mostrar mensaje legible en pantalla
- Usar `onClick`/`onChange`, no `<form>` con submit nativo

### Gate en `App.tsx`
```
useEffect → onAuthStateChanged(auth, setUser)
  loading=true mientras resuelve → spinner
  user === null → <Login />
  user !== null → mapa + botón "Cerrar sesión"
```

### Variables de entorno frontend
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_BACKEND_URL=
```

### Setup manual necesario (una sola vez)
1. Crear proyecto en Firebase Console (puede vincularse a `tough-electron-388917`)
2. Habilitar Authentication → proveedores: Google + Email/Password
3. Registrar Web App → copiar `firebaseConfig` → pegar en `frontend/.env`

---

## Sección 2: Backend — despliegue en Cloud Run

### Entry point
`main.py` ya existe. Necesita:
- Inicializar `firebase_admin` — en Cloud Run usa Application Default Credentials automáticamente (no requiere service account JSON si el proyecto Firebase = proyecto GCP `tough-electron-388917`). En local, apuntar a un archivo de credenciales con `GOOGLE_APPLICATION_CREDENTIALS`.
- Implementar el orden de validación completo (CORS → IP → token → inputs → GA)
- Leer `FIREBASE_PROJECT_ID`, `GOOGLE_MAPS_API_KEY`, `ALLOWED_IPS` de variables de entorno

### Variables de entorno backend
```
GOOGLE_MAPS_API_KEY=        ← nueva key, solo Distance Matrix API
FIREBASE_PROJECT_ID=        ← tough-electron-388917 (o el del proyecto Firebase)
ALLOWED_IPS=                ← IPs separadas por coma (Opción B)
```

### Despliegue
```bash
cd backend
gcloud run deploy routes-optimizer \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=...,GOOGLE_MAPS_API_KEY=...,ALLOWED_IPS=...
```
El flag `--allow-unauthenticated` es necesario porque la auth la maneja el código (Bearer token), no IAM.

### Restricción de IP (Opción B — en código)
```python
forwarded_for = request.headers.get("X-Forwarded-For", "")
client_ip = forwarded_for.split(",")[0].strip()
allowed = os.environ.get("ALLOWED_IPS", "").split(",")
if client_ip not in allowed:
    return ("Forbidden", 403)
```
Trade-off documentado: `X-Forwarded-For` puede falsificarse si se llega directo a Cloud Run sin pasar por el load balancer. Opción A (Cloud Armor) es más robusta.

---

## Sección 3: Integración frontend ↔ backend

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `frontend/src/services/cloudFunction.js` | Crear — wrapper del fetch al backend |
| `frontend/src/App.tsx` | Modificar — conectar botón "Optimizar" al servicio |
| `frontend/src/components/MapView.tsx` | Modificar — recibir ruta optimizada y dibujar polilínea |

### `cloudFunction.js`
```js
export async function calcularRuta(places, closed) {
  const token = await obtenerIdToken();
  const res = await fetch(import.meta.env.VITE_BACKEND_URL + '/routes/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ places, closed }),
  });
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`);
  return res.json();
}
```

### Flujo en `App.tsx`
1. Click "Optimizar ruta" → `setLoading(true)`
2. `calcularRuta(locations, closed)`
3. Recibe `{ orden, distancia_total_m }` → `setOptimizedRoute(orden)`
4. `MapView` re-renderiza con marcadores verdes en el orden recibido + polilínea

---

## Orden de implementación

1. **Firebase setup** (manual en consola) + `firebase.js` + `Login.jsx` + gate en `App.tsx` — commit
2. **`main.py`** — CORS + verificación de token + validaciones + GA + IP — commit
3. **Despliegue** del backend en Cloud Run — commit con URL en `.env.example`
4. **`cloudFunction.js`** + conexión en `App.tsx` + polilínea en `MapView.tsx` — commit
5. **`.env.example`** actualizado, README, audit de `.gitignore` — commit

---

## Checklist de seguridad

- [ ] `frontend/.env` en `.gitignore`
- [ ] `backend/.env` en `.gitignore`
- [ ] Ninguna API key en el código fuente
- [ ] `ALLOWED_IPS` en variable de entorno, no hardcodeada
- [ ] Firebase service account credentials nunca en el repo
