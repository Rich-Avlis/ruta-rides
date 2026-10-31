# Despliegue — Vercel + Render

- Frontend: Vercel (Next.js)
- Backend: Render (Express + Socket.IO + SQLite con disco)
- Base de datos: SQLite en disco persistente de Render

> Render necesita plan con disco persistente. En plan gratuito el archivo SQLite
> se pierde en cada redeploy. Para producción real, migrar a PostgreSQL.

---

## 1. GitHub

Render y Vercel despliegan desde un repositorio Git. El repo local no tiene remoto
ni credenciales en esta máquina.

```bash
git remote add origin https://github.com/TU_USUARIO/ruta-rides.git
git push -u origin main
```

Si el repo es privado, autorizar Vercel y Render para leerlo.

---

## 2. Backend en Render

### Opción A — Blueprint

1. Render → New → Blueprint.
2. Seleccionar el repositorio.
3. Render lee `render.yaml`.
4. Completar las variables marcadas como secretas:
   - `CORS_ORIGINS`: dominio de Vercel, por ejemplo
     `https://ruta-rides.vercel.app`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_PHONE` (formato `+58412...`)
5. Deploy.

### Opción B — Manual

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `node scripts/create-admin.js && node server.js`
- Health Check Path: `/health`
- Disco: nombre `ruta-data`, mount `/var/data`, 1 GB.
- Variables:

```text
NODE_VERSION=22.23.3
JWT_SECRET=<generado>
JWT_EXPIRES_IN=7d
DB_PATH=/var/data/database.sqlite
CORS_ORIGINS=https://<tu-frontend>.vercel.app
ADMIN_EMAIL=<admin>
ADMIN_PASSWORD=<clave fuerte>
ADMIN_PHONE=+584...
GEOCODING_PROVIDER=osm
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org
GEOCODING_VIEWBOX=-69.68,9.98,-69.56,9.88
ROUTING_PROVIDER=osrm
ROUTING_BASE_URL=https://router.project-osrm.org
EXCHANGE_RATE_URL=https://ve.dolarapi.com/v1/dolares/oficial
```

El script `scripts/create-admin.js` crea el administrador la primera vez y no
duplica cuentas. Los pasajeros y conductores se registran desde la app.

Verificar:

```text
https://<servicio>.onrender.com/health
→ {"status":"OK","db":"OK"}
```

---

## 3. Frontend en Vercel

1. Vercel → Add New → Project → importar repositorio.
2. Root Directory: `frontend`.
3. Framework: Next.js.
4. Variable de entorno:

```text
NEXT_PUBLIC_API_URL=https://<servicio>.onrender.com
```

5. Deploy.

Después del primer deploy:

1. Copiar el dominio de Vercel.
2. En Render, actualizar `CORS_ORIGINS` con ese dominio.
3. Redeploy del backend.

---

## 4. APK

1. Instalar el APK.
2. Cambiar servidor a la URL de Vercel:
   `https://<proyecto>.vercel.app`
3. Abrir.

Si se quiere que el APK traiga la URL por defecto, cambiar `DEFAULT_URL` en
`android-app/.../MainActivity.java` y recompilar.

---

## 5. Limitaciones de esta configuración

- SQLite con disco de Render no escala horizontalmente.
- Socket.IO requiere una sola instancia (sin réplicas) con SQLite.
- Los archivos de comprobantes se guardan en el disco del backend.
- Nominatim/OSRM públicos son de desarrollo.
- Antes de producción: PostgreSQL, almacenamiento S3/R2, HTTPS propio, backups,
  cookies HttpOnly, revisión legal de marca.

---

## 6. Estado actual

- **GitHub:** https://github.com/Rich-Avlis/ruta-rides (público; sin `.env`).
- **Vercel:** https://ruta-rides.vercel.app — conectado al repo, deploy automático.
- **Backend:** https://ruta-rides-api.onrender.com — plan gratuito, health OK.
- **APK:** `/Users/richardsilva/Downloads/RUTA-RIDES-debug.apk`, abre Vercel.
- **Deploy backend:** GitHub Actions (`.github/workflows/deploy-backend.yml`)
  llama a la API de Render con los secrets `RENDER_API_KEY` y
  `RENDER_SERVICE_ID`. El auto-deploy nativo quedó desactivado.

### Pendiente para producción

- Plan con disco (`starter`) o PostgreSQL para conservar datos.
- Repo privado: reinstalar la GitHub App de Render desde el dashboard para que
  pueda clonar en privado.
- Sustituir Nominatim/OSRM públicos y montar backups.
