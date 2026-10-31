# RUTA RIDES — Fase 5: tarifador real y cotizaciones

- **Fecha:** 2026-10-30
- **Alcance:** motor de tarifa configurable, aritmética decimal, zonas, recargos,
  descuento, redondeo, cotización persistida con vigencia y tests.

---

## 1. Parámetros del Prompt maestro y su implementación

| Parámetro del MD | Dónde vive | Valor inicial |
|---|---|---|
| `base_fare` | `fares.tarifaBase` | 0.35 USD (URBANA) |
| `minimum_fare` | `fares.tarifaMinima` | 1.00 USD (URBANA) |
| `price_per_km` | `fares.precioPorKm` | 0.25 USD |
| `price_per_minute` | `fares.precioPorMinuto` | 0.05 USD |
| `zone_multiplier` | `zones.multiplicador` + `MULTIPLICADOR_ZONA_DEFAULT` | 1.0 |
| `demand_multiplier` | `fares.multiplicadorDemanda` | 1.0 |
| `night_multiplier` | `fares.multiplicadorNocturno` | 1.5 |
| `discount` | `DESCUENTO_TARIFA` (% sobre bruto) | 0 |
| `rounding` | `REDONDEO_TARIFA` (paso en USD) | 0.01 |
| `negotiation_min` | `NEGOCIACION_MIN` (fracción de la sugerida) | 0.5 |
| `negotiation_max` | `NEGOCIACION_MAX` (múltiplo de la sugerida) | 2.0 |
| Horario nocturno | `HORA_INICIO_NOCURNO` / `HORA_FIN_NOCURNO` | 22:00–05:00 |
| Moneda | `MONEDA` | USD |
| Vigencia de cotización | `TIEMPO_VIGENCIA_COTIZACION` | 15 min |

`negotiation_min` y `negotiation_max` ya están persistidos y disponibles para la
fase de negociación; el tarifador no los usa todavía.

## 2. Calibración inicial

El Prompt maestro §12 fija como referencia:

```text
Urbanización Jacinto Lara → Plaza Bolívar ≈ USD 1.00
```

Con los parámetros URBANA:

```text
base 0.35 + (1.5 km × 0.25) + (5 min × 0.05)
= 0.35 + 0.375 + 0.25
= 0.975 → tarifa mínima 1.00
```

Resultado: **USD 1.00**. No es una tarifa fija universal; todos los valores son
configurables en `fares` y `system_configs`.

Las tarifas SUBURBANA e INTERURBANA se recalibraron en la misma proporción.

## 3. Fórmula

Todo el dinero se calcula en centavos enteros:

```text
subtotal = base + distanciaKm × precioPorKm + duracionMin × precioPorMinuto
bruto    = subtotal × multiplicadorZona × multiplicadorDemanda × multiplicadorNocturno
descuento= bruto × (DESCUENTO_TARIFA / 100)
neto     = bruto - descuento
total    = max(neto, tarifaMinima)
total    = redondear(total, REDONDEO_TARIFA)
total    = max(total, tarifaMinima)
```

- La zona se detecta con point-in-polygon sobre el origen. Si hay varias zonas,
  se usa el mayor multiplicador. Sin coincidencia: `MULTIPLICADOR_ZONA_DEFAULT`.
- El horario nocturno cruza medianoche correctamente.
- El redondeo nunca puede dejar el total por debajo del mínimo.

### Archivos

- `src/services/fareCalculator.js`: cálculo puro, sin base de datos.
- `src/services/fareEngine.js`: carga tarifa, configuración y zonas.
- `src/services/rideRouteService.js`: ruta según modalidad y validación de paradas.
- `src/models/FareQuote.js`: cotización inmutable.
- `src/controllers/quoteController.js`: crear y consultar cotizaciones.

## 4. API de cotizaciones

```text
POST /api/quotes
{
  "origin":      { "lat": 9.9287, "lng": -69.6222, "direccion": "Centro" },
  "destination": { "lat": 9.9258, "lng": -69.6208, "direccion": "Plaza" },
  "stops": [],
  "modalidad": "SOLO_IDA | IDA_VUELTA | MULTIPARADA"
}
→ 201 { quote, route }

GET /api/quotes/:quoteId
→ 200 { quote, vigente }
```

- JWT obligatorio; solo el dueño puede leer su cotización (`404` para terceros).
- Rate limit: 30 cotizaciones/minuto.
- La cotización guarda origen, destino, paradas, distancia, duración, geometría,
  desglose, multiplicadores, moneda, `fareId`, total y `expiraEn`.
- El cliente no envía distancia, duración ni precio.
- Al crear una cotización se eliminan las vencidas del mismo usuario.
- Tabla nueva `fare_quotes` (aditiva). Respaldo previo de la base en
  `backend/backups/`.

## 5. Interfaz

- `/passenger` usa `POST /api/quotes` en lugar de una estimación suelta.
- Muestra:
  - distancia y tiempo reales;
  - total cotizado;
  - desglose base / distancia / tiempo / subtotal;
  - recargos y descuento si existen;
  - aviso de tarifa mínima;
  - aviso de recargo nocturno;
  - ID corto de cotización y hora de vencimiento.
- Si cambia origen, destino, paradas o modalidad, se genera una cotización nueva.
- El botón “Solicitar viaje” sigue deshabilitado hasta la fase 6.

## 6. Tests

`backend/test/fareCalculator.test.js` con `node:test`:

```text
npm test → 9 tests, 9 pass
```

Casos cubiertos:

1. Referencia Quíbor 1.5 km / 5 min → USD 1.00 por mínimo.
2. Recargo nocturno 1.5 desde las 22:00.
3. Multiplicador de zona.
4. Descuento porcentual.
5. Redondeo configurable a 0.10.
6. El redondeo no baja del mínimo.
7. Zona + demanda + noche combinados.
8. Point-in-polygon y fallback de zona.
9. Cruce de medianoche.

## 7. Evidencia en ejecución

```text
POST /api/quotes (Quíbor, 0.41 km, 1 min)
→ total 1.00, mínimo aplicado, moneda USD, vence en 15 min

POST /api/quotes (ruta 1.61 km, 2 min)
→ base 0.35, distancia 0.40, tiempo 0.10, subtotal 0.85, total 1.00

GET /api/quotes/:id con el dueño      → 200, vigente true
GET /api/quotes/:id con otro usuario  → 404
```

Interfaz: la cotización se muestra con desglose y hora de vigencia; consola sin
errores.

## 8. Pendiente

- Panel administrativo para editar tarifas, zonas y configuración con auditoría.
- Uso de `NEGOCIACION_MIN/MAX` en ofertas y contraofertas.
- Reglas de demanda aprobadas y transparentes (hoy el multiplicador es 1.0).
- Recargo por parada o espera: no definido por el propietario.
- Validación de cotización al crear el viaje (fase 6).
- Tests de integración HTTP de cotizaciones (hoy hay tests unitarios del cálculo).
