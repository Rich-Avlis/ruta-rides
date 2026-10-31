# PROMPT MAESTRO — RAPIDITO

## 1. CONTEXTO DEL PROYECTO

Quiero desarrollar una aplicación de transporte llamada **RAPIDITO**, inicialmente enfocada en **Quíbor, estado Lara, Venezuela**.

La aplicación debe funcionar como una plataforma tecnológica que conecte pasajeros con conductores disponibles, permitiendo solicitar viajes, visualizar conductores cercanos, conocer el precio estimado, negociar la tarifa, hacer seguimiento del conductor en tiempo real y gestionar el pago.

La aplicación debe ser **UNA SOLA APP**, no dos aplicaciones separadas.

Al registrarse, el usuario podrá seleccionar inicialmente:

- Pasajero
- Conductor

La arquitectura debe permitir que en el futuro un mismo usuario pueda tener ambos roles y cambiar entre ellos sin crear otra cuenta.

La plataforma debe construirse con arquitectura profesional, escalable, segura y preparada para crecer desde Quíbor hacia otras ciudades de Venezuela.

---

# 2. OBJETIVO PRINCIPAL

Crear una experiencia similar a las plataformas modernas de movilidad, pero adaptada al mercado venezolano.

El flujo principal debe ser:

**PASAJERO**

Ubicación → Destino → Precio estimado → Negociación → Conductores cercanos → Solicitud → Conductor acepta → Seguimiento en tiempo real → Llegada → Viaje → Pago → Calificación.

**CONDUCTOR**

Conectarse → Recibir solicitudes cercanas → Ver información del pasajero → Aceptar/rechazar/negociar → Navegar hacia pasajero → Confirmar llegada → Iniciar viaje → Navegación → Finalizar viaje → Registrar pago → Recibir ganancias.

---

# 3. MARCA

Nombre:

**RAPIDITO**

La identidad visual debe transmitir:

- Rapidez
- Seguridad
- Tecnología
- Confianza
- Cercanía
- Movilidad
- Facilidad de uso

## Paleta de Colores

### Color Principal: Naranja Vivaz
- **Primario**: `#FF6B00` (Naranja Vivaz)
- **Secundario**: `#FF8C33` (Naranja Claro)
- **Acento**: `#E55A00` (Naranja Oscuro)

### Colores Complementarios
- **Gris Oscuro**: `#333333` (Texto principal)
- **Gris Medio**: `#666666` (Texto secundario)
- **Blanco**: `#FFFFFF` (Fondos claros)
- **Negro**: `#1A1A1A` (Modo oscuro)

### Colores de Estado
- **Éxito**: `#4CAF50` (Verde)
- **Advertencia**: `#FFC107` (Amarillo)
- **Error**: `#F44336` (Rojo)
- **Info**: `#2196F3` (Azul)

### Justificación del Color
- **Alta visibilidad**: El naranja es el color estándar internacional para taxis y transporte, garantizando máxima visibilidad en carretera
- **Seguridad vial**: Cumple con normas de visibilidad nocturna y diurna
- **Diferenciación**: No es utilizado por competidores (Yummy=morado, Ridery=azul, Vamos=verde)
- **Merchandising**: Ideal para chalecos reflectivos de conductores
- **Asociación**: Rapidez, energía, confianza y cercanía

Diseño:

- Mobile-first
- Moderno
- Limpio
- Profesional
- Interfaz sencilla
- Mapas como elemento visual principal
- Animaciones sutiles
- Excelente experiencia de usuario

No utilizar una interfaz recargada.

El sistema debe estar preparado para modo claro y oscuro.

---

# 4. ROLES DEL SISTEMA

Implementar RBAC.

Roles:

- PASSENGER
- DRIVER
- ADMIN
- SUPPORT
- DOCUMENT_VERIFIER
- SUPER_ADMIN

La base de datos debe separar correctamente:

`User`

de:

`PassengerProfile`

y:

`DriverProfile`

Esto permitirá que un usuario pueda tener ambos perfiles en el futuro.

---

# 5. REGISTRO Y AUTENTICACIÓN

El registro debe solicitar inicialmente:

- Nombre (sin acentos ni caracteres especiales)
- Apellido (sin acentos ni caracteres especiales)
- Número de teléfono
- Correo electrónico
- Contraseña o autenticación segura
- Fotografía de perfil
- Rol inicial

## Validación de Nombres y Apellidos

**IMPORTANTE**: Los campos de Nombre y Apellido deben almacenarse SIN ACENTOS ni caracteres especiales para evitar problemas en la base de datos.

