# RUTA RIDES — Prompt maestro de movilidad real, UX/UI, Android y despliegue

> **Instrucción para OpenCode:** trabaja sobre el repositorio existente de RAPIDITO/RUTA y evoluciona el producto a **RUTA RIDES**. No crees una demo desconectada ni una aplicación nueva desde cero. La prioridad es conseguir una experiencia de movilidad funcional: ubicación real, mapas, rutas, cálculo de tarifas, solicitudes, negociación, seguimiento y pruebas en Android. Conserva el trabajo existente y no hagas cambios destructivos.

## 1. Visión y alcance

RUTA RIDES será una plataforma de movilidad que conecta pasajeros y conductores, comenzando por Quíbor, estado Lara, Venezuela, con posibilidad de expansión.

**No quiero una landing page tradicional.** Al abrir la aplicación debe aparecer una pantalla de entrada directa con el logo y dos opciones principales:
- **Soy pasajero**
- **Soy conductor**

Cada opción conduce al registro o inicio de sesión correspondiente. Si ya existe una sesión válida, la aplicación debe restaurarla y dirigir a la persona a su área correspondiente, sin pedirle iniciar sesión repetidamente.

La prioridad es un producto real, no una maqueta. GPS, mapa, geocodificación, rutas, tarifador, solicitudes, seguimiento y comunicación con conductores deben funcionar con servicios y datos reales. Si una integración no está configurada, indícalo como pendiente y no la simules.

Principios:
1. Mobile-first y centrado en solicitar/gestionar viajes.
2. Ubicación real con permiso del usuario.
3. Mapa interactivo.
4. Búsqueda de direcciones y cálculo de rutas reales.
5. Tarifador calculado en backend y configurable.
6. Sesión persistente y segura.
7. Comunicación en tiempo real entre pasajero, conductor y backend.
8. Pruebas en Android Chrome y emulador Android.
9. Despliegue verificable; frontend y backend donde técnicamente corresponda.
10. Identidad original, sin copiar la interfaz, textos, iconos, animaciones, recursos ni composición de VAMOS, Yummy u otros competidores.

## 2. Auditoría antes de modificar

Lee todos los `AGENTS.md`, el prompt maestro anterior y la documentación de migración. Inspecciona frontend, backend, modelos, rutas, controladores, middleware, sockets, componentes, estilos, dependencias y configuración. Revisa `git status`, rama y cambios locales. Ejecuta lint, typecheck, tests y build para registrar la línea base. No sobrescribas trabajo local ni borres archivos, base de datos o configuraciones.

### Arquitectura conocida que debes verificar

Backend documentado: Node.js, Express 5, Sequelize, SQLite (`backend/database.sqlite`), Socket.IO, JWT, bcryptjs, express-validator, helmet, express-rate-limit, cors y dotenv.

Modelos documentados: `User`, `PassengerProfile`, `DriverProfile`, `Ride`, `Negotiation`, `Fare`, `DriverDocument`, `Rating`, `Notification`, `Zone`, `Route`, `SystemConfig`, `Payment`.

Roles documentados: `PASSENGER`, `DRIVER`, `ADMIN`, `SUPPORT`, `DOCUMENT_VERIFIER`, `SUPER_ADMIN`.

Frontend documentado: Next.js 16.3.5, React 19, TypeScript, Tailwind CSS 4, Axios, Socket.IO Client, jwt-decode, react-hot-toast y react-icons.

Estos datos son contexto, no sustituyen la inspección real. Confirma versiones y estructura en el repositorio.

### Restricción de arquitectura

No migres automáticamente Express/Sequelize/SQLite a NestJS/PostgreSQL/Prisma ni reescribas el backend por iniciativa propia. Primero entrega diagnóstico y propuesta incremental.

Evalúa expresamente la limitación de SQLite para producción en plataformas serverless. No despliegues un archivo SQLite guardado en disco efímero como si fuera persistente. Si el despliegue necesita PostgreSQL u otra base persistente, prepara un plan de migración separado, con respaldo, pruebas, integridad y aprobación antes de ejecutarlo.

## 3. Identidad visual RUTA RIDES

Usa el logo entregado por el usuario y busca primero los archivos originales dentro del proyecto. No deformes ni redibujes el logo sin autorización.

