# RUTA RIDES — Fase 2: acceso y sesión persistente

- **Fecha:** 2026-10-30
- **Rama:** `main`
- **Alcance:** pantalla de entrada, registro, login, restauración de sesión validada,
  rutas protegidas, marca RUTA RIDES y correcciones de seguridad del bloque de acceso.

---

## 1. Entregado

### Pantalla de entrada (`/`)

- Logo RUTA RIDES, mensaje “Muévete a tu manera”.
- Botones **Soy pasajero** y **Soy conductor** hacia el registro con rol preseleccionado.
- Acceso a **Inicia sesión**.
- Sin hero publicitario, testimonios ni estadísticas ficticias.
- Si existe sesión válida, redirige al área del rol sin pedir login.

### Registro (`/register`)

- Rol preseleccionado desde `?role=PASSENGER|DRIVER`.
- Campos de vehículo solo para conductor.
- Validación local de contraseña y confirmación; errores del backend visibles.
- Tras registrar: sesión creada, perfil cargado y redirección por rol.
- `useSearchParams` envuelto en `Suspense` (corrige el fallo de build).

### Login (`/login`)

- Formulario accesible, autocompletado, estado de carga y errores del servidor.
- Cuentas de demostración marcadas explícitamente como datos de prueba.
- Redirección por rol y respeto de `?next=` solo para rutas internas.
- Si ya hay sesión, redirige sin mostrar el formulario.

### Sesión persistente validada

- Al montar, el token guardado se valida con `GET /api/auth/profile`.
- Token inválido o expirado: se limpia el almacenamiento y se redirige a login.
- El perfil (vehículo, calificación, referido) se carga al iniciar sesión y al registrar.
- El interceptor 401 ya no fuerza navegación desde cualquier página: limpia la sesión,
  emite `auth:unauthorized` y deja que el guard decida.
- Evento entre pestañas: una respuesta 401 invalida la sesión en memoria.

### Rutas protegidas

- `RequireAuth` valida sesión y, opcionalmente, roles.
- `/dashboard` exige sesión; sin token redirige a `/login?next=/dashboard`.
- Pantalla explícita de acceso restringido cuando el rol no coincide.

### Marca

- Metadatos: título, descripción, `applicationName`, `themeColor #FD7624`.
- Paleta en Tailwind 4 vía `@theme`: naranja `#FD7624`, naranja oscuro `#E05F10`,
  negro `#0B0B0B`, blanco `#FFFFFF`, gris `#F3F3F0`, borde `#0B0B0B`,
  texto secundario `#5F5F5F`. Ver `BRAND.md`.
- **Actualización 2026-10-30:** la paleta final sale del logo entregado:
  naranja, negro, blanco y gris. Se retiró el morado `#7026BF` y el rojo anterior.
- **Logo:** archivo oficial `migracion/LOGO RUTA RIDE NUEVO.JPG`, copiado a
  `frontend/public/brand/ruta-rides-banner.jpg` y usado completo en la entrada.
  No se recorta ni se recolorea. El header usa un wordmark tipográfico porque el
  archivo no tiene fondo transparente.
  - Assets anteriores conservados en `frontend/public/brand/` sin usar.
- Se eliminó el reset CSS sin capa que anulaba utilidades de Tailwind 4
  (`mx-auto`, márgenes y paddings). Ahora los estilos base y de componentes usan
  `@layer base` y `@layer components`.

---

## 2. Correcciones de backend

| Archivo | Cambio |
|---|---|
| `src/controllers/documentController.js` | Se agregó `const { Op } = require('sequelize')`. `POST /api/documents/upload` ya no devuelve 500. |
| `src/controllers/authController.js` | `PUT /api/auth/profile` solo acepta `nombre`, `apellido`, `telefono`, `foto`. Bloquea escalada de rol y cambios de `activo`/`verificado`. |
| `src/controllers/rideController.js` | `GET /api/rides/:rideId` valida pertenencia (pasajero, conductor o admin). Corrige IDOR. |
| `src/config/cors.js` | Nueva configuración CORS por `CORS_ORIGINS`, compartida por HTTP y Socket.IO. |
| `server.js`, `src/config/socket.js` | Usan la configuración CORS común. |
| `package.json` | `uuid` declarado como dependencia directa (`^8.3.2`). |

> Estos cambios endurecen el contrato existente sin renombrar rutas, campos ni eventos.
> La única diferencia visible es que accesos no autorizados pasan de 200 a 403, y los
> campos no editables del perfil se ignoran.

---

## 3. Evidencia de pruebas

Comandos:

```text
frontend npm run lint   → sin errores ni advertencias
frontend npm run build  → compilado, TypeScript OK, 5 rutas estáticas
backend node --check    → sin errores de sintaxis
```

Pruebas ejecutadas en navegador (Chromium, backend en `:3101`, frontend en `:3200`):

| Caso | Resultado |
|---|---|
| `/` sin sesión | Muestra entrada con logo y dos botones |
| “Soy pasajero” | Abre `/register?role=PASSENGER` |
| Login pasajero demo | Redirige a `/dashboard`, muestra “Tu panel de pasajero” |
| Recargar `/dashboard` | Restaura sesión con `GET /api/auth/profile` (200) |
| Logout | Vuelve a `/`, limpia token y usuario |
| `/dashboard` sin sesión | Redirige a `/login?next=%2Fdashboard` |
| Login conductor demo | Panel de conductor, calificación real `5.0` |
| Token inválido en almacenamiento | Limpia token/usuario y redirige a login |
| Registro de conductor nuevo | Crea usuario y perfil, inicia sesión y redirige al panel |
| Registro desde `?role=DRIVER` | Campos de vehículo visibles, rol preseleccionado |
| Consola del navegador | Sin errores de aplicación (solo 401 esperados del token inválido) |

Los datos de prueba creados durante la validación se eliminaron de SQLite.
La base quedó igual al estado base: 3 usuarios, 0 documentos.

Pruebas HTTP adicionales:

```text
PUT /api/auth/profile {"rol":"ADMIN"}            → 400, sin cambios
PUT /api/auth/profile {"rol":"ADMIN","nombre":…} → 200, rol sigue PASSENGER
POST /api/documents/upload                       → 201
```

---

## 4. Pendiente y riesgos conocidos

- **Token en `localStorage`:** se mantiene por compatibilidad. Riesgo XSS documentado.
  Migración a cookie `HttpOnly` + refresh token con rotación queda para una fase con
  aprobación de contrato de autenticación.
- **Sin refresh ni revocación:** el JWT dura 7 días; no hay lista de revocación.
- **Sin recuperación de contraseña:** el backend no la soporta todavía.
- **Sin multirrol:** una cuenta no puede alternar pasajero/conductor.
- **Sin verificación de documentos real:** el registro de conductor queda “Pendiente”.
- **Rutas `/passenger` y `/driver`:** se crean en la fase de mapa y GPS; hoy el panel
  cumple esa función.
- **CORS:** sin `CORS_ORIGINS` el backend refleja el origen. En producción hay que
  declarar la lista exacta.

---

## 5. Siguiente fase

Fase 3: GPS real, mapa Leaflet + OSM, geocoding y routing OSRM, selección de origen y
destino, y pantalla inicial del pasajero.
