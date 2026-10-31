# RUTA RIDES — Fase 4: favoritos y modalidades

- **Fecha:** 2026-10-30
- **Alcance:** lugares favoritos persistentes y tres modalidades de viaje con
  recálculo real de ruta y tarifa.

---

## 1. Esquema

### Tabla nueva `favorite_places`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK users |
| label | ENUM `CASA`, `TRABAJO`, `OTRO` | máximo un CASA y un TRABAJO por usuario |
| nombre | VARCHAR(120) | texto del usuario |
| direccion | VARCHAR(255) | dirección legible |
| lat, lng | FLOAT | coordenadas |
| createdAt, updatedAt | DATETIME | |

- Índice por `userId`.
- Creación automática con `sequelize.sync({ force: false })`.
- **No se alteró ninguna tabla existente.**
- Respaldo previo: `backend/backups/database-20261030-090205.sqlite`.

### Modalidades

Se modelan en la petición de ruta y en la futura cotización. No se agregaron
columnas a `rides` todavía; la persistencia de la modalidad en el viaje se hará en
la fase de solicitudes con migración aprobada.

---

## 2. API de favoritos

```text
GET    /api/favorites              → { favorites: FavoritePlace[] }
POST   /api/favorites              → { favorite }
PUT    /api/favorites/:id          → { favorite }
DELETE /api/favorites/:id          → { message }
```

Reglas:

- JWT obligatorio; cada usuario solo ve y modifica sus favoritos.
- Validación de etiqueta, nombre, dirección y coordenadas.
- Máximo 20 favoritos por usuario.
- `409` si ya existe CASA o TRABAJO.
- `404` si el favorito no pertenece al usuario.

---

## 3. API de rutas

`POST /api/routes/preview` ahora acepta:

```json
{
  "origin": { "lat": 9.9287, "lng": -69.6222 },
  "destination": { "lat": 9.9258, "lng": -69.6208 },
  "stops": [{ "lat": 9.93, "lng": -69.625 }],
  "modalidad": "SOLO_IDA | IDA_VUELTA | MULTIPARADA",
  "tipo": "URBANA"
}
```

- `SOLO_IDA`: origen → destino.
- `IDA_VUELTA`: origen → destino → origen; distancia y tiempo incluyen el regreso.
- `MULTIPARADA`: origen → paradas en orden → destino; máximo 5 paradas.
- El servidor ignora `stops` si la modalidad no es multiparada.
- La tarifa se calcula con la distancia y duración reales del recorrido completo.

---

## 4. Interfaz

- Sección **Favoritos** en `/passenger`:
  - chips con etiqueta y nombre;
  - seleccionar un favorito fija el destino;
  - eliminar con confirmación visual inmediata;
  - guardar el destino actual como Casa, Trabajo u Otro.
- Selector de modalidad con `aria-pressed`:
  - **Solo ida**, **Ida y vuelta**, **Multiparada**.
- Multiparada:
  - lista ordenada de paradas;
  - agregar parada tocando el mapa;
  - quitar parada;
  - marcadores blancos para paradas en el mapa.
- El resumen muestra distancia, tiempo y tarifa del recorrido completo.
- El encuadre del mapa incluye origen, destino y paradas.

---

## 5. Evidencia

### Backend

```text
POST /api/favorites (CASA)         → 201
POST /api/favorites (CASA repetido) → 409
GET  /api/favorites                → 200 con el favorito del usuario
POST /api/routes/preview IDA_VUELTA   → 0.97 km, 2.1 min, USD 1.70
POST /api/routes/preview MULTIPARADA  → 1.30 km, 2.5 min, USD 1.90
```

### Frontend

```text
npm run lint  → limpio
npm run build → compila
```

Pruebas en navegador:

| Caso | Resultado |
|---|---|
| Favorito existente | Chip “Casa / Mi casa” visible |
| Tocar favorito | Fija el destino y calcula ruta |
| Solo ida | 500 m, 1 min |
| Ida y vuelta | 1.05 km, 3 min, tarifa mayor |
| Multiparada + parada en mapa | 1.26 km, 3 min, ruta con parada |
| Guardar favorito desde la UI | Se crea y aparece en la lista |
| Eliminar favorito | Desaparece de la lista |
| Consola | Sin errores de aplicación |

Los favoritos de prueba se eliminaron; la tabla quedó vacía.

---

## 6. Pendiente

- Persistir modalidad y paradas en el viaje (fase 6, con migración de `rides`).
- Cotización inmutable con modalidad y desglose por parada (fase 5).
- Recargo por parada o espera: aún no definido en la tabla `fares`.
- Favoritos desde el origen y edición de nombre/etiqueta en la UI (la API ya
  soporta `PUT`).
- Pruebas en Android y Chrome móvil.