Paleta de referencia:
- Morado `#7026BF`: identidad principal y acciones primarias.
- Verde `#83D99B`: acentos y estados positivos.
- Blanco `#FFFFFF`: fondos y superficies.
- Negro `#111111`: texto y contraste.
- Morado oscuro `#421477`, verde suave `#E8F7EC`, gris `#F7F7F8`, borde `#E5E5E8`, texto secundario `#66666F`.

Si los colores exactos del archivo original difieren, toma el logo como fuente de verdad y documenta los tonos finales.

Dirección visual urbana, tecnológica, accesible y enérgica. Sistema gráfico propio basado en trayectorias, nodos, coordenadas, señales y movimiento. Tipografía open source como Space Grotesk para titulares e Inter/DM Sans para interfaz, si encaja con el stack. Diseño mobile-first, accesible, con contraste WCAG AA, foco visible y controles táctiles adecuados. No uses emojis como iconos de interfaz ni imites la composición distintiva de competidores.

## 4. Pantalla inicial: acceso directo, sin landing

La ruta inicial presenta:
- Logo RUTA RIDES.
- Mensaje corto original, por ejemplo “Muévete a tu manera”.
- Botón **Soy pasajero**.
- Botón **Soy conductor**.
- Acceso a iniciar sesión.
- Enlaces discretos a términos, privacidad y ayuda solo si están implementados.

No crear hero publicitario, testimonios, estadísticas ficticias, secciones promocionales ni una landing como prioridad.

La selección visual de “Soy conductor” no concede permisos de conductor. El backend debe validar el rol, el perfil y el estado de verificación. Si una cuenta tiene ambos perfiles y el sistema lo permite, ofrecer cambio de modo sin duplicar usuarios.

## 5. Registro, autenticación y sesión persistente

Implementa y prueba registro de pasajero, solicitud/registro de conductor, inicio y cierre de sesión, restauración de sesión al recargar y reabrir, expiración/renovación, recuperación de acceso si el backend la soporta, errores de credenciales, estado de verificación y redirección por rol.

Inspecciona el sistema JWT actual antes de cambiarlo. Prefiere cookies `HttpOnly`, `Secure` y `SameSite` adecuadas para refresh tokens cuando la arquitectura lo permita. No guardes secretos ni refresh tokens sensibles en texto plano en `localStorage`. Si existe una solución transitoria, documenta sus riesgos. Implementa renovación, expiración, revocación y logout de forma segura y compatible. Protege rutas en frontend y backend. No confíes en el rol enviado por el cliente. Nunca registres contraseñas ni tokens.

Al abrir con sesión válida, restaura el perfil y dirige al usuario a su área sin pedir login innecesariamente.

## 6. Experiencia inicial del pasajero

Después de iniciar sesión, el pasajero llega directamente al mapa y al flujo de solicitud. La pantalla debe incluir:
- Mapa interactivo centrado en la ubicación actual cuando haya permiso.
- Marcador claro de ubicación actual.
- Campo principal **“¿Pa’ dónde vas?”** (o microcopy propio de RUTA RIDES).
- Origen editable, inicialmente completado con la ubicación detectada.
- Búsqueda/selección de destino.
- Favoritos y accesos rápidos.
- Modalidad del viaje.
- Cotización y resumen cuando los datos estén disponibles.
- Acceso a historial, perfil, ayuda y notificaciones.

### Ubicación automática y permisos

Al entrar por primera vez:
1. Explica brevemente por qué se necesita la ubicación.
2. Solicita permiso de geolocalización en el momento adecuado.
3. Si acepta, obtén latitud, longitud y precisión con Geolocation API.
4. Muestra la posición real en el mapa.
5. Ejecuta geocodificación inversa para mostrar dirección/referencia.
6. Permite corregir manualmente el origen.
7. Si deniega, permite seleccionar origen manualmente; no bloquees toda la app.
8. Maneja GPS apagado, timeout, baja precisión, permiso denegado y ubicación no disponible.
9. No inventes ubicación ni uses coordenadas fijas para simular GPS.
10. Solicita seguimiento continuo solo cuando sea necesario y con consentimiento.

La geolocalización web requiere HTTPS, salvo localhost. Usa HTTPS en staging y producción.

### Selección de destino

Permite buscar direcciones/lugares con sugerencias reales, elegir un resultado, tocar el mapa para fijar destino, mover el pin, editar origen y confirmar punto de recogida. Diferencia visualmente origen, destino, paradas, pasajero y conductor. Guarda dirección legible y coordenadas, no solo texto. Muestra distancia y duración si el motor de rutas las proporciona.

