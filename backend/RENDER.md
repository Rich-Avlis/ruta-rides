# Backend en Render

Servicio: `ruta-rides-api`
URL: <https://ruta-rides-api.onrender.com>
Salud: <https://ruta-rides-api.onrender.com/health>

## Variables de entorno

| Variable | Valor |
| --- | --- |
| `NODE_VERSION` | `20.19.0` |
| `JWT_SECRET` | secreto propio de producción |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGINS` | `https://ruta-rides.vercel.app,https://ruta-rides-rich-avlis.vercel.app,https://ruta-rides-git-main-rich-avlis.vercel.app` |
| `ADMIN_EMAIL` | `admin@rutarides.com` |
| `ADMIN_PASSWORD` | definido en Render (no versionar) |
| `ADMIN_PHONE` | `+584240000000` |
| `GEOCODING_PROVIDER` | `osm` |
| `ROUTING_PROVIDER` | `osrm` |

`DB_PATH` no se define: en el plan gratuito el disco es efímero y la base
SQLite se recrea con los datos iniciales en cada arranque. Para persistencia
real hay que pasar a un plan con disco (`starter`) y definir
`DB_PATH=/var/data/database.sqlite`.

## Despliegue

- Build: `npm install`
- Start: `node scripts/create-admin.js && node server.js`
- Health check: `/health`

El workflow `.github/workflows/deploy-backend.yml` dispara un deploy en Render
cuando cambia algo en `backend/` o `render.yaml`. Usa los secrets
`RENDER_API_KEY` y `RENDER_SERVICE_ID`.
