# AGENTS.md — RAPIDITO

## Fuente de verdad del contexto

Todo el contexto, requerimientos y reglas del proyecto están en:

**`Prompt maestro para desarrollar RAPIDITO en OpenCode.md`** (raíz del repo, ~2000 líneas).

Léelo (o su sección relevante) antes de implementar cualquier funcionalidad. Secciones clave:

- §1 Contexto · §4 Roles · §11–13 Tarifa y negociación · §46 Base de datos
- §47 Stack · §48 Arquitectura · §49 Validaciones · §62 Fases
- §65 Reglas de desarrollo · §66 Calidad · §67 Seguridad

## Qué es

App de transporte (tipo ride-hailing) para **Quíbor, Lara, Venezuela**. Una sola app con roles Pasajero y Conductor (futuro: ambos roles en una cuenta). Flujo: ubicación → destino → precio estimado → negociación → solicitud → seguimiento en tiempo real → pago → calificación.

Producción: <https://rapidito-virid.vercel.app/>

## Estructura

```
backend/   API Express 5 + Sequelize + SQLite (database.sqlite), Socket.IO, JWT
frontend/  Next.js 16 + React 19 + TypeScript + Tailwind 4 (app en src/)
Vamos/, Yummy/   otros proyectos (no relacionados)
```

Comandos:

- Backend: `npm run dev` en `backend/` (node server.js)
- Frontend: `npm run dev` / `npm run lint` en `frontend/`

Nota: el stack real del backend hoy es Express + Sequelize + SQLite; el Prompt maestro (§47) especifica el stack objetivo (NestJS, PostgreSQL, Prisma). No reescribas el backend sin indicación explícita.

## Reglas que siempre aplican

- Nada de lógica crítica solo en frontend: tarifas, comisiones, saldos, puntos, estados de viaje, roles y permisos se validan en backend (§49, §65).
- Cada funcionalidad = UI + backend + datos + validaciones + errores + estados + seguridad (+ auditoría si aplica). No hacer demos visuales superficiales.
- Secretos solo en `.env`; mantener `.env.example` documentado. Nunca exponer keys.
- TypeScript estricto, ESLint/Prettier, manejo consistente de errores.
- Seguridad: rate limiting, sanitización de inputs, RBAC, protección de wallet/documentos/tarifas.
- No usar datos falsos como si fueran reales (los datos demo deben estar marcados como tal).

## Next.js

`frontend/AGENTS.md` lo regenera `next dev` y contiene reglas propias de esta versión de Next.js; respetarlo y no borrarlo de los diffs.