## 7. Favoritos

Permite guardar, editar y eliminar lugares:
- Casa.
- Trabajo.
- Otros lugares personalizados.

Cada favorito guarda nombre elegido, dirección legible, latitud, longitud, usuario propietario y fechas. Los favoritos deben persistir en backend y estar asociados a la cuenta autenticada; no solo en estado local del navegador.

## 8. Modalidades de viaje

Implementa un selector original de modalidades:

### Solo ida
Recogida → destino final. Calcula un único trayecto.

### Ida y vuelta
Recogida → destino → regreso al origen o a otro punto de retorno. Define si es espera del conductor o dos trayectos separados. Explica el cálculo. No asumas que el precio es automáticamente el doble. Si hay espera, permite definir duración y tarifa asociada solo si la regla de negocio está aprobada.

### Multiparada
Permite añadir, eliminar y reordenar paradas intermedias. Calcula la ruta completa, refleja el orden, recalcula cotización ante cada cambio y valida límites desde backend. Evita puntos duplicados o rutas accidentales.

La modalidad debe quedar registrada en la solicitud, cotización, información del conductor e historial. Crea microcopy e iconografía propios, sin copiar nombres o diseño distintivo de competidores.

## 9. Tarifador real — prioridad crítica

Audita el endpoint de tarifas existente. El documento de migración anterior mencionaba una fórmula de prueba con base, distancia y tiempo; no la presentes como tarifa comercial definitiva. Identifica dónde está implementada y conviértela en reglas configurables si corresponde, con aprobación del propietario.

El tarifador puede considerar:
- Zona de origen/destino.
- Distancia real de routing.
- Duración estimada.
- Modalidad (ida, ida y vuelta, multiparada).
- Cantidad y ubicación de paradas.
- Espera, si aplica.
- Tipo de vehículo/servicio, si existe.
- Mínimos, máximos y reglas por zona aprobadas.
- Ajustes por horario/demanda solo si hay regla aprobada y transparente.

Reglas:
1. El cálculo definitivo ocurre en backend.
2. El frontend nunca es autoridad del precio.
3. Parámetros y tarifas se guardan de forma persistente y son editables solo por roles autorizados.
4. Cada cotización tiene ID, fecha, moneda, desglose y vencimiento.
5. El backend recalcula/valida al crear el viaje.
6. El cliente no puede manipular distancia, duración ni precio.
7. Registra desglose para auditoría.
8. Usa aritmética decimal apropiada para dinero, no operaciones de coma flotante sin control.
9. Define redondeo, moneda y formato.
10. Si faltan rutas o tarifas configuradas, informa que no se puede cotizar; no inventes precio.
11. Muestra conceptos que componen el precio antes de confirmar.
12. Integra ofertas y contraofertas con las reglas de negociación existentes.

Antes de solicitar, muestra modalidad, origen, destino, paradas, distancia/duración si existen, precio estimado, desglose y vigencia. Recalcula si cambia la ruta o modalidad.

## 10. Solicitud, negociación y seguimiento

Conserva e integra el flujo:
1. Pasajero confirma ruta, modalidad y cotización.
2. Backend valida y crea solicitud.
3. Se buscan conductores disponibles en zona/radio configurable.
4. Conductores reciben solicitud real.
5. Aceptan, rechazan o negocian según reglas.
6. Pasajero recibe actualizaciones.
7. Se confirma conductor.
8. Se muestra información autorizada del conductor/vehículo.
9. Pasajero observa desplazamiento hacia recogida.
10. Conductor confirma llegada.
11. Se inicia viaje.
12. Se actualiza progreso.
13. Se finaliza viaje.
14. Se registra estado de pago.
15. Se solicita calificación.

Los estados y transiciones deben validarse en backend. El frontend no puede cambiar arbitrariamente el estado de un viaje.

### Socket.IO

Audita y conserva eventos existentes cuando sea posible:
- Autenticación del socket.
- Autorización por rol y viaje.
- Salas privadas.
- Actualizaciones de ubicación con frecuencia razonable.
- Validación de coordenadas y timestamps.
- Control de eventos duplicados.
- Reconexión y recuperación de estado.
- Gestión de desconexiones.
- No transmitir información privada a usuarios no autorizados.
- No confiar en eventos cliente para confirmar pagos o finalizar operaciones críticas.

Si el hosting serverless elegido no soporta WebSockets persistentes, no simules Socket.IO: aloja el backend en un servicio persistente compatible.

