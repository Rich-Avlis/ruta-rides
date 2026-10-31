# RUTA RIDES — Negociación, pago con referencia, calificación y auditoría

- **Fecha:** 2026-10-30
- **Alcance:** cierre de pendientes del flujo de viaje.

---

## 1. Negociación de tarifa

Disponible cuando el viaje está en `DRIVER_ASSIGNED`, `DRIVER_EN_ROUTE` o
`DRIVER_ARRIVED`.

### Reglas

- Referencia: total de la cotización original (o tarifa del viaje).
- Rango: `NEGOCIACION_MIN` y `NEGOCIACION_MAX` (por defecto 0.5× y 2×).
- Máximo de ofertas por usuario: `LIMITE_NEGOCIACIONES` (3).
- Expiración: `TIEMPO_EXPIRACION_OFERTA` (60 s).
- No se puede aceptar la propia oferta.
- Al aceptar, se actualiza `tarifaFinal` y `totalBs` del viaje.
- Se registra un evento `NEGOTIATED` en el historial.

### Endpoints

```text
GET  /api/rides/:rideId/negotiations
POST /api/rides/:rideId/offer { monto }
POST /api/rides/:rideId/negotiations/:negotiationId/accept
POST /api/rides/:rideId/negotiations/:negotiationId/reject
```

La tabla `negotiations` recibió la columna aditiva `expiraEn`.

### Interfaz

Componente `NegotiationPanel` en las pantallas de pasajero y conductor:

- Sugerido, mínimo y máximo.
- Campo de oferta.
- Lista de ofertas pendientes con aceptar/rechazar.
- Actualización por Socket.IO (`negotiation-updated`).

---

## 2. Pago con referencia

Al pasar a `COMPLETED`:

- `PAGO_MOVIL` exige `referencia` de 4 a 40 caracteres alfanuméricos.
- Se crea o actualiza un registro en `payments` con monto, método, referencia,
  estado `COMPLETADO` y fecha.
- La referencia se muestra al pasajero y al conductor.
- Efectivo no requiere referencia.

Evidencia:

```text
PUT /status { estado: COMPLETED }                      → 400 referencia_requerida
PUT /status { estado: COMPLETED, referencia: 12345678 } → 200, pago registrado
```

---

## 3. Calificación

- Disponible cuando el viaje está `COMPLETED`.
- Pasajero califica al conductor; conductor califica al pasajero.
- Una calificación por usuario y viaje.
- Se actualiza el promedio del perfil calificado.
- Se guarda en `rides.calificacionPasajero` o `rides.calificacionConductor`.
- La UI muestra formulario de 1 a 5 y comentario; luego “Gracias”.

Componente: `RatingForm`.

Evidencia:

```text
POST /api/ratings (pasajero)  → 201
POST /api/ratings (duplicado) → 400
POST /api/ratings (conductor) → 201
```

---

## 4. Auditoría

- Tabla nueva `audit_logs` (aditiva).
- Registra actor, acción, entidad, antes, después y motivo.
- Acciones registradas:
  - `CONFIG_UPDATE`
  - `FARE_UPDATE`
  - `ZONE_UPDATE`
- Endpoint `GET /api/admin/audit` (ADMIN/SUPER_ADMIN).
- Panel `/admin` muestra los últimos 20 cambios.

Evidencia:

```text
PUT /api/admin/config (motivo: Prueba de auditoría) → 200
GET /api/admin/audit → 1 log CONFIG_UPDATE
```

---

## 5. Evidencia de interfaz

- Pasajero envía oferta de USD 0.90 sobre sugerido USD 1.00.
- Conductor ve la oferta y la acepta.
- La tarifa del viaje cambia a USD 0.90 y Bs 800.33.
- Conductor completa el viaje y califica con 5.
- La pantalla muestra “Gracias. Tu calificación quedó registrada.”
- Sin errores de consola.

---

## 6. Pendiente

- Confirmación de pago con comprobante de imagen.
- CRUD de lugares locales desde admin.
- Notificaciones push.
- Android/PWA y seguimiento en segundo plano.
- Pruebas de carga y concurrencia con más de un conductor.
