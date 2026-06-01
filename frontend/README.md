# RouteOpt — Frontend

Interfaz web para la optimización genética de rutas. Permite buscar destinos, seleccionar el modo de viaje y visualizar la ruta optimizada sobre un mapa interactivo de Google Maps con tema oscuro.

---

## Descripción general

La aplicación está construida con **React 19 + TypeScript + Vite**. Utiliza Firebase Authentication para la gestión de sesiones y se comunica con dos servicios de backend:

- **Backend local / propio**: búsqueda de lugares (`GET /places`)
- **Cloud Run (algoritmo genético)**: optimización de rutas (`POST /routes/optimize`)

### Funcionalidades

- Autenticación con Google via Firebase
- Búsqueda de destinos con autocompletado (debounce de 400 ms)
- Validación de radio máximo de 100 km entre destinos
- Selección de modo de viaje: auto, caminata, bicicleta, transporte público
- Ruta circular o abierta configurable
- Visualización en mapa con tema oscuro personalizado
- Marcadores numerados que se reordenan al optimizar
- Traza de la ruta real usando la Directions API de Google Maps
- Diseño responsivo: barra lateral tipo drawer en dispositivos móviles

---

## Requisitos

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- Proyecto de Firebase con Authentication habilitado (proveedor Google)
- Clave de la API de Google Maps con los siguientes servicios habilitados:
  - Maps JavaScript API
  - Places API
  - Directions API

---

## Variables de entorno

Crea un archivo `.env` en la raíz del frontend basándote en `.env.example`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_MAPS_API_KEY=
VITE_BACKEND_URL=              # URL del backend para búsqueda de lugares (ej: http://localhost:8000)
VITE_CLOUD_FUNCTION_URL=       # URL del servicio Cloud Run para optimización de rutas
```

> Todas las variables deben comenzar con `VITE_` para que Vite las exponga al cliente.

---

## Ejecución local

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Construcción para producción

```bash
pnpm build
```

Los archivos estáticos se generan en la carpeta `dist/`. Se pueden servir con cualquier servidor web estático (Firebase Hosting, Vercel, Nginx, etc.).

Para previsualizar el build localmente:

```bash
pnpm preview
```

---

## Estructura del proyecto

```
frontend/src/
├── components/
│   ├── Login/          # Pantalla de inicio de sesión
│   ├── MapView/        # Mapa de Google Maps con marcadores y trazado de ruta
│   ├── sidebar/        # Panel lateral con búsqueda, configuración y lista de destinos
│   └── TopBar/         # Barra superior con distancia total y botón de cierre de sesión
├── hooks/
│   ├── useAuth.ts      # Estado de autenticación de Firebase
│   └── useRoute.ts     # Lógica de llamada y estado de la optimización
├── pages/
│   ├── LoginPage.tsx   # Página de acceso
│   └── MainPage.tsx    # Página principal (mapa + sidebar)
├── services/
│   ├── api.ts          # Llamadas al backend y al Cloud Run
│   └── firebase.ts     # Inicialización de Firebase y helpers de auth
└── types/
    └── index.ts        # Tipos compartidos (Place, PlaceOption, RouteResult)
```

---

## Flujo de uso

1. El usuario inicia sesión con su cuenta de Google.
2. Busca y agrega entre 2 y 15 destinos desde la barra lateral.
3. Selecciona el modo de viaje y el tipo de ruta (circular u abierta).
4. Presiona **Optimize route**: el frontend envía los destinos al servicio Cloud Run, que ejecuta el algoritmo genético y retorna el orden óptimo.
5. El mapa muestra la ruta optimizada trazada con la Directions API de Google Maps y la distancia total en la barra superior.