## 11. Mapas, GPS, geocoding y routing reales

Audita si ya existe proveedor de mapas/API. Si no, compara alternativas por cobertura, costo, cuotas, términos y facilidad de integración.

Funciones necesarias:
- Mapa navegable con zoom y desplazamiento.
- Ubicación actual del pasajero.
- Marcadores de recogida, destino, paradas y conductor.
- Ruta trazada.
- Geocodificación directa e inversa.
- Búsqueda de direcciones.
- Distancia y duración estimadas.
- Seguimiento de conductor.
- Ajuste del mapa para mostrar recorrido.
- Estados de carga/error y fallback.

Evalúa opciones como MapLibre GL JS o Leaflet para renderizado; OpenStreetMap con atribución; proveedor de geocoding de producción; OSRM, GraphHopper u otro motor de rutas; Google Maps Platform o Mapbox si justifican costo/calidad/cobertura. No asumas que ya hay cuentas o claves.

No uses el servidor público de Nominatim/OSM como API de producción ilimitada y gratuita. Revisa cuotas, atribución, políticas, caché y restricciones.

Crea adaptadores desacoplados como `MapProvider`, `GeocodingProvider` y `RoutingProvider`. Guarda claves en variables de entorno; nunca subas claves privadas al repositorio. Documenta variables en `.env.example` sin secretos. Si falta una clave, informa configuración pendiente; no muestres mapa falso.

## 12. Experiencia del conductor

Debe funcionar bien en móvil:
- Estado disponible/no disponible.
- Solicitudes entrantes reales.
- Origen, destino, modalidad, paradas y oferta.
- Aceptar/rechazar/contraofertar.
- Navegación hacia recogida.
- Confirmar llegada.
- Iniciar/finalizar viaje.
- Historial.
- Ingresos solo con datos reales.
- Documentos, verificación, perfil y vehículo.
- Notificaciones y soporte.

Al activar disponibilidad, solicita permiso de ubicación. No compartas ubicación cuando esté offline, salvo requisito explícito y consentido. Actualiza posición mientras está disponible/en viaje conforme a política de privacidad. Envía coordenadas, precisión y timestamp; valida en backend. Controla frecuencia y batería. Muestra cuándo se comparte ubicación y maneja GPS/conectividad/permisos revocados.

Una web/PWA puede tener limitaciones de rastreo en segundo plano en Android. No prometas tracking continuo con pantalla apagada equivalente a app nativa. Si es requisito, evalúa Capacitor o React Native como fase aparte y documenta permisos Android.

## 13. Android, emulador y PWA

Primero haz que la web móvil funcione bien en Android Chrome. Evalúa PWA:
- Manifest e iconos RUTA RIDES.
- Nombre y theme color.
- Instalación.
- Service worker solo si está bien implementado.
- Caché sin datos sensibles.
- Offline y recuperación de conexión.
- No cachear respuestas privadas de viajes.

Prepara guía reproducible de Android Studio Emulator:
- Crear dispositivo virtual Android.
- Abrir Chrome.
- Acceder a URL local/staging.
- Conceder permisos GPS.
- Simular coordenadas desde controles del emulador.
- Probar GPS denegado, ubicación imprecisa y GPS apagado.
- Rotación, teclado, tamaños, pérdida de internet y reconexión.
- Sesión persistente.
- Notificaciones si están implementadas.

Si backend corre local, recuerda que `localhost` dentro del emulador no siempre apunta al host. Documenta el alias de host del emulador Android o un túnel HTTPS de desarrollo, según corresponda.

Automatiza con herramientas ya instaladas o dependencias justificadas:
- Playwright para flujos y viewports móviles.
- Tests unitarios del tarifador.
- Tests API de auth, favoritos, cotización y viajes.
- Tests de permisos/estados GPS con mocks solo en test.
- Tests de integración Socket.IO.
- Pruebas de roles.

Documenta pruebas en Android físico conectado a la misma red o usando staging HTTPS: Chrome, GPS real, sesión al reabrir, destino, cotización, solicitud, seguimiento y reconexión.

## 14. Despliegue: Vercel y backend persistente

Evalúa publicación para pruebas. No asumas que todo debe vivir en Vercel.

### Vercel
Puede ser adecuado para frontend Next.js. Verifica compatibilidad de versión, variables, rewrites, dominio/HTTPS, previews, CORS y cookies.