### Reglas de validación:
- Eliminar tildes y diéresis (á→a, é→e, í→i, ó→o, ú→u, ü→u)
- Eliminar ñ → reemplazar por n
- Eliminar caracteres especiales (, . ; : ¡ ! ¿ ? etc.)
- Solo permitir letras del alfabeto español (a-z, A-Z) y espacios
- Convertir a mayúsculas o mantener formato consistente

### Ejemplos:
- "José María" → "JOSE MARIA"
- "María José" → "MARIA JOSE"
- "Andrés" → "ANDRES"
- "Nuñez" → "NUNEZ"

### Implementación:
```javascript
// Función para limpiar nombres
function sanitizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z\s]/g, "") // Solo letras y espacios
    .toUpperCase();
}
```

Debe existir verificación del número telefónico mediante OTP.

Implementar:

- Login
- Logout
- Recuperación de contraseña
- Verificación telefónica
- Sesiones seguras
- JWT
- Refresh tokens
- Control de sesiones
- Protección contra intentos excesivos

No almacenar contraseñas en texto plano.

---

# 6. PERFIL DEL PASAJERO

El pasajero tendrá:

- Foto
- Nombre
- Apellido
- Teléfono
- Calificación
- Cantidad de viajes
- Puntos
- Nivel
- Código de referido
- Historial de viajes

La cantidad de viajes debe comenzar en:

**0**

Y mostrar:

**Viajes realizados: 0**

El contador solamente aumenta cuando un viaje pasa correctamente a:

`COMPLETED`

No aumentar por:

- Solicitudes canceladas
- Solicitudes rechazadas
- Viajes fraudulentos
- Viajes incompletos

---

# 7. PERFIL PÚBLICO DEL CONDUCTOR

Antes y durante una solicitud, el pasajero debe poder visualizar información suficiente para generar confianza.

Mostrar:

- Fotografía
- Nombre
- Calificación
- Cantidad de viajes completados
- Nivel/reputación
- Tipo de vehículo
- Marca
- Modelo
- Color
- Placa parcialmente protegida
- Tiempo estimado de llegada
- Estado disponible/ocupado

Ejemplo:

**Carlos M.**

⭐ 4.9

**327 viajes realizados**

🏍️ Honda XR

⚫ Negro

Placa: ABC•••

**Llegada estimada: 4 min**

La información sensible de documentos nunca debe ser pública.

---

# 8. UBICACIÓN

La ubicación es una funcionalidad fundamental.

## PASAJERO

El pasajero debe permitir ubicación para:

- Detectar ubicación actual
- Seleccionar punto de recogida
- Mostrar conductores cercanos
- Calcular distancia
- Calcular ETA
- Compartir ubicación durante el viaje

## CONDUCTOR

El conductor debe permitir ubicación para:

- Mostrar disponibilidad
- Recibir solicitudes cercanas
- Navegar hacia el pasajero
- Actualizar ubicación en tiempo real
- Calcular ETA
- Compartir posición durante el viaje

Si el conductor intenta ponerse:

**EN LÍNEA**

sin permisos de ubicación, mostrar:

> Para recibir viajes necesitas activar tu ubicación.

La aplicación debe solicitar solamente los permisos necesarios según el estado de la aplicación.

No mantener seguimiento permanente del pasajero cuando no existe un viaje activo.

---

# 9. CONDUCTORES CERCANOS

Cuando el pasajero indique origen y destino, mostrar:

- Conductores cercanos
- Distancia aproximada
- ETA
- Foto
- Nombre
- Calificación
- Viajes realizados
- Vehículo

El sistema debe utilizar geolocalización real.

No utilizar datos falsos.

Implementar búsqueda configurable:

- 500 m
- 1 km
- 2 km
- 5 km
- etc.

El administrador podrá modificar estos parámetros.

---

# 10. MAPAS Y RUTAS

Crear una abstracción:

`MapProvider`

para no depender permanentemente de un proveedor específico.

Debe soportar:

- Geocoding
- Reverse geocoding
- Rutas
- Distancia
- Tiempo estimado
- Coordenadas
- Navegación
- Seguimiento en tiempo real

El ETA debe calcularse utilizando rutas reales.

No utilizar:

> "4 minutos"

como dato inventado.

---

# 11. TARIFA

El pasajero debe colocar:

**¿A dónde quieres ir?**

Origen:

`Ubicación actual`

Destino:

`Seleccionar destino`

El sistema calculará:

- Distancia
- Tiempo estimado
- Tarifa base
- Tarifa por distancia
- Tarifa por tiempo
- Multiplicadores
- Descuentos
- Tarifa final sugerida

La configuración debe ser modificable desde ADMIN.

