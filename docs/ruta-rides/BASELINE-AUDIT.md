# RUTA RIDES — Auditoría base (Fase 0)

- **Fecha:** 2026-10-30
- **Repositorio:** `/Users/richardsilva/Documents/09. Rapidito`
- **Rama:** `main`
- **Commits:** 0 (árbol completo sin versionar; ver §1)
- **Node:** v22.23.3 · **npm:** 10.9.9
- **Next.js instalado:** 16.3.5 · **React:** 19.2.8
- **Backend:** Express 5.2.1 · Sequelize 6.37.8 · SQLite 6.0.1 · Socket.IO 4.8.3

> Esta auditoría se hizo sobre el código real, con ejecución de
> `lint`, `build`, arranque del backend y llamadas HTTP a los endpoints.
> No se modificó ninguna funcionalidad durante la auditoría.

---

## 1. Estado del control de versiones

- El repositorio existe (`.git`) pero **no tiene ningún commit**.
- `git status` muestra todo como `untracked`.
- No hay remoto configurado.
- **Riesgo alto:** cualquier cambio no tiene punto de retorno ni historial.
- **Acción recomendada:** crear un commit base antes de tocar código
  (requiere aprobación porque incluye binarios, base de datos y `.env`).

---

## 2. Resultado de los comandos base

| Comando | Resultado |
|---|---|
| `node --check` en todo `backend/src` y `server.js` | OK (sin errores de sintaxis) |
| `npm run lint` (frontend) | **Falla**: 7 errores + 4 advertencias |
| `npm run build` (frontend) | **Falla**: `/register` usa `useSearchParams()` sin `<Suspense>` |
| `npm run test` (backend) | Placeholder (`exit 1`); **no hay tests** |
| Arranque backend local | OK en puerto alterno 3101 |
| `GET /health` | OK |
| `GET /api/fares` | OK (3 tarifas) |
| `POST /api/auth/login` | OK (3 usuarios demo) |
| `GET /api/rides/nearby` | OK (1 conductor en línea) |
| `GET /api/rides/my-rides` | OK |
| `GET /api/admin/dashboard` | OK con rol ADMIN |
| `GET /api/admin/dashboard` con rol PASSENGER | 403 (RBAC correcto) |
| `POST /api/documents/upload` | **500** (bug confirmado) |

### Errores de lint (frontend)

- `AuthContext.tsx`: 4 × `@typescript-eslint/no-explicit-any`.
- `AuthContext.tsx`: `react-hooks/set-state-in-effect` (setState dentro de `useEffect`).
- `dashboard/page.tsx`: `react-hooks/immutability` (`loadData` usada antes de declararse).
- Advertencias: variables `error` sin uso, `window.location.href` para navegación interna.

### Fallo de build

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/register".
Error occurred prerendering page "/register"
```

Causa: `frontend/src/app/register/page.tsx` usa `useSearchParams()` sin `Suspense`.
Consecuencia: **el frontend no compila para producción hoy**.

---

## 3. Inventario real

### Backend

- 13 modelos Sequelize: `User`, `PassengerProfile`, `DriverProfile`, `Ride`,
  `Negotiation`, `Fare`, `DriverDocument`, `Rating`, `Notification`, `Zone`,
  `Route`, `SystemConfig`, `Payment`.
- 7 grupos de rutas: `auth`, `rides`, `fares`, `ratings`, `documents`, `admin`,
  `notifications`.
- Middleware JWT (`authenticateToken`) y RBAC (`requireRole`).
- Rate limiting global y específico en login.
- `helmet`, CORS abierto (`origin: "*"`).
- Socket.IO con autenticación por JWT en el handshake y salas `ride-<id>`.

### Frontend

- 4 páginas: `/` (landing), `/login`, `/register`, `/dashboard`.
- `AuthContext` con token y usuario en `localStorage`.
- Cliente Axios con interceptor 401.
- Header, Tailwind 4, toasts.

### Datos actuales (SQLite)

| Tabla | Filas |
|---|---|
| users | 3 |
| passenger_profiles | 1 |
| driver_profiles | 1 |
| rides | 1 (COMPLETED, de prueba) |
| fares | 3 |
| zones | 2 |
| system_configs | 15 |
| negotiations / ratings / payments / documents / notifications | 0 |

Usuarios demo existentes (coinciden con los de la pantalla de login):

- `jose@test.com` / PASSENGER
- `carlos@test.com` / DRIVER
- `admin@rapidito.com` / ADMIN

---

## 4. Clasificación: real, incompleto, simulado, bloqueado

### ✅ Real y verificado

- Registro de pasajero y de conductor vía API (validación y hash bcrypt).
- Login y emisión de JWT (7 días).
- Middleware de autenticación y autorización por rol.
- Listado de tarifas configuradas.
- Búsqueda de conductores en línea por bounding box y distancia aproximada.
- Listado de viajes del usuario.
- Dashboard admin con métricas reales de la base.
- Socket.IO operativo del lado servidor, con JWT en el handshake.

### 🟡 Incompleto (existe, pero no cumple el objetivo)

- **Sesión persistente:** se restaura desde `localStorage`, pero sin validar el token
  contra el backend al cargar, sin refresh, sin revocación. Vulnerable a XSS.
- **Tarifador:** existe `GET /api/fares/calculate`, pero recibe `distancia` y `duracion`
  desde el query del cliente. No hay routing real, ni cotización persistida, ni
  desglose por modalidad, ni decimales controlados.
- **Tarifas:** `Fare` usa `FLOAT` y la fórmula es lineal. No hay vigencia, versión ni auditoría.
- **Viajes:** `POST /api/rides/request` acepta `tarifaBase`, `precioOfrecido` y `distancia`
  desde el cliente y no los valida ni recalcula.
- **Estados de viaje:** `PUT /api/rides/:rideId/status` acepta cualquier `estado`
  enviado por el cliente; no hay máquina de estados ni transiciones permitidas.
- **Negociación:** crea ofertas/contraofertas, pero no valida límites, expiración,
  contra-oferta activa ni cierre del acuerdo.
- **Documentos:** el "upload" solo guarda una URL recibida en el body. No hay subida
  real de archivos, ni almacenamiento, ni validación de imagen.
- **Notificaciones:** CRUD básico; no se emiten desde los eventos de viaje.
- **Admin:** API completa, sin interfaz. Sin auditoría de cambios.
- **Calificaciones:** funcionan, pero no actualizan contadores ni bloquean dobles.
- **Perfil:** `PUT /api/auth/profile` permite actualizar `rol` y otros campos sin
  lista blanca (escalada de privilegios potencial).
- **Dashboard frontend:** muestra "4.9 ⭐" hardcodeado y botones sin acción.
- **Identidad:** todo el frontend usa naranja `#FF6B00` y marca "RAPIDITO".
  El logo y la paleta de RUTA RIDES (morado `#7026BF`) no están aplicados.

