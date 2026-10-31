# RUTA RIDES — Arquitectura incremental (Fase 1)

> Objetivo: llegar a una app de movilidad funcional sobre el repositorio actual,
> sin reescribir el backend ni migrar de stack sin aprobación.
> Este documento define contratos y módulos antes de implementar.

---

## 1. Principios

1. **Incremental:** Express/Sequelize/SQLite se conservan. NestJS/PostgreSQL/Prisma
   siguen siendo objetivo, no requisito para esta fase.
2. **Backend como autoridad:** precio, estados, roles, radios y validaciones se
   calculan y validan en el servidor.
3. **Sin simulación:** si falta un proveedor (mapas, geocoding, routing), la UI muestra
   "configuración pendiente", nunca datos falsos.
4. **Contratos estables:** no se renombran tablas, columnas, enums, rutas ni eventos
   existentes. Las extensiones son aditivas.
5. **Mobile-first:** todo el flujo se diseña para pantalla de teléfono y se prueba en
   Chrome Android y emulador.

---

## 2. Arquitectura de módulos (backend actual, extendida)

```
backend/src/
  config/            database.js, socket.js
  models/            (existentes) + FavoritePlace, RideStop, FareQuote, DriverLocation
  controllers/       auth, rides, fares, ratings, documents, admin, notifications
                     + favorites, quotes, places (geocoding), tracking
  routes/            (existentes) + favorites, quotes, places
  services/          NUEVO
    fareEngine.js        cálculo y desglose (una sola fuente de verdad)
    routingService.js    adaptador RoutingProvider
    geocodingService.js  adaptador GeocodingProvider
    rideStateMachine.js  transiciones válidas y permisos por rol
    quoteService.js      creación/validación de cotizaciones
    availability.js      conductores en línea y radio
  middleware/        auth.js, validate.js (nuevo), rateLimits.js (nuevo)
  adapters/          NUEVO
    maps/            leaflet (frontend) + tiles configurables
    geocoding/       osm (dev), mapbox/google (prod)
    routing/         osrm (dev), graphhopper/mapbox (prod)
```

Frontend:

```
frontend/src/
  app/
    page.tsx                 Entrada: Soy pasajero / Soy conductor
    login, register
    passenger/               Mapa, solicitud, viaje, historial, favoritos
    driver/                  Disponibilidad, solicitudes, viaje, historial
    admin/                   Panel (fase 8)
  components/
    map/MapView.tsx          Leaflet + tiles OSM (configurable)
    map/PinPicker.tsx
    routing/RouteSummary.tsx
    places/PlaceSearch.tsx
    places/Favorites.tsx
    ride/ModalitySelector.tsx
    ride/FareBreakdown.tsx
    ride/DriverCard.tsx
    ride/RideStatus.tsx
  lib/
    api.ts
    socket.ts                cliente Socket.IO autenticado
    geo.ts                   distancia Haversine, formato
    types.ts                 tipos compartidos
  contexts/
    AuthContext.tsx          sesión + restauración validada
    LocationContext.tsx      GPS, permisos, watchPosition controlado
```

---

## 3. Modelo de datos (aditivo, sin romper lo existente)

### 3.1 `FavoritePlace` (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK users, index |
| label | ENUM('CASA','TRABAJO','OTRO') | |
| nombre | STRING | texto del usuario |
| direccion | STRING | dirección legible |
| lat, lng | FLOAT | coordenadas |
| createdAt, updatedAt | DATE | |

Índice único `(userId, label)` para CASA/TRABAJO; `OTRO` permite varios.

### 3.2 `Ride` (extender)

Campos nuevos (nullable, compatibles):

- `modalidad` ENUM('SOLO_IDA','IDA_VUELTA','MULTIPARADA') default 'SOLO_IDA'
- `quoteId` UUID (cotización aceptada)
- `distanciaRuta` FLOAT (km reales de routing)
- `duracionRuta` INTEGER (min reales)
- `moneda` STRING default 'USD'
- `precioFinal` DECIMAL(10,2) (además de `tarifaFinal` por compatibilidad)
- `canceladoPor` ENUM('PASAJERO','CONDUCTOR','SISTEMA') nullable
- `motivoCancelacion` STRING nullable

### 3.3 `RideStop` (nuevo)

| Campo | Tipo |
|---|---|
| id | UUID |
| rideId | UUID FK rides |
| orden | INTEGER |
| tipo | ENUM('RECOGIDA','PARADA','DESTINO','RETORNO') |
| direccion | STRING |
| lat, lng | FLOAT |

### 3.4 `FareQuote` (nuevo)