Variables:

```text
base_fare
minimum_fare
price_per_km
price_per_minute
zone_multiplier
demand_multiplier
night_multiplier
negotiation_min
negotiation_max
discount
rounding
```

---

# 12. TARIFA DE REFERENCIA INICIAL — QUÍBOR

Utilizar como referencia inicial:

**Urbanización Jacinto Lara → Plaza Bolívar = $1.00**

IMPORTANTE:

Este valor es únicamente una referencia inicial para calibrar el sistema.

NO convertirlo en una tarifa fija universal.

El administrador debe poder configurar rutas, zonas y tarifas.

Crear una estructura:

`RoutePrice`

que permita almacenar:

- Origen
- Destino
- Distancia
- Tarifa sugerida
- Tarifa mínima
- Tarifa máxima
- Estado
- Fecha de actualización

---

# 13. NEGOCIACIÓN DE TARIFA

El pasajero podrá realizar una oferta.

Ejemplo:

Tarifa sugerida:

**$1.50**

Pasajero:

**Ofrecer $1.20**

El conductor podrá:

- Aceptar
- Rechazar
- Contraofertar

Ejemplo:

Conductor:

**Contraoferta $1.40**

El pasajero podrá:

- Aceptar
- Rechazar
- Hacer nueva oferta

Debe existir un límite de tiempo para las ofertas.

Todas las negociaciones deben almacenarse.

Entidad:

`RideNegotiation`

Guardar:

- Usuario
- Oferta
- Contraoferta
- Fecha
- Hora
- Estado

Estados:

- PENDING
- ACCEPTED
- REJECTED
- COUNTERED
- EXPIRED
- CANCELLED

La tarifa final debe ser validada siempre en backend.

---

# 14. SOLICITUD DEL VIAJE

Al solicitar un viaje:

Crear:

`Ride`

Estados:

```text
REQUESTED
SEARCHING_DRIVER
DRIVER_ASSIGNED
DRIVER_EN_ROUTE
DRIVER_ARRIVED
TRIP_STARTED
TRIP_COMPLETED
PAYMENT_PENDING
COMPLETED
CANCELLED
```

El sistema debe registrar todos los cambios de estado.

---

# 15. TIEMPO REAL

Implementar comunicación en tiempo real.

Preferentemente:

- WebSockets
- Socket.IO
- Redis Pub/Sub cuando sea necesario

El pasajero debe visualizar en tiempo real:

- Movimiento del conductor
- Distancia aproximada
- ETA
- Cambio de estado

El conductor debe visualizar:

- Ubicación del pasajero
- Ruta hacia el pasajero
- Cambios en la solicitud
- Estado del viaje

El administrador debe visualizar:

- Conductores conectados
- Conductores disponibles
- Viajes activos
- Solicitudes
- Viajes completados
- Viajes cancelados

Sin necesidad de actualizar manualmente la página.

---

# 16. LLAMADA DEL CONDUCTOR

Cuando un conductor acepte una solicitud:

Mostrar:

> El conductor se pondrá en contacto contigo para confirmar tu ubicación.

Debe existir una opción:

**Llamar al pasajero**

El sistema debe quedar preparado para implementar posteriormente:

- Llamadas enmascaradas
- VoIP
- Protección de números personales

No exponer innecesariamente números telefónicos en la interfaz.

---

# 17. INFORMACIÓN DEL PASAJERO PARA EL CONDUCTOR

Antes de aceptar un viaje, el conductor podrá ver información mínima necesaria:

- Foto
- Nombre
- Calificación
- Cantidad de viajes
- Punto aproximado de recogida
- Destino
- Tarifa
- Oferta realizada

No mostrar información sensible innecesaria.

---

# 18. CAPTURA GUIADA DE DOCUMENTOS DEL CONDUCTOR

ESTA FUNCIONALIDAD ES OBLIGATORIA.

No implementar simplemente un botón:

> "Subir documento"

Crear una experiencia de:

## CAPTURA GUIADA

La aplicación debe abrir una cámara interna y mostrar una guía visual dependiendo del documento solicitado.

Cada documento tendrá su propia configuración.

---

# 19. DOCUMENTOS REQUERIDOS

El sistema debe permitir configurar los documentos requeridos por modalidad de vehículo.

Inicialmente contemplar:

### IDENTIFICACIÓN

- Cédula / documento de identidad
- Fotografía del conductor

### CONDUCTOR

- Licencia de conducir
- Certificado médico

### VEHÍCULO

- Documento del vehículo
- Seguro
- Fotografías del vehículo
- Documentación tributaria/solvencias o "trimestres", según corresponda a los requisitos legales aplicables