No despliegues automáticamente Express + Socket.IO como funciones serverless si requiere proceso persistente y WebSockets duraderos. Las funciones serverless no equivalen a un servidor permanentemente activo.

### Backend
Compara servicios persistentes compatibles con Express y Socket.IO, por ejemplo Railway, Render, Fly.io o VPS. Evalúa costo actual, disponibilidad, persistencia, WebSockets, región, logs y escalabilidad. No afirmes planes gratuitos/precios sin verificarlos.

### Base de datos
SQLite puede seguir en desarrollo local. Para despliegue compartido, múltiples instancias y persistencia, evalúa PostgreSQL gestionado u otra base adecuada. No guardes `database.sqlite` en disco efímero serverless ni asumas que archivos locales sobreviven reinicios.

Antes de migrar: backup verificable, inventario de tablas/relaciones, plan, prueba de importación, integridad y rollback. Pide aprobación antes de ejecutar.

### Arquitectura de staging a evaluar
- Frontend Next.js: Vercel.
- Backend Express + Socket.IO: Railway/Render/Fly.io o VPS persistente.
- Base de datos persistente: PostgreSQL gestionado si la arquitectura lo requiere.
- Mapas/geocoding/routing: proveedores configurados por variables.
- HTTPS para frontend y API.

No cambies stack innecesariamente. Entrega pros/contras y costos solo si están verificados. Si faltan cuentas, secretos o autorización, deja pasos exactos; no afirmes que quedó publicado.

Separa entornos `development`, `staging` y `production`, con URLs, claves y bases distintas. No uses datos personales reales en staging.

## 15. Seguridad y privacidad de ubicación

Solicita permisos solo cuando la función los necesita y explica el uso. Permite búsqueda manual si el usuario deniega ubicación. Define retención y eliminación de datos. Protege favoritos, viajes y ubicación. Cada usuario solo puede leer sus datos y viajes autorizados. No expongas coordenadas del pasajero a conductores no asignados salvo lo mínimo necesario para la oferta. Evita coordenadas exactas en logs. Usa HTTPS, validación, rate limiting, CORS restringido y Socket.IO autenticado. No subas `.env`, claves ni certificados.

## 16. Administración

Mantén el panel administrativo existente:
- Usuarios/perfiles.
- Conductores/verificación.
- Viajes/estados.
- Tarifas/reglas del tarifador.
- Zonas de cobertura.
- Pagos.
- Cancelaciones.
- Radio de búsqueda.
- Notificaciones.
- Soporte/auditoría.

Muestra solo métricas reales. Cambios de tarifas deben guardar usuario, fecha, valor anterior, nuevo valor y motivo. Restringe acciones a roles autorizados.

## 17. Rebranding técnico

Actualiza referencias visibles a RAPIDITO/RUTA por RUTA RIDES donde corresponda: logo, metadata, títulos, favicon, manifest, textos, emails/notificaciones y documentación. No hagas reemplazos globales ciegos. No renombres tablas, columnas, modelos, enums, claims JWT, rutas API o eventos Socket.IO por estética si rompe compatibilidad. Conserva historial técnico relevante.

## 18. Fases de trabajo

**Fase 0 — Auditoría:** inspeccionar repositorio, estado Git, auth, roles, persistencia, sockets, mapas, GPS, routing, tarifador, hosting y pruebas. Crear `docs/ruta-rides/BASELINE-AUDIT.md` y clasificar funciones reales, incompletas, simuladas y bloqueadas.

**Fase 1 — Arquitectura:** definir adaptadores de mapas/geocoding/routing, favoritos, cotizaciones, modalidades, estados de viaje, sesión persistente, despliegue y Android. Crear `docs/ruta-rides/ARCHITECTURE.md`. No ejecutar migraciones destructivas.

**Fase 2 — Acceso y sesión:** pantalla inicial con dos opciones, registro/login, restauración de sesión, rutas protegidas y tests.

**Fase 3 — Mapa y ubicación:** permisos GPS, mapa interactivo, geocoding, origen/destino, fallback manual, rutas reales y pruebas Android.

**Fase 4 — Favoritos y modalidades:** favoritos persistentes, ida, ida y vuelta, multiparada, orden/validación de paradas.

**Fase 5 — Tarifador:** reglas backend, configuración administrativa, desglose, cotización y tests de distancia, tiempo, modalidades, moneda y redondeo.

**Fase 6 — Viajes y tracking:** solicitud, conductores, negociación, Socket.IO, seguimiento, estados y reconexión.

