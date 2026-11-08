# Puesta en producción con dinero real

## 1. Base de datos persistente (obligatorio)
Render gratuito borra SQLite al reiniciar. Elegir una:

**A. PostgreSQL (recomendado)**
1. Crear base Postgres (Render, Neon, Supabase).
2. Copiar la cadena de conexión.
3. En Render → Environment → `DATABASE_URL=postgres://...`
4. El backend detecta `DATABASE_URL` y cambia a Postgres solo.

**B. Disco persistente**
1. Subir el servicio a plan `starter`.
2. Disco `ruta-data` en `/var/data`.
3. `DB_PATH=/var/data/database.sqlite`

## 2. Archivos (comprobantes y documentos)
Con disco persistente:
- `UPLOAD_DIR=/var/data/uploads`

Con Postgres sin disco:
- migrar comprobantes a S3/R2 y definir `UPLOAD_DIR` o adaptador.

## 3. Verificación de conductores
- Cargar cédula y licencia desde `/driver/documents`.
- Aprobar en Admin → Verificación.
- Activar `REQUIRE_DOCS_FOR_ONLINE=true` para exigir 2 documentos aprobados antes de conectarse.

## 4. Dinero
- Comisión: 25 % (`commissionRate` en SystemConfig).
- Recargas y retiros se aprueban en Admin → Dinero.
- Retiro mínimo $5, uno por semana.
- El conductor puede abonar a su cuenta para saldar saldo negativo.

## 5. Seguridad
- `JWT_SECRET` largo y único.
- `CORS_ORIGINS` con dominios reales.
- HTTPS obligatorio (Vercel + Render).
- Revisar límites de tasa.
- Rotar claves expuestas en chats.

## 6. Legal
- Términos y condiciones.
- Política de privacidad y tratamiento de ubicación.
- Contrato de conductores y comisión.
- Revisión de propiedad intelectual de marca.

## 7. Operación
- Backups diarios de Postgres.
- Monitoreo de `/health`.
- Alertas de errores (Sentry o similar).
- Plan de soporte y disputas.

## Estado actual (8 nov 2026)
- PostgreSQL creado en Render: `ruta-rides-db` (plan free).
- `DATABASE_URL` configurada en el servicio.
- Persistencia verificada: un favorito sobrevivió a un reinicio.
- Cuentas demo recreadas en Postgres: jose@test.com, carlos@test.com.

### Aviso
La base Postgres gratuita **expira el 8 de diciembre de 2026**. Antes de esa
fecha hay que pasar a plan pago o migrar a otro proveedor (Neon, Supabase).
Si expira, se pierde todo el historial.