### CASCOS

- Fotografía del casco del conductor
- Fotografía del casco destinado al pasajero

Las exigencias definitivas deberán poder configurarse según la normativa aplicable.

---

# 20. GUÍAS VISUALES

Ejemplo para documento:

Mostrar en pantalla:

```text
┌─────────────────────────┐
│                         │
│    COLOCA EL DOCUMENTO  │
│       DENTRO DEL MARCO  │
│                         │
└─────────────────────────┘
```

Indicaciones:

**✓ Documento completo**

**✓ Buena iluminación**

**✓ Texto legible**

**✕ Evita reflejos**

**✕ No cortes las esquinas**

**✕ No utilices fotografías borrosas**

La interfaz debe mostrar una guía visual diferente según el tipo de captura.

---

# 21. CAPTURA DE VEHÍCULO

Para fotografías del vehículo:

### FOTOGRAFÍA FRONTAL

Mostrar una silueta/guía indicando dónde posicionar el vehículo.

### FOTOGRAFÍA TRASERA

Mostrar guía equivalente.

### FOTOGRAFÍA LATERAL

Permitir mostrar correctamente el vehículo completo.

El sistema debe intentar detectar:

- Que el vehículo esté dentro del encuadre
- Que exista iluminación suficiente
- Que la imagen tenga calidad suficiente

---

# 22. CAPTURA DE CASCOS

Para cada casco:

Mostrar una guía visual.

Debe quedar claramente visible:

- Casco completo
- Estado general
- Características identificables

Separar:

**Casco del conductor**

y

**Casco del pasajero**

cuando corresponda.

---

# 23. CAPTURA DE FOTO DEL CONDUCTOR

La fotografía debe realizarse preferiblemente desde la cámara de la aplicación.

Mostrar una guía facial.

Ejemplo:

> Coloca tu rostro dentro del marco.

Validar calidad:

- Rostro visible
- Buena iluminación
- Imagen enfocada
- Sin obstrucciones importantes

---

# 24. VALIDACIÓN AUTOMÁTICA DE CALIDAD

Antes de enviar un documento a revisión:

El sistema debe validar técnicamente:

- Resolución mínima
- Nitidez
- Iluminación
- Documento completo
- Bordes/esquinas visibles cuando corresponda
- Orientación
- Ausencia de desenfoque excesivo
- Legibilidad aproximada
- Reflejos excesivos

Si no cumple:

Mostrar:

> ⚠️ La imagen no es suficientemente clara.

> Vuelve a tomar la fotografía para que podamos verificar correctamente la información.

Botón:

**Tomar nuevamente**

---

# 25. IMPORTANTE: CALIDAD NO SIGNIFICA AUTENTICIDAD

El sistema NO debe afirmar automáticamente que un documento es auténtico únicamente porque pasó la validación de imagen.

Separar:

### VALIDACIÓN DE CALIDAD

Automática.

de:

### VALIDACIÓN DOCUMENTAL

Administrativa/manual y/o mediante mecanismos externos autorizados cuando estén disponibles.

Estados:

```text
PENDING
UNDER_REVIEW
APPROVED
REJECTED
EXPIRED
SUSPENDED
```

---

# 26. PANEL DE DOCUMENTACIÓN DEL CONDUCTOR

Mostrar:

## Mi documentación

Cédula  
🟢 Aprobada

Licencia  
🟢 Aprobada

Certificado médico  
🟡 En revisión

Seguro  
🟢 Aprobado

Documento del vehículo  
🔴 Rechazado

Progreso:

**8/10 documentos aprobados**

El conductor podrá conocer qué documentos faltan o deben corregirse.

---

# 27. RECHAZO DE DOCUMENTOS

Cuando un documento sea rechazado:

Mostrar:

- Documento
- Motivo
- Fecha
- Estado
- Opción para volver a capturarlo

Ejemplo:

> Documento rechazado.

> Motivo: La imagen está borrosa y no permite leer la información.

Botón:

**Volver a capturar**

---

# 28. DOCUMENTOS PRESUNTAMENTE FALSOS

Si durante la revisión administrativa se determina que existe un documento presuntamente falso, adulterado o inconsistente:

- Rechazar documento
- Suspender o bloquear al conductor según política
- Registrar evento
- Crear AuditLog
- Impedir operaciones mientras corresponda
- Notificar al administrador

No permitir que el conductor vuelva a operar automáticamente.

Toda medida debe quedar auditada.

---

# 29. PRIVACIDAD DE DOCUMENTOS

Los documentos son información privada.

Nunca mostrar documentos completos públicamente.

El almacenamiento debe utilizar:

- S3 compatible
- URLs privadas
- URLs firmadas con expiración
- Control de acceso
- Cifrado cuando sea posible

El conductor solamente podrá consultar sus propios documentos.

Los verificadores solamente podrán consultar los documentos que tengan autorización para revisar.

Registrar accesos.

---

# 30. EXPIRACIÓN DE DOCUMENTOS

Cada documento debe permitir:

- Fecha de emisión
- Fecha de vencimiento
- Estado

Crear alertas:

> Tu licencia vence en 30 días.

> Tu seguro vence en 7 días.

Cuando un documento expire:

`EXPIRED`

El sistema puede impedir que el conductor se coloque en línea hasta actualizarlo, según la regla configurada.

---

# 31. PAGO

Métodos iniciales:

### EFECTIVO

El conductor confirma:

**Pago recibido**

### PAGOMÓVIL

El pasajero realiza el pago.

Debe poder:

- Mostrar instrucciones
- Registrar referencia
- Cargar comprobante
- Guardar fecha/hora
- Guardar monto
- Estado de verificación

Estados:

```text
PENDING
SUBMITTED
VERIFIED
REJECTED
```

La integración automática con entidades bancarias debe diseñarse mediante una abstracción para incorporarla posteriormente si existe una API autorizada.

---

# 32. COMISIÓN DEL CONDUCTOR

Implementar sistema de comisión configurable.

Regla inicial:

**$1 de comisión por cada $10 acumulados**

Crear:

`CommissionService`

La comisión debe manejarse mediante un ledger financiero.

Ejemplo:

Conductor genera:

$10

Comisión:

$1

Saldo neto:

$9

El sistema debe permitir modificar la regla desde ADMIN.

IMPORTANTE:

La lógica debe estar preparada para distinguir claramente:

- Ganancia bruta
- Comisión
- Ganancia neta
- Comisión pendiente
- Comisión pagada
- Saldo disponible
- Retiro

No realizar cálculos solamente en frontend.

---

# 33. BILLETERA DEL CONDUCTOR

Crear:

`DriverWallet`

Mostrar:

**Ganancias**

- Brutas
- Comisiones
- Netas
- Disponibles
- Pendientes
- Retiradas

Historial:

```text
Viaje #001
+$1.50

Comisión
-$0.15

Saldo
+$1.35
```

Todas las operaciones deben tener trazabilidad.

---

# 34. RETIROS

El conductor podrá solicitar retiro cuando cumpla las condiciones configuradas.

Crear:

`Withdrawal`

Estados:

```text
PENDING
PROCESSING
PAID
REJECTED
CANCELLED
```

El administrador podrá gestionar retiros.

---

# 35. SISTEMA DE PUNTOS

Crear sistema de fidelización.

El pasajero acumulará puntos por:

- Viajes
- Frecuencia
- Promociones
- Referidos
- Campañas especiales

Crear:

`LoyaltyAccount`

`LoyaltyTransaction`

`LoyaltyLevel`

Niveles iniciales:

- Bronze
- Silver
- Gold
- Premium

Los beneficios deben ser configurables.

---

# 36. DESCUENTO DE PRIMER VIAJE

Crear promoción configurable:

**Primer viaje**

Ejemplo:

`20% OFF`

No fijar el porcentaje en código.

Debe poder modificarse desde ADMIN.

Aplicar únicamente cuando corresponda.

Evitar abuso creando múltiples cuentas.

---

# 37. REFERIDOS

Cada usuario podrá tener:

**Código de referido**

Ejemplo:

`RAPID-RICH01`

Cuando una persona se registre mediante ese código:

Registrar:

`Referral`

La recompensa solamente se genera cuando el usuario referido realiza su primer viaje válido/completado.

Implementar controles antifraude.

---

# 38. CALIFICACIONES

Después de completar un viaje:

Pasajero califica conductor.

Conductor califica pasajero.

Escala:

⭐ 1–5

Permitir comentario opcional.

Calcular promedio.

Evitar manipulación del sistema.

---

# 39. SEGURIDAD DEL VIAJE

Preparar arquitectura para:

- Botón de emergencia
- Contacto de emergencia
- Compartir viaje
- Historial de ubicación
- Reportar incidente
- Bloquear usuario
- Reportar conductor
- Reportar pasajero

Estas funcionalidades pueden estar marcadas como fase posterior si no entran en el MVP.

---

# 40. PANEL ADMINISTRATIVO

Crear un dashboard profesional.

Debe mostrar información en tiempo real.

## KPIs

