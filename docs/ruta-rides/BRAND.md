# RUTA RIDES — Identidad visual

- **Fecha:** 2026-10-30
- **Regla vigente:** la interfaz usa los colores del logo final: naranja, negro,
  blanco y gris.

## Paleta

| Uso | Token | Hex |
|---|---|---|
| Acción primaria | `ruta-500` | `#FD7624` |
| Hover / énfasis | `ruta-600` | `#E05F10` |
| Naranja profundo | `ruta-700` | `#B84A0C` |
| Fondo de marca suave | `ruta-50` | `#FFF3EC` |
| Borde de marca | `ruta-200` | `#FFC7A8` |
| Texto y superficies oscuras | `ink` | `#0B0B0B` |
| Gris del logo / secundario | `muted` / `asphalt` | `#5F5F5F` |
| Fondo de pantalla | `canvas` | `#F3F3F0` |
| Superficie | blanco | `#FFFFFF` |
| Bordes | `line` | `#0B0B0B` |

Contraste:

- Negro `#0B0B0B` sobre naranja `#FD7624` ≈ 7.9:1 (AA para texto normal).
- Blanco sobre naranja ≈ 2.7:1. Solo se usa en el logo, no en texto de interfaz.
- Negro sobre blanco ≈ 19:1.

Por eso los botones primarios usan **texto negro sobre naranja**.

## Logo

- Archivo final: `LOGO RUTA RIDES/LOGO FINAL DE RUTA RIDES.png` (5120×2160).
- Copia para la app: `frontend/public/brand/ruta-rides-final.png`.
- Variantes recortadas:
  - `frontend/public/brand/ruta-logo-black.png` (header y fondos claros).
  - `frontend/public/brand/ruta-logo-orange.png` (fondos oscuros).
- La entrada usa el banner completo. El header y login usan la variante negra.
- No se deforma ni recolorea el logo; solo se recortan márgenes transparentes.
- Assets anteriores conservados en `frontend/public/brand/` sin uso.

## Estilo brutalista

- Bordes negros de 2–3 px en tarjetas, botones, campos y separadores.
- Sombras sólidas sin difuminar: `6px 6px 0` y `3px 3px 0`.
- Sin esquinas redondeadas en componentes de interfaz.
- Etiquetas en mayúsculas, peso 800 y tracking amplio.
- Fondo de cuadrícula sutil de 28 px.
- Botones que se desplazan 3 px al presionar y reducen la sombra.
- Tarjetas de estadísticas alternando naranja, negro y blanco.
- Totales de tarifa en bloque negro con cifra naranja.
- Mapa con controles de Leaflet de borde negro y fondo blanco.

Implementado en `frontend/src/app/globals.css` (`@theme` y `@layer components`).
