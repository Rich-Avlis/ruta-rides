# RAPIDITO — Contexto completo para continuar en otra máquina

> Documento único y autosuficiente. Pégalo como contexto en OpenCode (o cualquier agente)
> al abrir el proyecto en la nueva computadora.
> Fuente de verdad extendida: `Prompt maestro para desarrollar RAPIDITO en OpenCode.md` (raíz del repo).

---

## 1. Qué es el proyecto

Aplicación de transporte tipo ride-hailing para **Quíbor, estado Lara, Venezuela**.
Una sola app con dos roles iniciales: **Pasajero** y **Conductor**. La arquitectura debe
permitir que en el futuro una misma cuenta tenga ambos roles y pueda cambiar entre ellos.

Producción: <https://rapidito-virid.vercel.app/>

Flujo principal:
**Ubicación → Destino → Precio estimado → Negociación → Conductores cercanos → Solicitud →
Conductor acepta → Seguimiento en tiempo real → Llegada → Viaje → Pago → Calificación.**

Objetivo: arquitectura profesional, escalable, segura y preparada para crecer desde Quíbor
a otras ciudades de Venezuela.

---

## 2. Stack

### Stack real (lo que existe hoy)

- **Backend:** Node.js + **Express 5** + **Sequelize** + **SQLite** (`backend/database.sqlite`),
  **Socket.IO**, **JWT** (`jsonwebtoken`), `bcryptjs`, `express-validator`, `helmet`,
  `express-rate-limit`, `cors`, `dotenv`.
- **Frontend:** **Next.js 16.3.5** + React 19 + TypeScript + **Tailwind 4**, `axios`,
  `socket.io-client`, `jwt-decode`, `react-hot-toast`, `react-icons`.

### Stack objetivo (según el Prompt maestro §47)

- Backend: NestJS + TypeScript
- DB: PostgreSQL + Prisma
- Realtime: Socket.IO + Redis
- Storage: S3 compatible
- Notificaciones: Firebase Cloud Messaging
- Auth: JWT + Refresh Tokens + OTP
- Mapas: abstracción `MapProvider`

**Regla:** no reescribir el backend al stack objetivo sin indicación explícita.

---

## 3. Estructura del repositorio

```
09. Rapidito/
├── AGENTS.md                          # Contexto que OpenCode carga automáticamente
├── Prompt maestro ... .md             # Fuente de verdad (~2000 líneas, 69 secciones)
├── .gitignore
├── backend/
│   ├── server.js                      # Arranque, asociaciones, seguridad, rutas
│   ├── database.sqlite                # Datos de desarrollo
│   ├── .env                           # PORT, DB_PATH, JWT_SECRET, JWT_EXPIRES_IN
│   └── src/
│       ├── config/{database,socket}.js
│       ├── models/                    # 13 modelos Sequelize
│       ├── controllers/               # 7 controladores
│       ├── routes/                    # 7 routers
│       ├── middleware/auth.js         # authenticateToken + requireRole
│       ├── seeders/initialData.js     # tarifas, zonas, config
│       └── utils/sanitize.js
└── frontend/
    ├── .env.local                     # NEXT_PUBLIC_API_URL
    └── src/
        ├── app/{page,login,register,dashboard}/
        ├── components/Header.tsx
        ├── contexts/AuthContext.tsx
        └── lib/api.ts
```

Otros directorios (`Vamos/`, `Yummy/`) **no** pertenecen a este proyecto.

---

## 4. Modelos de datos (Sequelize)

`User`, `PassengerProfile`, `DriverProfile`, `Ride`, `Negotiation`, `Fare`,
`DriverDocument`, `Rating`, `Notification`, `Zone`, `Route`, `SystemConfig`, `Payment`.

Roles (`User.rol`, ENUM):

```
PASSENGER · DRIVER · ADMIN · SUPPORT · DOCUMENT_VERIFIER · SUPER_ADMIN
```

---

## 5. Endpoints del backend

- **auth** `/api/auth`
  - `POST /register`, `POST /register-driver`, `POST /login`
  - `GET /profile`, `PUT /profile`
- **rides** `/api/rides`
  - `GET /nearby`, `POST /request`, `GET /my-rides`, `GET /:rideId`
  - `POST /:rideId/offer`, `POST /:rideId/counter`
  - `POST /driver/online`, `POST /driver/offline`, `PUT /driver/location`
  - `POST /:rideId/accept`, `PUT /:rideId/status`