- Usuarios registrados
- Pasajeros
- Conductores
- Conductores online
- Conductores ocupados
- Conductores en revisión
- Viajes solicitados
- Viajes activos
- Viajes completados
- Viajes cancelados
- Ingresos totales
- Comisiones
- Ganancias de conductores
- Retiros pendientes

---

# 41. ACTUALIZACIÓN EN TIEMPO REAL

Los indicadores del dashboard deben actualizarse automáticamente.

Ejemplo:

Un viaje pasa de:

`REQUESTED`

a:

`COMPLETED`

El dashboard debe actualizar inmediatamente:

- Viajes completados
- Ingresos
- Comisiones
- Ganancias
- Estadísticas

No depender de refrescar manualmente el navegador.

---

# 42. MAPA ADMINISTRATIVO

Mostrar mapa en tiempo real con:

- Conductores disponibles
- Conductores ocupados
- Conductores desconectados
- Viajes activos
- Solicitudes pendientes

Al seleccionar un conductor:

Mostrar:

- Nombre
- Estado
- Ubicación
- ETA
- Vehículo
- Viajes completados
- Calificación

---

# 43. GESTIÓN DE CONDUCTORES

ADMIN podrá:

- Buscar
- Filtrar
- Ver perfil
- Ver documentación
- Aprobar
- Rechazar
- Suspender
- Reactivar
- Ver historial
- Ver viajes
- Ver calificaciones
- Ver ganancias

---

# 44. CENTRO DE VERIFICACIÓN DOCUMENTAL

Crear una interfaz especial para:

`DOCUMENT_VERIFIER`

Mostrar cola:

**Documentos pendientes de revisión**

Cada registro debe mostrar:

- Conductor
- Documento
- Fecha
- Estado
- Calidad de imagen
- Acciones

Acciones:

**Aprobar**

**Rechazar**

**Solicitar nueva captura**

El verificador debe escribir un motivo cuando rechace.

---

# 45. AUDITORÍA

Crear:

`AuditLog`

Registrar acciones críticas:

- Login
- Cambio de rol
- Aprobación de conductor
- Rechazo de documento
- Suspensión
- Cambio de tarifa
- Cambio de comisión
- Cambio de promoción
- Cambio de saldo
- Retiro
- Modificación de viaje
- Acceso a documento privado

Registrar:

- Usuario
- Acción
- Fecha
- IP cuando corresponda
- Metadata
- Entidad afectada

---

# 46. BASE DE DATOS

Utilizar PostgreSQL + Prisma.

Entidades principales:

```text
User
UserRole
PassengerProfile
DriverProfile
Vehicle
DriverDocument
VehicleDocument
Ride
RideOffer
RideNegotiation
RideLocation
Payment
PaymentProof
DriverWallet
WalletTransaction
Commission
Withdrawal
Rating
Review
Referral
ReferralReward
LoyaltyAccount
LoyaltyTransaction
LoyaltyLevel
Promotion
Coupon
Zone
RoutePrice
TariffConfiguration
Notification
SupportTicket
AuditLog
SystemConfiguration
LegalDocument
Consent
EmergencyContact
```

Crear relaciones correctamente.

Utilizar índices para:

- Geolocalización
- Viajes
- Conductores
- Estados
- Fechas
- Usuarios

---

# 47. STACK TECNOLÓGICO

Frontend:

- Next.js
- React
- TypeScript

Backend:

- Node.js
- NestJS
- TypeScript

Database:

- PostgreSQL
- Prisma ORM

Realtime:

- Socket.IO
- Redis

Storage:

- S3 compatible

Notificaciones:

- Firebase Cloud Messaging

Autenticación:

- JWT
- Refresh Tokens
- OTP

Mapas:

Crear `MapProvider` abstraction.

---

# 48. ARQUITECTURA

Separar:

```text
apps/
  web/
  api/

packages/
  ui/
  types/
  config/
  validation/
```

Backend modular:

```text
auth
users
passengers
drivers
vehicles
documents
rides
negotiation
payments
wallet
commissions
ratings
loyalty
referrals
notifications
maps
admin
audit
support
```

Utilizar arquitectura preparada para crecimiento.

---

# 49. VALIDACIONES

Toda información crítica debe validarse en backend.

Nunca confiar solamente en frontend para:

- Tarifas
- Descuentos
- Puntos
- Comisiones
- Saldos
- Estados de viaje
- Permisos
- Roles
- Documentos
- Retiros

Evitar manipulación mediante DevTools.

---

# 50. DATOS DEMO

No utilizar datos falsos en producción.

Si se necesitan datos para desarrollo:

marcarlos claramente como:

`DEMO`

Crear seed separado.

---

# 51. CONFIGURACIÓN ADMINISTRABLE

