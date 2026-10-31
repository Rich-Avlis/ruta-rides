# RUTA RIDES — Rediseño UI/UX

- **Fecha:** 2026-10-31
- **Alcance:** rediseño integral sobre la app existente, sin reescribir el backend.

---

## 1. Auditoría previa

La app ya tenía:

- Next.js 16 + React 19 + Tailwind 4.
- Express 5 + Sequelize + SQLite + Socket.IO.
- Auth JWT, roles, guards.
- GPS, Leaflet/OSM, Nominatim/OSRM.
- Tarifador, cotizaciones, favoritos, modalidades.
- Solicitud, estados, conductor, negociación, pago, calificación.
- Admin de tarifas, zonas, lugares y auditoría.
- PWA básica y APK de prueba.

Problemas de interfaz:

- Estilo brutalista con bordes negros gruesos y sombras duras.
- Falta de navegación inferior.
- Sin pantalla de selección de rol dedicada.
- Sin perfil, favoritos ni ingresos como secciones propias.
- Mapas y paneles con demasiados bordes y etiquetas en mayúscula.
- Inconsistencia entre pantallas nuevas y viejas.

---

## 2. Sistema visual

Tokens en `frontend/src/app/globals.css`:

- Naranja `#FD7624`, naranja oscuro `#E05F10`.
- Gris `#5F5F5F`, negro `#000000`, blanco.
- Fondo `#F7F7F8`, bordes `#E8E8EA`.
- Radios: tarjetas 20px, inputs 14px, botones 14px, pills 999px.
- Sombras suaves: `shadow-card`, `shadow-soft`, `shadow-float`.

Componentes base:

- `.btn-primary`, `.btn-secondary`.
- `.card`, `.input-field`, `.field-label`.
- `.brutal-label` reutilizado como pill naranja.
- `.pill`, `.pill-active`.
- `.bottom-nav`.

Componentes React:

- `components/ui/BottomNav.tsx`.
- `Header` modernizado.
- `NotificationBell` existente.
- `MapView`, `PlaceSearch`, `NegotiationPanel`, `PaymentProof`, `RatingForm`.

---

## 3. Pantallas

| Pantalla | Ruta | Estado |
|---|---|---|
| Inicio bold urbano | `/` | Implementada |
| Selección de rol | `/start` | Implementada |
| Login | `/login` | Rediseñado |
| Registro | `/register` | Rediseñado |
| Mapa del pasajero | `/passenger` | Rediseñado |
| Viaje en curso | `/passenger/ride/[id]` | Rediseñado |
| Perfil | `/profile` | Nueva |
| Favoritos | `/favorites` | Nueva |
| Conductor | `/driver` | Rediseñado |
| Ingresos | `/driver/earnings` | Nueva |
| Viaje del conductor | `/driver/ride/[id]` | Rediseñado |
| Admin | `/admin` | Rediseñado |

Navegación inferior:

- Pasajero: Inicio, Viajes, Favoritos, Perfil.
- Conductor: Inicio, Viajes, Ingresos, Perfil.

---

## 4. Decisiones funcionales

- No se inventaron categorías tipo “Comfort/XL/Compartido”. Se muestra la tarifa
  urbana real del backend.
- El mapa sigue usando GPS real, Leaflet/OSM y OSRM.
- El seguimiento sigue usando Socket.IO.
- Favoritos usa la API existente y permite usarlos como destino.
- Perfil e ingresos leen datos reales de la API.
- Los botones sin backend (métodos de pago avanzados) se muestran informativos,
  no como acciones falsas.

---

## 5. Pendiente

- Imagen de referencia no disponible en el repositorio; el diseño se basó en la
  especificación escrita.
- Categorías de viaje adicionales requieren tarifas y contrato backend.
- Despliegue Vercel/Render preparado, pendiente de credenciales.
- Pruebas visuales en Android real.
