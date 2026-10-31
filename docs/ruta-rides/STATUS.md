# RUTA RIDES — Estado del proyecto

- **Fecha:** 2026-10-30
- **Repositorio:** `/Users/richardsilva/Documents/09. RUTA RIDES`
- **Rama:** `main`
- **Entorno local:** frontend `:3200`, backend `:3101`, SQLite.

---

## 1. Avance general

| Área | Estado | Evidencia |
|---|---|---|
| Registro, login y sesión validada | ✅ | JWT + `/auth/profile`, guards por rol |
| GPS real y fallback manual | ✅ | `navigator.geolocation`, mapa y selección manual |
| Mapa, lugares y rutas | ✅ | Leaflet + OSM, Nominatim/OSRM acotados a Quíbor |
| Catálogo de Quíbor | ✅ | 43 lugares reales de OSM |
| Tarifador | ✅ | Base, km, minuto, zona, demanda, noche, descuento, redondeo |
| Cotizaciones | ✅ | `fare_quotes`, vigencia 15 min, USD + Bs |
| Favoritos y modalidades | ✅ | Casa/Trabajo/Otro; solo ida, ida/vuelta, multiparada |
| Solicitud de viaje | ✅ | `quoteId`, método de pago, validación de cotización |
| Estados del viaje | ✅ | Máquina de estados con permisos y auditoría de eventos |
| Conductor | ✅ | Disponibilidad, GPS, solicitudes, aceptar y completar |
| Seguimiento | ✅ | Socket.IO: estado y ubicación del conductor |
| Negociación | ✅ | Ofertas, contraofertas, límites y expiración |
| Pago | ✅ | Efectivo y pago móvil con referencia y comprobante de imagen |
| Calificación | ✅ | Mutua, promedio y bloqueo de duplicados |
| Admin | ✅ | Tarifas, zonas, tasa Bs, lugares, auditoría |
| Notificaciones | 🟡 | Persistidas + campana + Socket.IO; falta push del navegador |
| PWA/Android | 🟡 | Manifest, iconos y service worker; falta caché offline y prueba Android |
| Producción | ⛔ | Falta host persistente, PostgreSQL y proveedores de mapas |

---

## 2. Lo que ya funciona de punta a punta

1. El pasajero entra, activa GPS o fija origen en el mapa.
2. Busca un destino real de Quíbor.
3. Elige modalidad y método de pago.
4. El backend calcula ruta y cotización con tarifa vigente.
5. Solicita el viaje con `quoteId`.
6. El conductor se pone en línea, ve la solicitud y la acepta.
7. Ambos ven el estado en tiempo real.
8. Pueden negociar la tarifa antes de iniciar.
9. El conductor avanza: en camino → llegó → iniciar → finalizar.
10. Se confirma el pago (pago móvil exige referencia).
11. Ambos califican.
12. Todo queda en historial, notificaciones y auditoría.

---

## 3. Datos actuales de la base

```text
usuarios:       3 (pasajero, conductor, admin demo)
viajes:         1 (viaje demo histórico)
lugares:        43 (Quíbor, OSM)
cotizaciones:   0 (se limpian al vencer)
notificaciones: 0
auditoría:      0
```

---

## 4. Calidad y verificación

```text
npm run lint   → limpio
npm run build  → compila (10 rutas)
npm test       → 20 tests, 20 pass
```

Tests:

- 11 del motor de tarifa (noche, zona, descuento, redondeo, mínimo, Bs).
- 9 de la máquina de estados (roles, transiciones, cancelación).

Pruebas manuales recientes:

- Viaje completo pasajero → conductor → pago → calificación.
- Negociación USD 1.00 → 0.90 → Bs 800.33.
- Pago móvil sin referencia → 400; con referencia → pago registrado.
- Búsqueda de farmacias y bancos solo de Quíbor.
- Panel admin guardando tarifas, zonas, configuración y lugares.
- Notificaciones creadas al solicitar y aceptar.

---

## 5. Riesgos y limitaciones actuales

1. **Token en `localStorage`**: riesgo XSS. Migrar a cookie HttpOnly + refresh.
2. **SQLite**: válido para desarrollo; no para serverless ni alta concurrencia.
3. **Nominatim/OSRM públicos**: solo desarrollo; producción requiere proveedor.
4. **Sin comprobante de pago**: la referencia se guarda, pero no la imagen.
5. **Notificaciones push**: solo dentro de la app; no hay service worker.
6. **Sin PWA**: no instalable todavía.
7. **Sin pruebas de concurrencia reales** con varios conductores.
8. **Documentos de conductor**: registro por URL, sin subida real.
9. **Sin multirrol**: una cuenta no alterna pasajero/conductor.
10. **Next.js 16.3.5**: revisar actualización de seguridad antes de producción.

---

## 6. Siguiente prioridad recomendada

1. Caché offline y pantalla sin conexión.
2. Notificaciones push reales.
3. Pruebas en emulador Android y Chrome móvil.
4. Migración a PostgreSQL y host persistente.
5. Cookies HttpOnly y refresh tokens.
6. Pruebas de concurrencia y carga.
7. Almacenamiento de comprobantes en S3/R2.

---

## 7. Última pasada de seguridad y APK

- Registro público fuerza `PASSENGER`; ya no acepta `rol` del cliente.
- Pago móvil no se completa sin comprobante cargado.
- Solo conductor o admin confirman el pago; el pasajero no puede autocobrarse.
- Archivos de comprobante con nombre aleatorio, sin ruta del cliente.
- `/admin/payments` corregido (alias de asociaciones).
- Validación de configuración, tarifas, zonas, ratings y paginación.
- Socket valida que el conductor pertenezca al viaje antes de emitir GPS.
- `next` de login bloquea barras invertidas.
- APK de prueba: `RUTA-RIDES-debug.apk` (ver `ANDROID-APK.md`).

## 8. Cómo revisar

- App: <http://localhost:3200>
- API: <http://localhost:3101>
- Pasajero: `jose@test.com` / `123456`
- Conductor: `carlos@test.com` / `123456`
- Admin: `admin@rapidito.com` / `admin123`

Flujo sugerido:

1. Entrar como pasajero.
2. Buscar “farmacia” o “banco”.
3. Fijar origen en el mapa y solicitar.
4. En otra sesión, entrar como conductor, ponerse en línea y aceptar.
5. Negociar, avanzar estados, pagar y calificar.
6. Revisar `/admin` para tarifas, lugares y auditoría.