### 🔴 Simulado o inexistente

- **GPS:** cero código de `navigator.geolocation` en frontend o backend.
- **Mapas:** cero integración (Leaflet, MapLibre, Mapbox, Google). Sin tiles ni marcadores.
- **Geocoding / routing:** no existe. Ningún adaptador, ninguna clave, ninguna llamada.
- **Favoritos:** no hay modelo, tabla ni endpoints.
- **Modalidades de viaje** (solo ida, ida y vuelta, multiparada): no existen en modelo
  ni en UI. `Ride` solo tiene un origen y un destino.
- **PWA / manifest / iconos RUTA RIDES:** no existe.
- **Panel admin visual:** no existe.
- **Pagos:** solo el modelo `Payment`; ningún flujo.
- **Tracking en tiempo real desde el cliente:** el servidor emite eventos, pero
  ningún cliente se conecta ni envía ubicación.
- **Business stats en landing:** "100+ viajes", "50+ conductores", "4.9⭐" son ficticios.

### ⛔ Bloqueado (requiere decisión o cuenta externa)

- **Proveedor de mapas/tiles:** se puede iniciar sin clave con Leaflet + OSM, pero
  producción requiere revisar cuotas, atribución y términos.
- **Geocoding/routing de producción:** Nominatim público no es API de producción.
  Falta elegir proveedor (OSRM/GraphHopper/Mapbox/Google) y obtener clave.
- **Hosting del backend persistente:** Railway / Render / Fly.io / VPS. Requiere cuenta.
- **PostgreSQL gestionado** si se abandona SQLite para staging/producción.
- **Android Studio Emulator** instalado en la máquina de desarrollo.

---

## 5. Hallazgos de seguridad

| Severidad | Hallazgo | Evidencia |
|---|---|---|
| 🔴 Alta | `PUT /api/auth/profile` actualiza `rol`, `activo`, `verificado` sin lista blanca | `authController.updateProfile` |
| 🔴 Alta | `GET /api/rides/:rideId` no valida que el usuario participe en el viaje (IDOR) | `rideController.getRideById` |
| 🔴 Alta | `PUT /api/rides/:rideId/status` acepta cualquier estado del cliente | `rideController.updateRideStatus` |
| 🔴 Alta | `POST /api/rides/request` confía en tarifa/distancia del cliente | `rideController.requestRide` |
| 🟠 Media | Token JWT en `localStorage` (XSS) sin refresh ni revocación | `AuthContext.tsx`, `api.ts` |
| 🟠 Media | CORS `origin: "*"` también en Socket.IO | `server.js`, `socket.js` |
| 🟠 Media | Eventos Socket.IO confían en payload del cliente y no verifican pertenencia al viaje | `socket.js` |
| 🟠 Media | `GET /api/rides/nearby` y `GET /api/ratings/user/:id` son públicos | rutas |
| 🟠 Media | Sin auditoría de cambios de tarifas/config/roles | admin |
| 🟡 Baja | `uuid` se importa pero no está declarado en `package.json` (dependencia transitiva) | `authController.js` |
| 🟡 Baja | `Op` no importado en `documentController` → 500 | `documentController.js:11` |