| Campo | Tipo |
|---|---|
| id | UUID |
| userId | UUID FK users |
| modalidad | ENUM |
| origenLat/Lng, destinoLat/Lng | FLOAT |
| stops | JSON (snapshot) |
| distanciaKm, duracionMin | FLOAT / INTEGER |
| desglose | JSON (base, km, min, paradas, espera, multiplicadores) |
| subtotal, total | DECIMAL(10,2) |
| moneda | STRING |
| fareId | UUID FK fares |
| expiraEn | DATE |
| creadaEn | DATE |

La cotización es inmutable. Al crear el viaje se valida contra el motor de tarifas.

### 3.5 `DriverLocation` (opcional, si no basta `DriverProfile`)

Para historial/auditoría de posiciones y evitar sobrecargar `driver_profiles`:

| Campo | Tipo |
|---|---|
| id | BIGINT |
| driverId | UUID FK users |
| lat, lng | FLOAT |
| precision | FLOAT |
| timestamp | DATE |
| rideId | UUID nullable |

Retención configurable; limpieza periódica.

---

## 4. Contratos de API (nuevos, aditivos)

### Favoritos

```
GET    /api/favorites
POST   /api/favorites            { label, nombre, direccion, lat, lng }
PUT    /api/favorites/:id
DELETE /api/favorites/:id
```

Todos autenticados; cada usuario solo ve los suyos.

### Lugares (proxy a proveedor)

```
GET /api/places/search?q=...&lat=&lng=     → [{ id, nombre, direccion, lat, lng }]
GET /api/places/reverse?lat=&lng=          → { direccion, lat, lng }
```

Si no hay proveedor configurado: `503 { error: "geocoding_not_configured" }`.
Nunca devolver direcciones inventadas.

### Cotización

```
POST /api/quotes
  { modalidad, origen:{lat,lng,direccion}, destino:{...}, stops:[...], esperaMin? }
  → { quoteId, distanciaKm, duracionMin, desglose, total, moneda, expiraEn }
```

- El servidor llama a `RoutingProvider` para distancia/duración reales.
- Si el routing falla: `503 routing_unavailable`, sin precio.
- El cliente **no** envía distancia, duración ni precio.

### Solicitud de viaje

```
POST /api/rides/request
  { quoteId, metodoPago }
```

- Se valida que la cotización exista, no esté vencida y pertenezca al usuario.
- Se recalcula el precio y se compara con la cotización (tolerancia 0).
- Se crea `Ride` + `RideStop` en transacción.

### Estados

```
PUT /api/rides/:rideId/status  { estado }
```

Validado por `rideStateMachine`:

```
REQUESTED → SEARCHING_DRIVER → DRIVER_ASSIGNED → DRIVER_EN_ROUTE
→ DRIVER_ARRIVED → TRIP_STARTED → TRIP_COMPLETED → PAYMENT_PENDING → COMPLETED
                                                        └→ CANCELLED
```

- Solo el rol y el actor correcto pueden ejecutar cada transición.
- Toda transición se registra con timestamp y actor.

---

## 5. Contrato Socket.IO (extendido, compatible)

Mantener eventos existentes y añadir validación:

| Dirección | Evento | Payload | Validación |
|---|---|---|---|
| C→S | `join-ride` | `rideId` | usuario participa en el viaje |
| C→S | `leave-ride` | `rideId` | idem |
| C→S | `update-location` | `{ rideId?, lat, lng, accuracy }` | rango geográfico, timestamp, rol, frecuencia |
| S→C | `location-updated` | `{ userId, lat, lng, timestamp }` | solo a la sala del viaje |
| S→C | `status-changed` | `{ rideId, estado }` | emitido por backend tras transición válida |
| S→C | `offer-received` | `{ rideId, offer }` | backend persiste primero |
| S→C | `ride-request` | `{ rideId, resumen }` | solo a conductores en línea del radio |

Reglas:

- `update-location` no reenvía datos del cliente sin validar.
- Los cambios de estado se originan en HTTP y el backend emite el evento; el cliente
  nunca emite `ride-status-changed`.
- Deduplicación por `(rideId, userId, timestamp)`.
- Salas privadas; sin difusión global.

---

## 6. Adaptadores de mapas (desacoplados)

```js
// services/routingService.js
module.exports = {
  getRoute: async ({ origin, destination, stops, modality }) => ({
    distanceKm, durationMin, geometry, provider
  })
}
```

- **Desarrollo:** Leaflet + tiles OSM + OSRM público (con caché y atribución).
- **Producción:** proveedor configurable por variables.
- Si falta `ROUTING_PROVIDER` o la clave: error explícito, sin fallback inventado.

