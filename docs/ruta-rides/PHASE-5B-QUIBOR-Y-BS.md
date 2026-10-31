# RUTA RIDES — Lugares de Quíbor, bolívares y administración

- **Fecha:** 2026-10-30
- **Alcance:** sugerencias solo de Quíbor, precio en Bs, tasa oficial, panel de
  administración y zonas corregidas.

---

## 1. Lugares de Quíbor

### Fuente

43 lugares reales extraídos de OpenStreetMap mediante Nominatim, acotados al área
de Quíbor:

```text
viewbox = -69.68,9.98,-69.56,9.88
bounded = 1
```

Categorías incluidas: farmacias, bancos, supermercados, panaderías, restaurantes,
hospitales, clínicas, colegios, plazas, parques, museo, mercados, policía, alcaldía,
combustible, licorerías, urbanización y sector.

Archivo: `backend/src/data/quiborPlaces.json`.

### Tabla `local_places`

| Campo | Tipo |
|---|---|
| id | UUID |
| nombre | VARCHAR(160) |
| categoria | VARCHAR(40) |
| direccion | VARCHAR(255) |
| lat, lng | FLOAT |
| osmId | VARCHAR(60) |
| activo | BOOLEAN |

- Índice único `(nombre, lat, lng)`.
- Se siembra al arrancar desde `src/seeders/localPlaces.js`.
- Tabla aditiva; no altera tablas existentes.

### Búsqueda

`GET /api/places/search?q=...`

1. Busca primero en el catálogo local con coincidencia sin acentos.
2. Ordena: nombre exacto, prefijo, contiene, categoría, dirección.
3. Si faltan resultados, completa con Nominatim **restringido a Quíbor**
   (`bounded=1`).
4. Deduplica por nombre y cercanía.

Resultado: sugerencias de Quíbor, no de Barquisimeto ni otras ciudades.

### Evidencia

```text
q=farmacia → 6 farmacias de Quíbor
q=banco    → 6 bancos de Quíbor
q=plaza    → Plaza Bolívar, Quíbor
q=Barquisimeto → solo lugares dentro de Quíbor (paradas locales)
```

La interfaz muestra nombre, categoría y dirección.

---

## 2. Precio en bolívares

### Tasa

`src/services/exchangeRateService.js`:

1. Si `TASA_CAMBIO_BS` es mayor que 0, se usa como tasa manual.
2. Si es 0, consulta la fuente oficial configurada:
   `https://ve.dolarapi.com/v1/dolares/oficial`.
3. Caché de 30 minutos.
4. Si la fuente falla, usa el último valor cacheado.
5. Si no hay tasa, devuelve `null`. Nunca inventa un monto.

Tasa verificada el 2026-10-30:

```text
889.2553 Bs/USD · fuente oficial · 2026-10-30
```

### Cálculo

El total en Bs se calcula en el backend desde el total en USD:

```text
totalBs = totalUSD × tasa
```

Se guarda dentro del desglose JSON de la cotización:

```json
{
  "totalBs": 1164.92,
  "tasaCambio": 889.2553,
  "monedaBs": "VES"
}
```

### Interfaz

`/passenger` muestra:

- **USD 1,31** como total cotizado.
- **Bs 1.164,92** para pago móvil o efectivo.
- **Tasa 889.2553 Bs/USD**.
- Si no hay tasa: “Tasa Bs no configurada”.

### Endpoint

```text
GET /api/rates/current → { rate: { rate, source, updatedAt } }
```

Requiere JWT.

---

## 3. Panel de administración

Ruta `/admin`, solo `ADMIN` y `SUPER_ADMIN`.

### Configuración

- `TASA_CAMBIO_BS` (0 = automática).
- `DESCUENTO_TARIFA`.
- `REDONDEO_TARIFA`.
- `TIEMPO_VIGENCIA_COTIZACION`.
- Muestra la tasa activa y su fuente.

### Tarifas

- Edición de base, por km, por minuto, mínima, nocturno, demanda y estado.
- `PUT /api/fares/:id` con lista blanca y validación numérica.

### Zonas

- Lista y edición del multiplicador.
- `PUT /api/admin/zones/:id` con lista blanca y multiplicador ≥ 1.

### Seguridad

- `PUT /api/admin/config` solo acepta claves permitidas.
- Se conserva la categoría existente de cada configuración.
- Pendiente: auditoría de cambios (usuario, fecha, valor anterior, motivo).

---

## 4. Zonas de Quíbor

Se reemplazaron las zonas de demostración de Barquisimeto por dos zonas
operativas de Quíbor:

| Zona | Cobertura aproximada | Multiplicador |
|---|---|---|
| Centro Quíbor | 9.9200–9.9335 lat, -69.6285–-69.6125 lng | 1.0 |
| Quíbor Norte | 9.9300–9.9450 lat, -69.6300–-69.6100 lng | 1.0 |

- Multiplicador editable desde `/admin`.
- Límites aproximados; el propietario puede ajustarlos.

---

## 5. Tests

```text
cd backend && npm test
11 tests · 11 pass
```

Incluye conversión a Bs con tasa y caso sin tasa.

---

## 6. Evidencia de ejecución

```text
local_places: 43 filas
GET /api/places/search?q=farmacia → 6 resultados de Quíbor
GET /api/rates/current → 889.2553 Bs/USD
POST /api/quotes (2.84 km, 5 min)
→ USD 1.31 · Bs 1164.92 · tasa 889.2553
PUT /api/admin/config con clave no permitida → solo aplica la permitida
PUT /api/fares/:id → 200
```

Frontend: búsqueda de “farmacia” muestra farmacias de Quíbor; la cotización muestra
USD y Bs; el panel `/admin` guarda configuración, tarifas y zonas.

---

## 7. Pendiente

- Ampliar el catálogo local con más comercios y urbanizaciones propias.
- CRUD de lugares locales desde administración.
- Auditoría de cambios de tarifas/configuración.
- Negociación con `NEGOCIACION_MIN/MAX`.
- Solicitud de viaje y máquina de estados.
- Pruebas Android.
