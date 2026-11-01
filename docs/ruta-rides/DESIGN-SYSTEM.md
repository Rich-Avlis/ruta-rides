# RUTA RIDES · Modern Urban Mobility Design System

Identidad propia para una app de movilidad urbana en Quíbor.
Principio: **naranja señal sobre asfalto**. Una sola superficie limpia, un solo acento.

## 1. Principios

1. **El mapa manda.** El contenido se ordena alrededor del viaje, no al revés.
2. **Un acento.** El naranja `#FD7624` solo marca acción, estado activo y datos clave.
3. **Asfalto como contraste.** Los bloques negros (`#0B0B0B`) dan jerarquía sin ruido.
4. **Densidad móvil.** Zonas táctiles de 44 px mínimo, texto legible a una mano.
5. **Movimiento corto.** 140–220 ms, sin rebotes ni animaciones decorativas.

## 2. Tokens

Definidos en `frontend/src/app/globals.css` con `@theme`.

### Color

| Token | Valor | Uso |
| --- | --- | --- |
| `ruta-500` | `#FD7624` | Acción principal, acento, estado activo |
| `ruta-600` | `#E35C0D` | Hover y énfasis de texto sobre claro |
| `ruta-50` | `#FFF3EA` | Fondo de etiquetas y selección suave |
| `ink` | `#0B0B0B` | Texto principal, superficies de contraste |
| `graphite` | `#171717` | Hover de superficies negras |
| `muted` | `#6B6B6B` | Texto secundario |
| `line` | `#E7E7E3` | Bordes y separadores |
| `line-strong` | `#D4D4CF` | Bordes de campos |
| `canvas` | `#F4F4F1` | Fondo de la app |
| `surface` | `#FFFFFF` | Tarjetas y hojas |

### Tipografía

| Rol | Clase | Tamaño | Peso |
| --- | --- | --- | --- |
| Titular de portada | `.display` | 34–46 px | 900, tracking −3.5 % |
| Título de sección | `.headline` | 22 px | 900 |
| Etiqueta | `.eyebrow` | 10.5 px, mayúsculas, tracking 14 % | 800 |
| Cuerpo | base | 15–16 px | 400–500 |
| Metadato | `.meta` | 12 px | 600 |

### Forma y elevación

- Tarjetas: radio 24 px (`--radius-card`).
- Campos y botones: radio 16 px (`--radius-field`).
- Píldoras y chips: 999 px.
- Sombras: `card` (reposo), `soft` (flotante), `float` (hoja), `signal` (botón naranja).

### Movimiento

- `--dur-fast` 140 ms · `--dur-base` 220 ms · `--ease-out-soft`.
- Botones y tarjetas usan `active:scale-[0.985]`. Nada de animaciones infinitas.

## 3. Componentes

| Clase | Uso |
| --- | --- |
| `.card` / `.surface` | Bloque blanco con borde y sombra suave |
| `.surface-ink` | Bloque negro para contraste y datos |
| `.btn-primary` | Acción principal: naranja, texto negro |
| `.btn-ink` | Acción secundaria fuerte: negro, texto blanco |
| `.btn-secondary` | Acción neutra con borde |
| `.btn-ghost` | Acción terciaria sin fondo |
| `.icon-button` | Acción circular de 44 px |
| `.input-field` + `.field-label` | Formularios |
| `.pill` / `.pill-active` | Filtros y segmentos |
| `.eyebrow` | Etiqueta de sección |
| `.stat` / `.stat-ink` / `.stat-signal` | Métricas |
| `.sheet` | Hoja inferior del mapa |
| `.list-row` | Filas de perfil y ajustes |
| `.bottom-nav` | Navegación inferior con acento activo |

Compatibilidad: `.brutal-label`, `.brutal-tile` y `.brutal-strip` se mantienen como
alias del sistema nuevo para no romper pantallas existentes.

## 4. Patrones de pantalla

- **Portada:** fondo claro, logo, titular fuerte, tarjeta de ruta en vivo, CTA naranja.
- **Selección de rol:** hero negro + tarjetas numeradas.
- **Mapa pasajero:** mapa protagonista, hoja inferior blanca, acciones grandes y claras.
- **Panel conductor:** estado en línea con punto naranja, solicitudes en tarjetas.
- **Navegación:** barra inferior fija, translúcida, indicador naranja de 2 px en el ítem activo.

## 5. Accesibilidad

- Contraste mínimo AA: negro sobre naranja y blanco sobre negro.
- `:focus-visible` con anillo naranja de 3 px.
- Áreas táctiles ≥ 44 px.
- Etiquetas `aria-current`, `aria-live` en estados de carga.
- Respeto de `env(safe-area-inset-*)` en iOS y Android.

## 6. Reglas de uso

- No introducir morado, verde ni azul como acento de producto.
- No usar más de un naranja por bloque.
- No anidar tarjetas dentro de tarjetas; usar divisores.
- No usar sombras duras ni degradados de varios colores.
- Todo texto de acción en imperativo corto: "Pedir viaje", "Ponerme en línea".
