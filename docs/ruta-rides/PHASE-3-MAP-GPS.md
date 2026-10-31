# RUTA RIDES — Fase 3: GPS, mapa, lugares y rutas

- **Fecha:** 2026-10-30
- **Alcance:** ubicación real del navegador, mapa interactivo, búsqueda de lugares,
  ruta real por calles y estimación de tarifa calculada en el backend.

---

## 1. Backend

### Servicios nuevos

| Archivo | Función |
|---|---|
| `src/services/geocodingService.js` | Búsqueda y geocodificación inversa vía Nominatim/OSM, con caché de 5 min, timeout, idioma `es` y sesgo por ubicación. |
| `src/services/routingService.js` | Ruta real vía OSRM: distancia, duración y geometría GeoJSON. Caché de 2 min. |
| `src/services/fareEngine.js` | Cálculo único de tarifa: base + km + minuto, recargo nocturno, demanda y mínimo. |

### Endpoints nuevos

```text
GET  /api/places/search?q=...&lat=...&lng=...   → { results: Place[] }
GET  /api/places/reverse?lat=...&lng=...        → { place: Place }
POST /api/routes/preview                        → { route, fare, fareError }
```

`POST /api/routes/preview` recibe solo coordenadas:

```json
{
  "origin": { "lat": 9.9287, "lng": -69.6222 },
  "destination": { "lat": 9.9258, "lng": -69.6208 },
  "stops": [],
  "tipo": "URBANA"
}
```

El cliente **no** envía distancia, duración ni precio.

### Reglas aplicadas

- Los tres endpoints requieren JWT.
- Rate limit propio: 40 peticiones/minuto por IP.
- Coordenadas validadas en rango; máximo 5 paradas.
- Si el proveedor no está configurado: `503 geocoding_not_configured` o
  `routing_not_configured`. Nunca se inventan direcciones, rutas ni precios.
- La tarifa se calcula con la tabla `fares` activa. Si no existe: `fare: null` y
  `fareError`.

### Variables nuevas

```text
GEOCODING_PROVIDER=osm
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org
GEOCODING_API_KEY=
GEOCODING_USER_AGENT=RutaRides/0.1 (soporte@rutarides.local)
GEOCODING_COUNTRY_CODES=ve
GEOCODING_TIMEOUT_MS=8000

ROUTING_PROVIDER=osrm
ROUTING_BASE_URL=https://router.project-osrm.org
ROUTING_API_KEY=
ROUTING_TIMEOUT_MS=8000
```

Documentadas en `backend/.env.example`.

---

## 2. Frontend

### GPS real

- `LocationContext` con estados: `idle`, `requesting`, `granted`, `denied`,
  `unavailable`, `timeout`, `unsupported`.
- Usa `navigator.geolocation.getCurrentPosition` con alta precisión.
- Detecta contexto no seguro (`isSecureContext`) y explica que hace falta HTTPS.
- Fallback manual: fijar origen tocando el mapa.

### Mapa

- Leaflet 1.9.4 + React Leaflet 5 + tiles de OpenStreetMap.
- Carga solo en cliente (`dynamic` con `ssr: false`).
- Marcadores propios: origen rojo, destino negro.
- Ruta dibujada como polilínea roja.
- Ajuste automático de encuadre al origen y destino.
- Botón de ubicación, zoom y atribución de OpenStreetMap.

### Pantalla `/passenger`

- Guard de rol (`PASSENGER`, `ADMIN`, `SUPER_ADMIN`).
- Mapa + panel inferior en móvil, dos columnas en escritorio.
- Origen: GPS o punto en el mapa.
- Destino: búsqueda con resultados o punto en el mapa.
- Geocodificación inversa para mostrar la dirección del punto elegido.
- Resumen de distancia, tiempo y tarifa estimada con desglose.
- Estado explícito: “La solicitud con conductor se habilita en la siguiente fase”.
- Sin viajes, conductores ni tarifas simuladas.

### Navegación

- `roleHome('PASSENGER')` ahora es `/passenger`.
- Login de pasajero aterriza directo en el mapa.
- Header con enlace “Viajar”.
- Panel del pasajero enlaza a “Abrir mapa”.

### Variables nuevas (frontend)

```text
NEXT_PUBLIC_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
NEXT_PUBLIC_MAP_DEFAULT_LAT=9.9287
NEXT_PUBLIC_MAP_DEFAULT_LNG=-69.6222
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=14
```

Centro por defecto: Quíbor, Lara.

---

## 3. Evidencia

### Backend

```text
GET  /api/places/search?q=Plaza Bolivar Quibor&lat=10.0458&lng=-69.3653
→ 200, Plaza Bolívar, Quíbor, Estado Lara

GET  /api/places/reverse?lat=10.0458&lng=-69.3653
→ 200, dirección real de OpenStreetMap

POST /api/routes/preview
→ 200, distanceKm 1.95, durationMin 3.6, geometría LineString, tarifa calculada

GET  /api/places/search sin token
→ 401

POST /api/routes/preview con lat 999
→ 400 invalid_coordinates
```

### Frontend

```text
npm run lint  → limpio
npm run build → compila; ruta /passenger incluida
```

Pruebas en navegador real:

| Caso | Resultado |
|---|---|
| Abrir `/passenger` con sesión | Mapa de Quíbor con tiles OSM |
| Permiso de ubicación denegado | Mensaje claro y fallback manual |
| “Elegir en el mapa” + toque | Origen fijado y geocodificado a “Quíbor” |
| Buscar “Plaza Bolivar Quibor” | Resultado real de OSM |
| Seleccionar destino | Ruta 410 m, 1 min, polilínea roja y 2 marcadores |
| Tarifa | `USD 1,31` con desglose base/distancia/tiempo |
| Consola | Sin errores de aplicación |

---

## 4. Pendiente

- **Solicitud de viaje:** botón deshabilitado hasta la fase 6 (estados, conductor,
  Socket.IO).
- **Favoritos y modalidades:** fase 4.
- **Cotización persistida:** fase 5; hoy la estimación se recalcula en cada ruta.
- **Proveedores de producción:** Nominatim público y OSRM público son de desarrollo.
  Producción requiere proveedor con SLA y claves.
- **Geolocalización en Android:** requiere HTTPS o `localhost`/`10.0.2.2`. El emulador
  debe tener ubicación configurada.
- **Pruebas en móvil real:** pendientes de emulador Android y Chrome Android.
- **Tiles OSM:** cuotas y política de uso a revisar antes de producción.
- **Dependencias:** `npm audit` reporta 6 vulnerabilidades (5 altas, 1 crítica).
  En producción son 4 (3 altas, 1 crítica). La crítica es un RCE en `next/og`
  (`ImageResponse`), que esta app no usa. Recomendado subir Next.js de `16.3.5` a
  `16.4.3` y revisar `sharp`, `source-map-js` y `follow-redirects` antes de producción.
