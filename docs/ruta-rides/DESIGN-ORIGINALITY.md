# RUTA RIDES — Originalidad y diferenciación

- **Fecha:** 2026-10-31
- **Objetivo:** identidad propia, sin copiar la expresión visual de competidores.

---

## 1. Referencias y uso

La imagen de referencia de ocho pantallas no estaba disponible en el repositorio
ni como archivo adjunto accesible. La implementación se basó en:

- la especificación escrita del rediseño,
- el logo final entregado por el propietario,
- la paleta oficial naranja/gris/blanco/negro,
- los flujos y componentes ya existentes de RUTA RIDES.

No se descargaron ni reutilizaron recursos gráficos de VAMOS, Yummy, Uber, DiDi,
InDrive ni otras plataformas.

---

## 2. Diferenciación visual

- Marca basada en el logo “ruta RIDES” y su skyline urbano.
- Naranja `#FD7624` como color de acción, no como decoración masiva.
- Tipografía de sistema, pesos fuertes y jerarquía clara.
- Tarjetas blancas con radios amplios y sombras suaves.
- Navegación inferior propia de cuatro destinos por rol.
- Etiquetas tipo pill y chips de favoritos.
- Mapa como superficie principal del pasajero, con panel inferior.
- Panel del conductor con disponibilidad, solicitudes y ganancias reales.

No se copiaron:

- logotipos ajenos,
- ilustraciones,
- iconografía propietaria,
- microcopys comerciales,
- animaciones distintivas,
- composiciones de tarjetas de competidores.

Los iconos son SVG propios, simples y funcionales. Los mapas usan Leaflet y
OpenStreetMap con atribución. El logo es propiedad del proyecto.

---

## 3. Funcionalidad real, no maqueta

Cada pantalla está conectada a servicios reales:

- autenticación JWT,
- GPS del navegador,
- Nominatim/OSRM,
- tarifador backend,
- cotizaciones,
- viajes y estados,
- Socket.IO,
- pagos con referencia y comprobante,
- calificaciones,
- favoritos,
- notificaciones.

Las categorías de viaje que no existen en el backend no se inventaron. Se muestra
la tarifa urbana real y se deja preparado el espacio para más categorías cuando el
propietario las configure.

---

## 4. Riesgos de similitud

Patrones de industria usados (permitidos como usabilidad general):

- mapa con marcador y campo de destino,
- tarjetas de precio,
- estados de viaje,
- navegación inferior.

La expresión visual es propia: paleta, logo, tipografía, radios, sombras,
etiquetas, composición y microcopy. Antes de lanzamiento comercial se recomienda
una revisión legal de marca, derechos de autor y licencias.

---

## 5. Licencias

- Leaflet: BSD-2-Clause.
- OpenStreetMap: datos ODbL, atribución visible.
- Nominatim/OSRM públicos: solo desarrollo; revisar términos para producción.
- Iconos: SVG creados para este proyecto.
- Logo: entregado por el propietario.
- Tipografía: fuentes del sistema, sin archivos externos.