---

## 6. Respuestas a las 10 preguntas de la Fase 0

1. **Qué funciona hoy:** auth (registro/login/JWT/RBAC), tarifas (consulta y cálculo
   básico), búsqueda de conductores en línea, viajes (crear/aceptar/listar/estado),
   negociación (crear ofertas), calificaciones, notificaciones, documentos (registro
   por URL), dashboard admin por API, Socket.IO servidor.
2. **Qué está simulado o incompleto:** dashboard con métricas ficticias, landing con
   estadísticas inventadas, documentos sin archivo real, tarifador sin routing,
   estados de viaje sin máquina de estados, negociación sin cierre, sin pagos.
3. **¿GPS funciona realmente?** No. No hay una sola llamada a `navigator.geolocation`.
4. **¿Mapas, geocoding y routing?** No existen. Cero dependencias y cero código.
5. **¿Cómo se calcula el precio?** `GET /api/fares/calculate?distancia=&duracion=&tipo=`
   con fórmula lineal `base + km*precioKm + min*precioMin`, mínimo y multiplicadores
   nocturno/demanda. La distancia y duración las envía el cliente.
6. **¿La sesión persiste?** Sí, en `localStorage`, pero sin validación contra backend,
   sin refresh y sin revocación. Persiste al recargar, no es segura.
7. **¿Socket.IO funciona en el entorno actual?** Sí, el servidor arranca y autentica
   el handshake. Pero no hay cliente que lo use y los eventos no se validan ni persisten.
8. **¿La base de datos puede persistir en el hosting propuesto?** Hoy SQLite en disco
   local. En Vercel (serverless) **no** es persistente. Para staging/producción hace
   falta PostgreSQL gestionado o un backend con volumen persistente.
9. **¿Qué se necesita para probar Android?** Android Studio + emulador, URL accesible
   desde el emulador (`10.0.2.2` para el host o túnel HTTPS), permisos de ubicación,
   Chrome Android y sesión persistente.
10. **Arquitectura de staging recomendada:** Next.js en Vercel, Express + Socket.IO en
    un host persistente (Railway/Render/Fly.io/VPS), PostgreSQL gestionado, mapas y
    routing por variables de entorno, HTTPS en ambos. Faltan: cuentas, claves y
    decisión de proveedor.

---

## 7. Brechas frente al objetivo RUTA RIDES

| Requisito del prompt maestro | Estado |
|---|---|
| Pantalla inicial con "Soy pasajero" / "Soy conductor" | ❌ (hay landing) |
| Restauración y persistencia segura de sesión | 🟡 (localStorage) |
| GPS real con permisos y fallback manual | ❌ |
| Mapa interactivo y marcadores | ❌ |
| Geocoding y routing reales | ❌ |
| Favoritos persistentes | ❌ |
| Modalidades (ida, ida/vuelta, multiparada) | ❌ |
| Tarifador backend con desglose y vigencia | 🟡 |
| Solicitud con validación y máquina de estados | 🟡 |
| Seguimiento en tiempo real | 🟡 (servidor) |
| Experiencia de conductor | ❌ |
| Admin visual | ❌ |
| PWA / Android | ❌ |
| Branding RUTA RIDES (morado, logo) | ❌ |
| Tests automatizados | ❌ |

---

## 8. Conclusión

El proyecto tiene una **base funcional de backend** (auth, RBAC, viajes, tarifas,
admin) y un **frontend de demostración** que no compila para producción.
No existe la capa de movilidad real: GPS, mapas, geocoding, routing, favoritos,
modalidades ni seguimiento desde el cliente.

La prioridad no es rediseñar: es **corregir la base**, **conectar datos reales** y
**construir el flujo de viaje completo** sobre lo que ya existe.

---

## 9. Evidencia

Comandos ejecutados y resultados clave:

```text
npm run lint   → 11 problems (7 errors, 4 warnings)
npm run build  → useSearchParams() should be wrapped in a suspense boundary at page "/register"
GET  /health                       → 200 {"status":"OK"}
GET  /api/fares                    → 200 (3 tarifas)
POST /api/auth/login               → 200 (token)
GET  /api/rides/nearby             → 200 (1 conductor, 0.28 km)
GET  /api/rides/my-rides           → 200 (1 viaje)
GET  /api/admin/dashboard (ADMIN)  → 200
GET  /api/admin/dashboard (PASS.)  → 403
POST /api/documents/upload         → 500
```
