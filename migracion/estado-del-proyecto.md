# RAPIDITO — Estado del proyecto (para retomar)

> Documento de contexto para el agente. Léelo junto con `AGENTS.md` y el
> `Prompt maestro para desarrollar RAPIDITO en OpenCode.md` (fuente de verdad).
> Generado durante la migración — fecha de corte: **2026-10-12**.

## Qué es

App de transporte tipo ride-hailing para **Quíbor, Lara, Venezuela**. Una sola app con
roles Pasajero y Conductor (a futuro, ambos roles en una cuenta). Producción:
<https://rapidito-virid.vercel.app/>

Flujo: ubicación → destino → precio estimado → negociación → conductores cercanos →
solicitud → conductor acepta → seguimiento en tiempo real → llegada → viaje → pago → calificación.

## Stack real (hoy)

- **Backend:** Node.js + **Express 5** + **Sequelize** + **SQLite** (`backend/database.sqlite`),
  **Socket.IO**, JWT (`jsonwebtoken`), `bcryptjs`, `express-validator`, `helmet`, `express-rate-limit`.
- **Frontend:** **Next.js 16.3.5** + React 19 + TypeScript + Tailwind 4 (app en `frontend/src/`),
  `axios`, `socket.io-client`, `jwt-decode`, `react-hot-toast`.
- **Stack objetivo** (§47 del Prompt maestro): NestJS + PostgreSQL + Prisma. **No migrar
  el backend sin indicación explícita.**

## Estructura

```
backend/
  server.js                      # arranque, asociaciones, middlewares de seguridad
  src/config/{database,socket}.js
  src/models/                    # User, PassengerProfile, DriverProfile, Ride, Negotiation,
                                 # Fare, DriverDocument, Rating, Notification, Zone, Route,
                                 # SystemConfig, Payment
  src/controllers/               # auth, rides, fares, ratings, documents, admin, notifications
  src/routes/                    # auth, rides, fares, ratings, documents, admin, notifications
  src/middleware/auth.js         # authenticateToken + requireRole
  src/seeders/initialData.js     # tarifas, zonas, config del sistema
  src/utils/sanitize.js
frontend/src/
  app/{page,login,register,dashboard}   # páginas
  components/Header.tsx
  contexts/AuthContext.tsx
  lib/api.ts
```

## Roles (enum `User.rol`)

`PASSENGER`, `DRIVER`, `ADMIN`, `SUPPORT`, `DOCUMENT_VERIFIER`, `SUPER_ADMIN`.

## Endpoints existentes (backend)

- **auth** `/api/auth`: `POST /register`, `POST /register-driver`, `POST /login`,
  `GET /profile`, `PUT /profile`
- **rides** `/api/rides`: `GET /nearby`, `POST /request`, `GET /my-rides`, `GET /:rideId`,
  `POST /:rideId/offer`, `POST /driver/{online,offline}`, `PUT /driver/location`,
  `POST /:rideId/accept`, `PUT /:rideId/status`, `POST /:rideId/counter`
- **fares** `/api/fares`: `GET /calculate`, `GET /`, `POST /`, `PUT /:fareId`
- **ratings** `/api/ratings`: `POST /`, `GET /user/:userId`
- **documents** `/api/documents`: `POST /upload`, `GET /my-documents`, `GET /pending`,
  `PUT /:documentId/verify`
- **admin** `/api/admin`: dashboard, users, rides, payments, config, zones, routes
  (todos con `requireRole`)
- **notifications** `/api/notifications`: listar, marcar leída/todas, eliminar
- Utilidades: `GET /health`, `GET /api/test/sanitize`, `GET /api/test/calculate-fare`

## Estado

- MVP en construcción (Fase 1 del Prompt maestro §62). Hay auth, perfiles, viajes,
  negociación, tarifas, documentos, admin y notificaciones a nivel de backend;
  el frontend tiene login, registro, dashboard y páginas base.
- La lógica crítica (tarifas, comisiones, saldos, estados, roles) vive en el backend. Mantenerlo así.

## Próximos pasos sugeridos

1. Completar UI del flujo de viaje (mapa origen/destino, ETA, seguimiento en tiempo real).
2. Negociación de tarifa end-to-end (ofertas/contraofertas) con Socket.IO.
3. Wallet/comisión/retiros del conductor (§32–34).
4. Panel admin completo y centro de verificación documental (§40, §44).
5. Cálculo de tarifa real con distance/duración (hoy hay una fórmula de prueba en `server.js`).
6. Tests de lógica crítica y migraciones/seed DEMO separados (§66).

## Decisiones tomadas en esta sesión (2026-10-06 → 2026-10-12)

- Se creó `AGENTS.md` en la raíz que referencia al *Prompt maestro* como fuente de verdad.
- Se instalaron los skills de OpenCode **caveman / ultracave / megacave** en
  `~/.config/opencode/skills/` (copiados también a `migracion/skills/`).
- Se generó este paquete de migración (`.gitignore`, `.env.example`, export de la sesión).

## Cómo retomar la sesión

- Importar: `bash migracion/importar-sesion.sh` (o `opencode import migracion/sesion/rapidito-sesion-export.json`).
- Alternativa legible: `migracion/sesion/transcripcion.md`.
