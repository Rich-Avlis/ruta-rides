# Migración de RAPIDITO a una computadora nueva

Este paquete contiene **todo** lo necesario para continuar el proyecto y retomar la sesión
de trabajo en otra máquina.

## Contenido

```
09. Rapidito/
├── AGENTS.md                     # Contexto que OpenCode carga automáticamente
├── Prompt maestro ... .md        # Fuente de verdad (contexto completo, ~2000 líneas)
├── backend/                      # API Express 5 + Sequelize + SQLite (+ .env)
├── frontend/                     # Next.js 16 + React 19 + TS (+ .env.local)
├── migracion/
│   ├── MIGRACION.md              # Este archivo
│   ├── estado-del-proyecto.md    # Estado actual + próximos pasos (contexto para el agente)
│   ├── setup-nueva-maquina.sh    # Instala skills + deps + .env
│   ├── importar-sesion.sh        # Importa la sesión de OpenCode
│   ├── sesion/
│   │   ├── rapidito-sesion-export.json  # Sesión importable (opencode import)
│   │   ├── transcripcion.md             # Conversación legible (respaldo)
│   │   ├── session-info.json            # Metadatos de la sesión
│   │   └── session-messages.json        # Mensajes crudos
│   └── skills/                   # Skills de OpenCode (caveman, ultracave, megacave)
├── .gitignore
├── backend/.env.example
└── frontend/.env.example
```

## Requisitos en la máquina nueva

- **Node.js >= 20** y **npm**
- **OpenCode** (app de escritorio o CLI) para importar la sesión
- Opcional: **Git** si vas a versionar

## Pasos

### 1. Copiar el proyecto
Copia **toda** la carpeta `09. Rapidito` a la nueva máquina (o usa el `.zip` generado).
No copies `node_modules` ni `.next` entre arquitecturas distintas (Intel ↔ Apple Silicon).

### 2. Ejecutar el setup
```bash
cd "09. Rapidito"
bash migracion/setup-nueva-maquina.sh
```
Esto: instala los skills en `~/.config/opencode/skills/`, crea los `.env` si faltan,
e instala dependencias de backend y frontend.

### 3. Importar la sesión (opcional pero recomendado)
```bash
bash migracion/importar-sesion.sh
```
Si no tienes el CLI `opencode`, abre el proyecto en la app de escritorio y usa como
contexto `migracion/estado-del-proyecto.md` + `migracion/sesion/transcripcion.md`.

### 4. Arrancar
```bash
# Terminal 1
cd backend && npm run dev     # http://localhost:3001

# Terminal 2
cd frontend && npm run dev    # http://localhost:3000
```

## Variables de entorno (secretos)

Los `.env` van incluidos en este paquete para que todo funcione de inmediato:

- `backend/.env` → `PORT`, `DB_PATH`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- `frontend/.env.local` → `NEXT_PUBLIC_API_URL`

En producción usa un `JWT_SECRET` nuevo y no subas los `.env` a Git (ya están en `.gitignore`).

## Reautenticar proveedores de IA (opcional)

Los credenciales de proveedores (ej. DeepSeek) **no** se incluyen por seguridad.
Para migrarlas sin volver a hacer login, copia en la máquina nueva:

```
~/.local/share/opencode/auth.json      (global, contiene las API keys)
```

## Notas importantes

- **Stack real vs objetivo:** el backend hoy es Express + Sequelize + SQLite. El
  *Prompt maestro* (§47) describe el stack objetivo (NestJS, PostgreSQL, Prisma).
  No reescribir el backend sin indicación explícita.
- **Datos:** `backend/database.sqlite` incluye los datos de desarrollo. Los datos demo
  deben seguir marcados como demo.
- **Producción:** <https://rapidito-virid.vercel.app/>