Variables nuevas en `.env.example`:

```
MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
MAP_ATTRIBUTION=© OpenStreetMap contributors
GEOCODING_PROVIDER=osm
GEOCODING_API_KEY=
ROUTING_PROVIDER=osrm
ROUTING_API_KEY=
ROUTING_BASE_URL=https://router.project-osrm.org
```

---

## 7. Sesión persistente

Estado actual: JWT en `localStorage`, sin validación al cargar.

Plan incremental:

1. Al montar, llamar `GET /api/auth/profile` con el token guardado; si falla, limpiar
   y redirigir a login. (Corrige sesiones zombie.)
2. Añadir refresh token en cookie `HttpOnly; Secure; SameSite=Lax` cuando el entorno
   lo permita (HTTPS).
3. Access token corto (15 min) + refresh (7 días) con rotación y revocación.
4. Mantener compatibilidad: el header `Authorization: Bearer` sigue funcionando.

> Cambiar el contrato de auth afecta a clientes existentes. Se implementa en fase
> separada con pruebas y sin romper `/api/auth/login`.

---

## 8. Frontend: pantallas

1. `/` — entrada directa (logo, "Soy pasajero", "Soy conductor", iniciar sesión).
2. `/register?role=PASSENGER|DRIVER` — registro.
3. `/login` — login.
4. `/passenger` — mapa, "¿Pa' dónde vas?", origen/destino, favoritos, modalidad,
   cotización, solicitar.
5. `/passenger/ride/[id]` — seguimiento, conductor, estados.
6. `/passenger/history` — historial.
7. `/driver` — disponibilidad, GPS, solicitudes entrantes.
8. `/driver/ride/[id]` — navegación, llegada, inicio/fin.
9. `/admin` — panel (fase 8).

Protección de rutas: componente `RequireAuth` que valida sesión y rol.

---

## 9. Despliegue

| Componente | Destino | Notas |
|---|---|---|
| Frontend Next.js | Vercel | HTTPS, previews, variables |
| Backend Express + Socket.IO | Railway / Render / Fly.io / VPS | Proceso persistente obligatorio |
| Base de datos | SQLite local (dev) → PostgreSQL gestionado (staging/prod) | Migración con backup |
| Mapas | Tiles OSM / proveedor | Variables de entorno |
| Geocoding/Routing | OSM/OSRM (dev) → proveedor (prod) | Claves fuera del repo |

Vercel **no** aloja Socket.IO persistente ni SQLite persistente. No se desplegará ahí
el backend.

---

## 10. Android

1. Emulador Android Studio con Google APIs.
2. Backend local accesible vía `http://10.0.2.2:<puerto>` desde el emulador.
3. Alternativa: túnel HTTPS (ngrok/cloudflared) para probar geolocalización real,
   que exige contexto seguro.
4. Pruebas: GPS concedido/denegado, precisión baja, GPS apagado, rotación, teclado,
   pérdida de red, reconexión, sesión persistente.
5. PWA: manifest, iconos, theme color; service worker solo con caché segura.

---

## 11. Plan por fases y criterios de aceptación

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| 0 | `BASELINE-AUDIT.md` | Diagnóstico con evidencia (hecho) |
| 1 | `ARCHITECTURE.md` | Contratos y modelos definidos (este documento) |
| 2 | Acceso y sesión | Login/registro, restauración validada, rutas protegidas, build y lint verdes |
| 3 | Mapa y GPS | Permiso real, posición real, fallback manual, búsqueda y ruta reales |
| 4 | Favoritos y modalidades | CRUD persistente; ida, ida/vuelta y multiparada con recálculo |
| 5 | Tarifador | Cotización backend con routing, desglose, vigencia y tests |
| 6 | Viajes y tracking | Solicitud validada, estados, Socket.IO, seguimiento y reconexión |
| 7 | Conductor | Disponibilidad, GPS, solicitudes, navegación, historial |
| 8 | Admin | Tarifas, zonas, usuarios, viajes y auditoría |
| 9 | Android/QA | Emulador + Chrome Android, reporte de pruebas |
| 10 | Staging | Frontend + backend persistente + DB + HTTPS |

---

## 12. Riesgos y mitigaciones

- **Sin commits:** crear commit base antes de cambios (aprobación requerida).
- **SQLite en serverless:** no usar; PostgreSQL para staging.
- **Sin claves de mapas:** desarrollo con OSM/OSRM; producción requiere decisión.
- **Cambios de auth:** implementar con compatibilidad y pruebas.
- **Datos reales:** no usar datos personales en staging.
- **Tracking en segundo plano:** limitación de PWA; documentar y evaluar Capacitor.