El administrador debe poder modificar sin cambiar código:

- Tarifas
- Tarifas mínimas
- Radio de búsqueda
- Comisión
- Descuentos
- Puntos
- Niveles
- Promociones
- Documentos requeridos
- Expiración
- Reglas de disponibilidad
- Zonas
- Rutas

---

# 52. DOCUMENTACIÓN LEGAL

La aplicación debe estar preparada para mostrar y registrar aceptación de:

- Términos y condiciones
- Política de privacidad
- Política de uso de ubicación
- Política de pagos
- Política de cancelaciones
- Política de promociones
- Política de referidos
- Política de tratamiento de documentos
- Reglas para conductores
- Reglas para pasajeros
- Política de seguridad

Guardar:

- Versión del documento
- Usuario
- Fecha
- Hora
- Versión aceptada

Crear:

`Consent`

---

# 53. CONSIDERACIONES LEGALES — VENEZUELA

El proyecto debe diseñarse como una plataforma tecnológica de intermediación de servicios de transporte, pero **no asumir que esta denominación elimina las obligaciones legales relacionadas con el transporte**.

Antes de operar comercialmente se debe validar con asesoría jurídica venezolana y las autoridades competentes, especialmente:

- INTT
- Autoridad municipal correspondiente
- Normativa de transporte terrestre
- Requisitos específicos para transporte individual
- Requisitos específicos para moto-taxi si aplica
- Documentación de conductores
- Documentación de vehículos
- Seguros
- Obligaciones fiscales
- Registro mercantil
- RIF
- Patente/licencia municipal cuando corresponda
- Protección y tratamiento de datos
- Obligaciones frente al consumidor
- Reglas de publicidad y promociones

El software debe permitir adaptar los requisitos documentales y operativos cuando cambie la normativa.

No hardcodear requisitos legales que puedan cambiar.

---

# 54. SEPARACIÓN DE RESPONSABILIDADES

La arquitectura legal y contractual debe permitir distinguir:

### RAPIDITO

Plataforma tecnológica/intermediación.

### CONDUCTOR

Prestador del servicio de transporte, sujeto a los requisitos legales que correspondan.

### PASAJERO

Usuario que solicita el servicio.

La documentación contractual definitiva deberá ser revisada por un abogado venezolano.

---

# 55. PRIVACIDAD Y PROTECCIÓN DE INFORMACIÓN

La aplicación manejará información sensible y de ubicación.

Implementar:

- Consentimiento
- Minimización de datos
- Control de acceso
- Cifrado
- Logs
- URLs privadas
- Eliminación/retención configurable
- Políticas de privacidad
- Protección de ubicación
- Protección de documentos

No exponer:

- Cédula
- Licencia
- Seguro
- Documento del vehículo
- Datos bancarios
- Coordenadas innecesarias
- Teléfono personal innecesariamente

---

# 56. EXPERIENCIA DEL PASAJERO

La pantalla principal debe ser extremadamente sencilla.

Ejemplo:

```text
RAPIDITO

¿A dónde quieres ir?

📍 Tu ubicación actual

🔎 ¿Cuál es tu destino?

-----------------------

Conductores cercanos

Carlos M.
⭐ 4.9
327 viajes
Honda XR
4 min

María R.
⭐ 4.8
185 viajes
5 min
```

---

# 57. EXPERIENCIA DEL CONDUCTOR

Pantalla principal:

```text
RAPIDITO

Estado

🔴 DESCONectado

[ PONERME EN LÍNEA ]

Ganancias de hoy
$18.50

Viajes
12

Calificación
⭐ 4.9
```

Al ponerse online:

```text
🟢 ESTÁS EN LÍNEA

Buscando solicitudes cercanas...
```

---

# 58. SOLICITUD DEL VIAJE PARA EL CONDUCTOR

Mostrar:

```text
NUEVA SOLICITUD

👤 Juan Pérez
⭐ 4.8
23 viajes

📍 Recogida
Urbanización Jacinto Lara

📍 Destino
Plaza Bolívar

💰 Oferta
$1.20

[ ACEPTAR ]

[ CONTRAOFERTAR ]

[ RECHAZAR ]
```

---

# 59. FINALIZACIÓN DEL VIAJE

Al llegar:

Conductor:

**Finalizar viaje**

Sistema:

- Registrar hora
- Registrar ubicación
- Calcular duración
- Calcular distancia
- Confirmar tarifa
- Registrar pago
- Calcular comisión
- Actualizar wallet
- Actualizar estadísticas
- Incrementar viajes
- Solicitar calificación

Todo debe ejecutarse de forma transaccional.

---

