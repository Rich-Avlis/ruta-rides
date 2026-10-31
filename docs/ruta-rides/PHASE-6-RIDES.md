# RUTA RIDES — Fase 6: solicitud, estados y conductor

- **Fecha:** 2026-10-30
- **Alcance:** solicitud real con cotización, máquina de estados, viajes disponibles,
  aceptación por conductor, seguimiento del pasajero y acciones del conductor.

---

## 1. Esquema aditivo

### Columnas nuevas en `rides`

| Campo | Tipo |
|---|---|
| modalidad | `SOLO_IDA`, `IDA_VUELTA`, `MULTIPARADA` |
| quoteId | UUID de la cotización |
| moneda | `USD` |
| totalBs | FLOAT |
| tasaCambio | FLOAT |
| canceladoPor | `PASAJERO`, `CONDUCTOR`, `SISTEMA` |
| motivoCancelacion | STRING |

### Tablas nuevas

- `ride_stops`: paradas ordenadas del viaje (lat, lng, nombre, dirección).
- `ride_events`: historial de estados con actor, rol, motivo y fecha.

Respaldo previo: `backend/backups/database-*-pre-rides.sqlite`.
No se borraron tablas ni columnas existentes.

---

## 2. Solicitud de viaje

```text
POST /api/rides/request
{ "quoteId": "...", "metodoPago": "EFECTIVO | PAGO_MOVIL | TARJETA" }
```

Validaciones en backend:

1. Cotización existe y pertenece al pasajero.
2. Cotización no vencida.
3. No hay otro viaje activo del pasajero.
4. Se recalcula la tarifa con la distancia/duración de la cotización.
5. Si el total cambió: `409 quote_outdated`.
6. Se crea `Ride` + `RideStop` + `RideEvent` en transacción.
7. Estado inicial: `SEARCHING_DRIVER`.
8. Se emite `ride-request` a conductores en línea.

El cliente nunca envía precio, distancia ni duración.

---

## 3. Máquina de estados

```text
SEARCHING_DRIVER → DRIVER_ASSIGNED → DRIVER_EN_ROUTE → DRIVER_ARRIVED
→ TRIP_STARTED → TRIP_COMPLETED → PAYMENT_PENDING → COMPLETED
```

Cancelación permitida antes de iniciar el viaje; el administrador puede cancelar
estados activos. Cada transición valida rol, actor y estado previo.

Archivo: `src/services/rideStateMachine.js`.
Tests: `test/rideStateMachine.test.js` (9 casos).

---

## 4. Endpoints nuevos o corregidos

```text
GET  /api/rides/available        (DRIVER)  viajes buscando conductor
POST /api/rides/:id/accept       (DRIVER)  aceptación atómica
PUT  /api/rides/:id/status       (actor)   transición validada
GET  /api/rides/:id              (actor)   detalle + paradas + eventos
POST /api/rides/driver/online    (DRIVER)  disponibilidad + GPS
POST /api/rides/driver/offline   (DRIVER)
PUT  /api/rides/driver/location  (DRIVER)
```

`accept` usa actualización condicional para evitar que dos conductores tomen el
mismo viaje.

---

## 5. Socket.IO

- Handshake valida JWT y usuario activo.
- `join-ride` verifica que el usuario participe en el viaje.
- `join-drivers` solo para rol `DRIVER`.
- `ride-request`: nuevo viaje para conductores en línea.
- `status-changed`: emitido por el backend al cambiar estado.
- `location-updated`: posición del conductor a la sala del viaje.
- Se eliminó la posibilidad de que el cliente emita cambios de estado.

---

## 6. Interfaz

### Pasajero

- Selecciona método de pago: efectivo o pago móvil.
- “Solicitar viaje” usa la cotización vigente.
- Redirige a `/passenger/ride/[id]`.
- Ve estado, conductor, vehículo, placa, pago USD/Bs, ruta y paradas.
- Recibe cambios por Socket.IO.
- Puede cancelar antes de iniciar.
- Ve el historial de estados y el motivo de cancelación.

### Conductor

- `/driver`: disponibilidad, GPS, solicitudes cercanas, aceptar.
- `/driver/ride/[id]`: pasajero, ruta, cobro y acciones:
  - Voy en camino.
  - Llegué al origen.
  - Iniciar viaje.
  - Finalizar viaje.
  - Confirmar pago.
- Puede cancelar antes de iniciar.
- La lista se actualiza por Socket.IO y cada 10 s.

### Navegación

- `roleHome('DRIVER')` → `/driver`.
- Header con enlace “Conducir”.
- Panel del conductor abre el modo conductor.

---

## 7. Evidencia

### API

```text
POST /api/rides/request (quote, PAGO_MOVIL)
→ 201 SEARCHING_DRIVER · USD 1.00 · Bs 889.26

GET /api/rides/available (conductor en línea)
→ 1 viaje · recogida 0.03 km

POST /api/rides/:id/accept
→ 200 DRIVER_ASSIGNED

PUT /api/rides/:id/status
→ DRIVER_EN_ROUTE → DRIVER_ARRIVED → TRIP_STARTED
→ TRIP_COMPLETED → PAYMENT_PENDING → COMPLETED

GET /api/rides/:id (pasajero)
→ 8 eventos de estado, totalBs 889.26
```

### Navegador

- Pasajero solicita viaje y cae en “Buscando conductor”.
- Al aceptar el conductor por API, la pantalla del pasajero cambia sola a
  “Conductor en camino” por Socket.IO.
- Conductor entra a `/driver`, ve la solicitud, acepta y completa todo el flujo con
  botones.
- Mapa con ruta naranja, origen, destino y conductor.
- Consola sin errores.

### Tests

```text
cd backend && npm test
20 tests · 20 pass
```

Incluye 9 tests de la máquina de estados.

---

## 8. Pendiente

- Negociación de tarifa con `NEGOCIACION_MIN/MAX` y expiración de ofertas.
- Confirmación de pago móvil con referencia/comprobante.
- Calificación al finalizar el viaje.
- Auditoría de cambios de tarifas/configuración.
- CRUD de lugares locales desde admin.
- Seguimiento en segundo plano en Android/PWA.
- Pruebas en emulador Android y Chrome móvil.