- **fares** `/api/fares`
  - `GET /calculate`, `GET /`, `POST /`, `PUT /:fareId`
- **ratings** `/api/ratings`
  - `POST /`, `GET /user/:userId`
- **documents** `/api/documents`
  - `POST /upload`, `GET /my-documents`, `GET /pending`, `PUT /:documentId/verify`
- **admin** `/api/admin`
  - dashboard, users, rides, payments, config, zones, routes (protegidos por rol)
- **notifications** `/api/notifications`
  - listar, marcar leída, marcar todas, eliminar
- **utilidades:** `GET /health`, `GET /api/test/sanitize`, `GET /api/test/calculate-fare`

Seguridad ya aplicada: `helmet`, rate limiting global (100/15 min) y específico en login
(10/15 min), validación con `express-validator`, JWT con expiración, RBAC por rol.

---

## 6. Estado actual

- **Fase 1 (MVP)** en construcción.
- Backend con: autenticación, perfiles, viajes, negociación, tarifas, documentos,
  admin y notificaciones.
- Frontend con: home, login, register, dashboard, `AuthContext`, cliente API y header.
- El cálculo de tarifa del endpoint de prueba está **hardcodeado** en `server.js`
  (base 1.00 + 0.50/km + 0.10/min). Falta conectarlo a la lógica real de `Fare`.

### Próximos pasos sugeridos

1. UI completa del flujo de viaje (mapa origen/destino, ETA, seguimiento en tiempo real).
2. Negociación oferta/contraoferta end-to-end con Socket.IO.
3. Wallet, comisión y retiros del conductor (§32–34 del Prompt maestro).
4. Panel admin completo y centro de verificación documental (§40 y §44).
5. Tarifa real por distancia/duración.
6. Tests de lógica crítica, migraciones y seed DEMO separado (§66).

---

## 7. Reglas de desarrollo (obligatorias)

- **Nada de lógica crítica solo en frontend.** Tarifas, descuentos, puntos, comisiones,
  saldos, estados de viaje, roles, permisos, documentos y retiros se validan en backend.
- Cada funcionalidad = **UI + backend + base de datos + validaciones + manejo de errores +
  estados + seguridad** (+ auditoría cuando corresponda). No hacer demos visuales superficiales.
- Secretos solo en `.env`. Mantener `.env.example` documentado. Nunca exponer keys.
- TypeScript estricto, ESLint/Prettier, validación de schemas, manejo consistente de errores,
  logs estructurados.
- Seguridad: rate limiting, validación y sanitización de inputs, RBAC, protección de
  wallet, documentos y tarifas.
- No usar datos falsos como si fueran reales; los datos demo deben estar marcados como demo.
- No duplicar código; crear componentes y utilidades reutilizables.

---

## 8. Variables de entorno

`backend/.env`

```
PORT=3001
DB_PATH=./database.sqlite
JWT_SECRET=rapidito_secret_key_2026
JWT_EXPIRES_IN=7d
```

`frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

En producción: usar un `JWT_SECRET` nuevo.

---

## 9. Cómo levantar el proyecto

Requisitos: **Node.js >= 20** y npm.

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # http://localhost:3001

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # http://localhost:3000
```

El backend sincroniza modelos (`sequelize.sync({ force: false })`) y ejecuta el seeder
de datos iniciales al arrancar.

---

## 10. Documentos relacionados

- `Prompt maestro para desarrollar RAPIDITO en OpenCode.md` — contexto completo y reglas
  (secciones clave: §1 contexto, §4 roles, §11–13 tarifa y negociación, §46 base de datos,
  §47 stack, §48 arquitectura, §49 validaciones, §62 fases, §65 reglas, §66 calidad, §67 seguridad).
- `migracion/MIGRACION.md` — guía de migración a otra máquina.
- `migracion/estado-del-proyecto.md` — estado y próximos pasos.
- `migracion/sesion/transcripcion.md` — transcripción de la sesión de trabajo.

---

## 11. Historial de decisiones

- Se creó `AGENTS.md` en la raíz para que OpenCode cargue el contexto automáticamente.
- Se instalaron los skills de OpenCode **caveman / ultracave / megacave**
  (en `~/.config/opencode/skills/`, copia en `migracion/skills/`).
- Se generó el paquete de migración con `.gitignore`, `.env.example`, export de la sesión
  y scripts de instalación.
- Se mantiene Express + Sequelize + SQLite como stack real; NestJS/PostgreSQL/Prisma
  queda como objetivo sin fecha.