# 60. NOTIFICACIONES

Implementar:

- Push
- In-app
- Email cuando corresponda
- SMS/OTP cuando corresponda

Eventos:

- Solicitud recibida
- Solicitud aceptada
- Contraoferta
- Conductor acercándose
- Conductor llegó
- Viaje iniciado
- Viaje finalizado
- Pago
- Documento aprobado
- Documento rechazado
- Documento próximo a vencer
- Retiro
- Promoción
- Referido

---

# 61. ESCALABILIDAD

Aunque inicialmente Rapidito operará en Quíbor:

La arquitectura debe estar preparada para:

- El Tocuyo
- Barquisimeto
- Cabudare
- Otras ciudades
- Nuevas zonas
- Nuevos vehículos
- Nuevos métodos de pago

No diseñar la aplicación únicamente para una ciudad.

Crear:

`City`

`Zone`

`VehicleType`

`ServiceType`

para permitir expansión futura.

---

# 62. FASES DE DESARROLLO

## FASE 1 — MVP

Implementar primero:

1. Registro
2. Login
3. Roles
4. Perfil pasajero
5. Perfil conductor
6. Ubicación
7. Mapas
8. Origen/destino
9. Cálculo de tarifa
10. Negociación
11. Conductores cercanos
12. Solicitud de viaje
13. Aceptación
14. ETA
15. Seguimiento en tiempo real
16. Llamada/contacto
17. Finalización
18. Efectivo
19. PagoMóvil con comprobante
20. Calificaciones
21. Documentación
22. Captura guiada
23. Validación de calidad
24. Revisión administrativa
25. Wallet
26. Comisión
27. Retiros
28. Dashboard administrativo
29. Auditoría

---

# 63. FASE 2

Agregar:

- Puntos
- Niveles
- Referidos
- Promociones
- Cupones
- Notificaciones avanzadas
- Estadísticas avanzadas
- Heatmap
- Contactos de emergencia
- Compartir viaje

---

# 64. FASE 3

Preparar:

- Integraciones de pago automatizadas
- Llamadas enmascaradas
- Sistema avanzado antifraude
- Verificación documental externa
- Inteligencia para asignación de conductores
- Predicción de demanda
- Expansión a otras ciudades
- Diferentes tipos de vehículos
- Diferentes categorías de servicio

---

# 65. REGLAS DE DESARROLLO

IMPORTANTE:

No crear una demo visual superficial.

Construir una aplicación funcional y estructurada.

Cada funcionalidad debe tener:

- UI
- Backend
- Base de datos
- Validaciones
- Manejo de errores
- Estados
- Seguridad
- Auditoría cuando corresponda

No colocar lógica crítica únicamente en frontend.

No utilizar información falsa como si fuera real.

No exponer secretos.

Utilizar `.env`.

Crear:

`.env.example`

Documentar todas las variables.

---

# 66. CALIDAD DEL CÓDIGO

Utilizar:

- TypeScript estricto
- ESLint
- Prettier
- Validación de schemas
- Manejo consistente de errores
- Logs estructurados
- Tests para lógica crítica
- Migraciones Prisma
- Seed DEMO separado

Crear componentes reutilizables.

Evitar duplicación de código.

---

# 67. SEGURIDAD

Implementar:

- Rate limiting
- Validación de inputs
- Sanitización
- RBAC
- Protección de endpoints
- Protección de documentos
- Protección de wallet
- Protección contra manipulación de tarifas
- Protección contra duplicación de promociones
- Protección contra fraude de referidos
- Logs de auditoría

---

# 68. RESULTADO ESPERADO

Quiero que OpenCode construya RAPIDITO como un producto real y escalable, no como una simple plantilla.

La aplicación debe sentirse como una plataforma moderna de movilidad.

La prioridad debe ser:

**Simplicidad + velocidad + seguridad + confianza + tiempo real.**

El pasajero debe sentir:

> "Sé cuánto voy a pagar, quién viene por mí y cuánto tardará."

El conductor debe sentir:

> "Sé quién solicita el viaje, cuánto voy a ganar y hacia dónde debo ir."

Y el administrador debe sentir:

> "Tengo control total de la operación en tiempo real."

---

# 69. PRINCIPIO FUNDAMENTAL

Construir primero correctamente la infraestructura.

No sacrificar:

- Seguridad
- Privacidad
- Integridad financiera
- Trazabilidad
- Escalabilidad

por rapidez de desarrollo.

La aplicación debe quedar preparada para evolucionar desde:

**Rapidito Quíbor**

hasta:

**Rapidito Venezuela**

sin tener que reconstruir todo el sistema.

# FIN DEL PROMPT