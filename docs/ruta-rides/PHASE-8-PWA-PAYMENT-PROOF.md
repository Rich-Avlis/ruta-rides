# RUTA RIDES — Comprobante de pago, PWA y robustez

- **Fecha:** 2026-10-30
- **Alcance:** cierre de pendientes de pago y preparación Android/PWA.

---

## 1. Comprobante de pago

### Backend

```text
POST /api/payments/:rideId/comprobante   multipart/form-data, campo "comprobante"
GET  /api/payments/:rideId/comprobante
```

- Solo participantes del viaje o admin.
- Solo viajes con método `PAGO_MOVIL`.
- Formatos: JPG, PNG, WebP.
- Tamaño máximo: 5 MB.
- Archivo guardado en `backend/uploads/` (ignorado por Git).
- Nombre aleatorio; no se expone la ruta directa.
- El pago debe existir o se crea en estado `PENDIENTE`.
- Al confirmar el pago, el comprobante se conserva.
- No se permite subir comprobante si el pago ya está `COMPLETADO`.
- La descarga exige JWT y pertenencia al viaje.

### Interfaz

- Pasajero: sube la imagen cuando el viaje está `TRIP_COMPLETED` o
  `PAYMENT_PENDING`.
- Conductor: ve la imagen antes de confirmar el pago con referencia.
- Componente `PaymentProof` con vista previa y validación.

### Evidencia

```text
POST comprobante → 201
GET comprobante  → 200 image/png 6324 bytes
Confirmar pago   → 200, referencia 87654321 y comprobante conservado
```

---

## 2. PWA

- `src/app/manifest.ts` → `/manifest.webmanifest`.
- Iconos 192 y 512 generados desde el logo final.
- `src/app/icon.png` para favicon.
- `appleWebApp` y theme color `#FD7624`.
- Service worker mínimo en `public/sw.js` para habilitar instalación.
- Registro con `PwaRegister`.

Estado: **instalable**, sin caché offline todavía. El service worker no intercepta
respuestas para no servir datos viejos.

```text
/manifest.webmanifest → 200 application/manifest+json
/icons/icon-192.png   → 200 image/png
/sw.js                → 200 application/javascript
```

---

## 3. Robustez

- `/health` ahora verifica la base de datos:
  - `200 { status: OK, db: OK }`
  - `503 { status: DEGRADED, db: ERROR }`
- Cierre ordenado con `SIGTERM`/`SIGINT`: cierra HTTP y Sequelize.
- Log del servidor actualizado a RUTA RIDES.
- Subidas fuera del repositorio (`backend/uploads/` en `.gitignore`).

---

## 4. Pendiente

- Estrategia de caché offline y pantalla sin conexión.
- Notificaciones push con VAPID.
- Pruebas de instalación en Android real/emulador.
- Migrar comprobantes a almacenamiento persistente (S3/R2) en producción.
- Validación antivirus/tamaño de imagen en producción.