**Fase 7 — Conductor:** disponibilidad, GPS, solicitudes, navegación, viajes, historial y documentos.

**Fase 8 — Administración:** tarifas, zonas, usuarios, conductores, viajes, auditoría y soporte.

**Fase 9 — Android/QA:** responsive, PWA si procede, Android Studio Emulator, Chrome Android, pruebas GPS/red/sesión y reporte.

**Fase 10 — Staging/deploy:** frontend, backend persistente, base persistente, variables, CORS, HTTPS, deploy staging y prueba integral desde Android. Producción solo tras superar criterios.

No marques una fase como completada sin evidencia de ejecución y prueba.

## 19. Documentación obligatoria

Crear:
- `docs/ruta-rides/BASELINE-AUDIT.md`
- `docs/ruta-rides/ARCHITECTURE.md`
- `docs/ruta-rides/MAP-AND-GEOLOCATION.md`
- `docs/ruta-rides/FARE-ENGINE.md`
- `docs/ruta-rides/ANDROID-TESTING.md`
- `docs/ruta-rides/DEPLOYMENT.md`
- `docs/ruta-rides/QA-REPORT.md`
- `docs/ruta-rides/CHANGELOG.md`
- `docs/ruta-rides/IP-ASSET-REGISTER.md`

Documenta qué funciona, dependencias externas, proveedores, variables necesarias, pruebas de emulador/dispositivo, URLs de despliegue, pendientes y costos/cuotas verificados con fecha.

## 20. Criterios de aceptación

### Acceso
- La pantalla inicial ofrece “Soy pasajero” y “Soy conductor”.
- Registro/login funcionan.
- Sesión se restaura al recargar y reabrir.
- Roles validados en backend.

### Ubicación/mapa
- Usuario puede aceptar o denegar GPS.
- Con permiso, mapa muestra posición real.
- Sin permiso, puede indicar origen manualmente.
- Búsqueda devuelve direcciones reales.
- Destino seleccionable en mapa.
- Ruta/distancia provienen de servicio real.
- Nunca se muestra GPS simulado como real.

### Viajes
- Favoritos persistentes.
- Modalidades solo ida, ida y vuelta y multiparada.
- Paradas añadibles, eliminables y reordenables.
- Cotización cambia al modificar ruta/modalidad.
- Precio calculado/validado por backend.
- Solicitud llega a conductores conectados.
- Negociación/estados sincronizados.
- Seguimiento usa posición real y timestamp.
- Flujo de viaje completado sin errores críticos.

### Android/despliegue
- Staging abre en Android Chrome y emulador.
- Permisos GPS funcionan.
- HTTPS activo.
- Sesión persiste.
- Frontend y backend se comunican.
- Socket.IO funciona en hosting elegido.
- Datos sobreviven reinicios y deploys.
- Reporte de pruebas con evidencia.

### Calidad
- Lint, typecheck, tests y build ejecutados.
- Sin errores críticos ni controles muertos.
- Sin precios/métricas/ubicaciones ficticias.
- Sin cambios destructivos no aprobados.
- Sin assets sin licencia ni copia de competidores.

## 21. Instrucción para comenzar ahora

**Empieza por la Fase 0. No empieces creando una landing ni rediseñando pantallas sin auditoría.**

Entrega primero un diagnóstico concreto:
1. Qué funciona hoy.
2. Qué está simulado o incompleto.
3. Si GPS funciona realmente.
4. Si hay mapas, geocoding y routing configurados.
5. Cómo y dónde se calcula actualmente el precio.
6. Si la sesión persiste al cerrar y abrir.
7. Si Socket.IO funciona en el entorno actual.
8. Si la base de datos puede persistir en el hosting propuesto.
9. Qué se necesita para probar Android.
10. Qué arquitectura de staging recomiendas y qué servicios/variables faltan.

Después implementa por fases, priorizando:
**registro/login → sesión persistente → permiso GPS → mapa → origen/destino → modalidad → tarifador → solicitud → conductor → seguimiento → finalización.**

No te detengas por decisiones visuales reversibles. Solicita aprobación antes de migrar/borrar bases de datos, cambiar contratos API/eventos de sockets, contratar servicios o generar costos, cambiar proveedores con impacto financiero/legal, desplegar a producción o hacer cambios destructivos.

El resultado esperado es **RUTA RIDES, una plataforma de movilidad que funcione en la práctica**, no solo una interfaz atractiva.
