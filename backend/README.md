# RouteOpt — Backend

API REST para optimización de rutas mediante un **algoritmo genético**, desplegada en **Google Cloud Run**. Recibe una lista de destinos y un modo de viaje, construye la matriz de distancias con la API de Google Maps Distance Matrix y retorna el orden óptimo junto con la distancia total estimada.

---

## Descripción general

El backend implementa una arquitectura en capas inspirada en Clean Architecture:

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Dominio | `src/domain` | Entidades `Place` y `Coordinates` con lógica de distancia Haversine |
| Casos de uso | `src/use_cases` | Algoritmo genético (selección por torneo, cruce ordenado OX, mutación por swap) |
| Infraestructura | `src/infrastructure` | Cliente de Distance Matrix API, verificación de tokens Firebase |
| Presentación | `src/presentation` | API HTTP con FastAPI, DTOs, middleware de restricción por IP |

### Algoritmo genético

- **Población inicial**: permutaciones aleatorias de los destinos
- **Selección**: torneo binario con tamaño configurable
- **Cruce**: Order Crossover (OX)
- **Mutación**: intercambio aleatorio de dos genes (swap)
- **Elitismo**: el mejor individuo siempre pasa a la siguiente generación
- **Función de aptitud**: inverso de la distancia total de la ruta

La distancia entre destinos se obtiene de la API de Google Maps Distance Matrix, lo que asegura distancias reales de viaje en lugar de distancias en línea recta.

---

## Requisitos

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (gestor de paquetes y entornos)
- Cuenta de Google Cloud Platform con los siguientes servicios habilitados:
  - Maps Distance Matrix API
  - Cloud Run
- Proyecto de Firebase con Authentication habilitado

---

## Variables de entorno

Crea un archivo `.env` en la raíz del backend basándote en `.env.example`:

```env
GOOGLE_MAPS_API_KEY=       # Clave de la API de Google Maps
FIREBASE_PROJECT_ID=       # ID del proyecto de Firebase
GOOGLE_APPLICATION_CREDENTIALS=./ruta-al-service-account.json  # Solo para ejecución local
ALLOWED_IPS=               # IPs permitidas separadas por coma (vacío = sin restricción)
```

> En producción (Cloud Run), `GOOGLE_APPLICATION_CREDENTIALS` no es necesaria; el SDK de Firebase usa las credenciales del servicio de forma automática.

---

## Ejecución local

```bash
# Instalar dependencias
uv sync

# Iniciar el servidor en modo desarrollo
uv run uvicorn src.presentation.app:app --reload --port 8000
```

La API estará disponible en `http://localhost:8000`.  
La documentación interactiva (Swagger UI) en `http://localhost:8000/docs`.

---

## Endpoints

### `POST /routes/optimize`

Optimiza el orden de visita de una lista de destinos.

**Autenticación**: Bearer token de Firebase (header `Authorization`).

**Body:**
```json
{
  "places": [
    {
      "place_id": "0",
      "name": "Destino A",
      "latitude": 14.634,
      "longitude": -90.506
    }
  ],
  "closed": true,
  "travel_mode": "driving"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `places` | array | Entre 2 y 15 destinos. Ningún par puede superar 100 km entre sí. |
| `closed` | boolean | `true` = ruta circular (regresa al origen), `false` = ruta abierta |
| `travel_mode` | string | `driving`, `walking`, `bicycling` o `transit` |

**Respuesta:**
```json
{
  "route": [
    { "place_id": "0", "name": "Destino A", "order": 1 }
  ],
  "total_distance_km": 12.5
}
```

### `GET /places?query=<texto>`

Busca lugares usando la API de Google Maps Places.

---

## Despliegue en Cloud Run

Asegúrate de tener `gcloud` instalado y configurado con tu proyecto.

```bash
./deploy.sh
```

El script lee las variables desde `.env`, valida que las obligatorias estén presentes y ejecuta `gcloud run deploy`. Al finalizar, Cloud Run proporciona la URL pública del servicio.

### Restricción de IPs

El middleware de la aplicación rechaza con `403 Forbidden` cualquier solicitud cuya IP de origen no esté en la lista `ALLOWED_IPS`. Para configurarlo en producción sin redesplegar:

```bash
gcloud run services update optimize-routes \
  --region us-central1 \
  --set-env-vars ALLOWED_IPS=1.2.3.4,5.6.7.8
```

Para obtener tu IP pública actual:

```bash
curl ifconfig.me
```

---

## Estructura del proyecto

```
backend/
├── src/
│   ├── domain/
│   │   └── entities.py          # Place, Coordinates
│   ├── use_cases/
│   │   └── genetic_algorithm/   # Algoritmo genético completo
│   ├── infrastructure/
│   │   ├── auth/                # Verificación de tokens Firebase
│   │   ├── repository/          # Repositorio de Places (Maps API)
│   │   └── services/            # Distance Matrix Service
│   └── presentation/
│       ├── controllers/         # Rutas HTTP
│       ├── dtos/                # Esquemas de request/response
│       ├── dependencies.py      # Inyección de dependencias (auth)
│       └── app.py               # FastAPI app + middleware
├── main.py                      # Punto de entrada para Cloud Run
├── Procfile                     # Comando de inicio para Cloud Run
├── deploy.sh                    # Script de despliegue
└── pyproject.toml               # Dependencias del proyecto
```
