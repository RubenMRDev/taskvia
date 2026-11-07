---
name: Taskvia
description: Gestor local de proyectos con aspecto de cuaderno y tableros kanban de color.
colors:
  canvas: "#ffffff"
  sidebar-paper: "#f8f8f7"
  raised: "#ffffff"
  card: "#ffffff"
  card-hover: "#fafaf9"
  ink: "#37352f"
  ink-secondary: "#73726e"
  ink-tertiary: "#6f6e69"
  hover-wash: "rgba(55,53,47,.06)"
  active-wash: "rgba(55,53,47,.1)"
  hairline: "rgba(55,53,47,.09)"
  hairline-strong: "rgba(55,53,47,.16)"
  accent-blue: "#2383e2"
  accent-blue-deep: "#0077d4"
  on-accent: "#ffffff"
  accent-soft: "color-mix(in srgb, #2383e2 15%, transparent)"
  danger: "#d44c47"
  danger-soft: "rgba(212,76,71,.1)"
  done-green: "#448361"
  tag-gray-bg: "#e3e2e0"
  tag-gray-fg: "#32302c"
  tag-gray-strong: "#91918e"
  tag-brown-bg: "#eee0da"
  tag-brown-fg: "#442a1e"
  tag-brown-strong: "#9f6b53"
  tag-orange-bg: "#fadec9"
  tag-orange-fg: "#49290e"
  tag-orange-strong: "#d9730d"
  tag-yellow-bg: "#fdecc8"
  tag-yellow-fg: "#402c1b"
  tag-yellow-strong: "#cb912f"
  tag-green-bg: "#dbeddb"
  tag-green-fg: "#1c3829"
  tag-green-strong: "#448361"
  tag-blue-bg: "#d3e5ef"
  tag-blue-fg: "#183347"
  tag-blue-strong: "#337ea9"
  tag-purple-bg: "#e8deee"
  tag-purple-fg: "#412454"
  tag-purple-strong: "#9065b0"
  tag-pink-bg: "#f5e0e9"
  tag-pink-fg: "#4c2337"
  tag-pink-strong: "#c14c8a"
  tag-red-bg: "#ffe2dd"
  tag-red-fg: "#5d1715"
  tag-red-strong: "#d44c47"
  canvas-dark: "#191919"
  ink-dark: "#d4d4d4"
typography:
  display:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  body-doc:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  page-serif:
    fontFamily: "ui-serif, Georgia, Cambria, \"Times New Roman\", serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: "\"Cascadia Mono\", \"SFMono-Regular\", Menlo, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  md-heading-2:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
  md-heading-3:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI Variable Text\", \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  bar: "2px"
  logo: "5px"
  tag: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  column: "10px"
  dialog: "12px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  row: "28px"
  topbar: "44px"
  sidebar: "248px"
  column: "272px"
  page-gutter: "max(32px, min(96px, 7vw))"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  button-primary-hover:
    backgroundColor: "{colors.accent-blue-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  button-ghost-hover:
    backgroundColor: "{colors.hover-wash}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  button-danger-hover:
    backgroundColor: "{colors.danger-soft}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    size: "24px"
  icon-button-hover:
    backgroundColor: "{colors.hover-wash}"
    textColor: "{colors.ink}"
  tag:
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0 6px"
    height: "20px"
  sidebar-row:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "{spacing.row}"
  sidebar-row-selected:
    backgroundColor: "{colors.active-wash}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
  card-hover:
    backgroundColor: "{colors.card-hover}"
  column:
    rounded: "{rounded.column}"
    padding: "6px"
    width: "{spacing.column}"
  popover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "6px"
    width: "260px"
  input-search:
    backgroundColor: "{colors.hover-wash}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "30px"
  input-date:
    backgroundColor: "{colors.hover-wash}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "30px"
  glyph:
    textColor: "{colors.tag-blue-strong}"
    size: "1em"
  glyph-big:
    size: "64px"
  format-bubble:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.lg}"
    padding: "4px"
  due-badge:
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0 6px"
    height: "20px"
  column-collapsed:
    rounded: "{rounded.column}"
    width: "44px"
  calendar-day:
    backgroundColor: "{colors.canvas}"
    height: "112px"
  calendar-card:
    backgroundColor: "{colors.card}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 6px"
  attachment-thumb:
    backgroundColor: "{colors.sidebar-paper}"
    rounded: "{rounded.sm}"
    width: "56px"
    height: "40px"
  logo:
    backgroundColor: "#1f1e1c"
    textColor: "#f4f1ea"
    size: "22px"
---

# Design System: Taskvia

## Overview

**Creative North Star: "El cuaderno con columnas de color"**

Taskvia es una herramienta de escritorio local que se viste de cuaderno y trabaja como un tablero kanban. El cuaderno manda en todo lo que rodea al trabajo: lienzo blanco (o #191919 en oscuro), tinta cálida casi negra, barra lateral de papel gris, filas de 28px, títulos grandes en negrita con un icono Lucide grande encima y propiedades en tabla de dos columnas. El kanban entra sólo dentro del tablero: columnas teñidas con su color, tarjetas blancas con portada (de color o de imagen), etiquetas, fechas y adjuntos, y las vistas Lista y Calendario.

La densidad es la de una app de escritorio, no la de una web: texto base de 14px, controles de 24 a 30px, acciones que aparecen al pasar el ratón y atajos de teclado visibles (Ctrl K; `?` abre la ayuda de atajos). El color vive casi entero en los nueve colores de etiqueta; la interfaz en sí es neutra y el acento (azul por defecto) se reserva para la acción principal, el foco y la selección. Es una ventana Electron sin marco: la barra superior de 44px es la barra de título, arrastrable, con los botones nativos de Windows superpuestos sobre el mismo color que el lienzo.

No hay emojis en ningún sitio. Todo icono, de la interfaz o elegido por el usuario, es Lucide, servido como sprite local en `/icons.svg` (de `lucide-static`).

Sigue el tema de Ajustes (Sistema, Claro u Oscuro), que en Electron cambia el tema nativo y con él `prefers-color-scheme`: cada token tiene su valor oscuro (ver `.impeccable/design.json`, campo `dark`), y la barra nativa de la ventana cambia con él (#ffffff / #191919).

**Key Characteristics:**
- Neutros cálidos; el color lo ponen las etiquetas, las columnas, las portadas, el fondo del tablero y los iconos del usuario.
- Nueve familias de color de etiqueta (`.c-<color>`), cada una con tres tintas (fondo, texto, fuerte).
- Filas de 28px, texto de 14px, radios pequeños (3 a 12px).
- Profundidad casi nula: lavados de hover y sombras de contorno de 1px.
- Iconos Lucide en todo: trazo 1.75px a 16px en la interfaz; iconos de usuario guardados como `lucide:<nombre>:<color>`.

## Marca

- **Nombre:** Taskvia, en la cabecera de la barra lateral (14px, peso 600) y en el título de la ventana.
- **Logo:** una "T" en hueso **#f4f1ea** sobre un cuadrado redondeado de negro cálido **#1f1e1c** (radio 58/256). El palo de la T es la columna central y más larga de un tablero, flanqueada por una columna azul (#5b8def, la más corta) y otra verde (#5fb072). `public/icon.svg` (grande; Inicio a 56px) y `public/icon-small.svg` (16 a 48px) llevan el mismo dibujo, que es grueso y se lee igual en pequeño. La barra lateral y el favicon usan el pequeño; en la barra lateral, a 22px junto al nombre.
- Los colores del logo son sólo del logo: no son tokens de la interfaz ni se usan como acento.

## Colors

Una base neutra y cálida con un único acento, y una paleta de nueve colores de etiqueta que es la que da vida al tablero.

### Primary
El acento lo elige el usuario en Ajustes (azul #2383e2 por defecto; también morado #8a5cb0, verde #3f7a5a, naranja #b85c0a, rosa #b8437f, rojo #c4413c y grafito #6b6a66, cada uno con su tono de hover) y se aplica como `--accent` / `--accent-hover` sobre `:root`. Halo, foco y selección se derivan del acento con `color-mix`, así que todo lo que sigue vale para cualquiera de ellos.
- **Acento** (#2383e2): botón primario ("Nueva"), casillas marcadas, línea de soltar al arrastrar (tarjetas, columnas, proyectos), marca de opción elegida en menús, anillo del selector de color, estrella de favorito, interruptor encendido, número del día de hoy en el calendario y contorno interior de 2px de la vista lateral cuando se sueltan ficheros sobre ella. Hover en **Acento profundo** (#0077d4).
- **Halo** (`--accent-soft`, acento al 15%; 26% en oscuro): anillo de 2 a 3px de los campos en edición (compositor, renombrar columna, buscador del popover, campos de fecha, nueva nota) y fondo del día del calendario sobre el que se arrastra una tarjeta. El foco de teclado es un contorno de 2px con el acento al 60%; la selección de texto, al 28%.

### Secondary
- **Rojo aviso** (#d44c47): acciones destructivas (opción "Eliminar", botón rojo sólido de confirmar, borrar de la papelera) con lavado **Rojo suave** al pasar el ratón, y fondo del aviso de error. También el color del código en línea.
- **Verde hecho** (#448361): progreso de checklist (barra de 4px y mini barra de 64px) y contador "x/y" cuando está completo.

### Tertiary: los nueve colores de etiqueta
Gris, marrón, naranja, amarillo, verde, azul, morado, rosa y rojo, exactamente los de las propiedades de selección (`COLORS` en `public/js/util.js`). Cada uno es una familia de tres tintas que se activa con la clase `.c-<color>` sobre el elemento:
- **Fondo de etiqueta** (`--tag-bg`): relleno de la etiqueta y base de los tintes de columna, fondo de tablero y avisos.
- **Texto de etiqueta** (`--tag-fg`): texto sobre ese fondo.
- **Tinta fuerte** (`--tag-strong`): portada de color de tarjeta (32px) y de vista lateral (120px), punto de estado, muestra del selector de color e icono de usuario.

En oscuro los fondos pasan a tonos profundos y los textos a casi blancos (p. ej. azul #28456c / #dbe8f7 / #5e87c9).

Mezclas derivadas, todas con `color-mix(in srgb, …)`:
- **Tinte de columna**: fondo de etiqueta al 30% sobre el lienzo.
- **Fondo de tablero** (`.board-view.has-bg`): fondo de etiqueta al 32% sobre el lienzo, en toda la vista del tablero.
- **Tinta de columna** (`--col-ink`): tinta fuerte al 50% con el texto de etiqueta. Colorea el contador, los iconos de cabecera y pie y "Nueva tarjeta". Su hover es el fondo de etiqueta al 55% sobre transparente.
- **Aviso teñido y tarjeta de calendario vencida o próxima**: fondo de etiqueta al 30% sobre el lienzo o la tarjeta (45% en hover).

### Neutral
- **Lienzo** (#ffffff; oscuro #191919): área principal, vista lateral, barra de formato fija, barra de título nativa y días del calendario.
- **Papel de barra lateral** (#f8f8f7; oscuro #202020): barra lateral, bloques de código, cabeceras de tabla markdown, cajas de pista, notas, avisos neutros, miniaturas de adjunto y días fuera del mes.
- **Superficie elevada / tarjeta** (#ffffff; oscuro #252525): tarjetas, popovers, burbuja de formato, diálogos. Hover de tarjeta #fafaf9 (oscuro #2c2c2c).
- **Tinta** (#37352f; oscuro #d4d4d4): texto principal, títulos, pestaña de vista activa.
- **Tinta secundaria** (#73726e; oscuro #9b9b9b): filas sin seleccionar, metadatos, iconos de interfaz, etiquetas de propiedad, placeholders.
- **Tinta terciaria** (#6f6e69; oscuro #8f8f8f): placeholders de título, separadores de migas, contadores del árbol, flechas, números de días fuera del mes. En claro es prácticamente igual a la secundaria: es un suelo de contraste, no un tercer escalón visible.
- **Lavado de hover** (rgba(55,53,47,.06)) y **lavado activo** (rgba(55,53,47,.1)): el único fondo de los estados de fila, botón e icono. En oscuro, blanco al 5,5% y 9%.
- **Línea fina** (rgba(55,53,47,.09)) y **línea marcada** (rgba(55,53,47,.16)): divisores, borde de la barra lateral, rejilla del calendario, bordes de tabla y de `kbd`.

### Named Rules
**La Regla de la Interfaz Neutra.** El cromo de la app (barra lateral, barra superior, botones, filas) es siempre neutro. El color sólo entra por los datos del usuario: etiquetas, columnas, portadas, fondo del tablero, iconos y el estado de las fechas. El acento es la única excepción y se limita a la acción principal, el foco, la selección y la marca de elegido.

**La Regla de las Tres Tintas.** Todo color de etiqueta se usa como familia completa a través de `.c-<color>`; nunca un hex suelto. Un nuevo elemento teñido hereda las tres variables y se pinta con ellas o con una mezcla de ellas. Los estados de fecha también: vencida es `c-red`, vence en menos de 24 h `c-yellow`, completada `c-green` y el resto `c-gray`.

**La Regla del Tinte Suave.** Las superficies grandes teñidas (columnas, fondo de tablero, avisos, tarjetas de calendario) nunca usan el fondo de etiqueta puro: se mezclan con el lienzo (30 a 32%). El color puro se reserva para piezas pequeñas (etiqueta, punto, portada, icono).

## Typography

**Display Font:** la fuente del sistema (Segoe UI Variable en Windows, con ui-sans-serif, -apple-system, Helvetica y Arial como respaldo)
**Body Font:** la misma pila del sistema
**Page Serif / Mono (opcional):** Ajustes > Páginas > Tipografía cambia sólo el título y el texto de las páginas a `--serif` (ui-serif / Georgia) o `--mono` (`body.font-serif`, `body.font-mono`)
**Label/Mono Font:** Cascadia Mono (con SFMono-Regular, Menlo, Consolas) para el código y la ruta de datos

**Character:** una sola familia, la del sistema: la jerarquía sale del tamaño y del peso (400, 500, 600, 700), no del contraste entre fuentes.

### Hierarchy
- **Display** (700, 40px, 1.2, -0.01em): título de página de documentación, Inicio y Papelera.
- **Headline** (700, 32px, 1.2): título de tablero y bienvenida; también el título de página por debajo de 760px.
- **Title** (700, 30px, 1.2): título de la tarjeta en la vista lateral y h1 de markdown. Los encabezados markdown siguen 30 / 24 / 20px (700, 600, 600). Títulos de diálogo y mes del calendario: 20px en 600.
- **Body doc** (400, 16px, 1.6): cuerpo de las páginas, en una columna de 900px (o a todo el ancho con Ajustes > Ancho > Completo, `body.wide-pages`).
- **Body** (400, 14px, 1.5): toda la interfaz. El peso 500 marca lo interactivo o elegido; el 600 los encabezados de bloque (checklist, nombre de la app).
- **Meta** (400, 13px): conteo junto a las pestañas de vista, ubicación en la vista lateral, títulos de sección (500, tinta secundaria).
- **Label** (12px, 400 a 500): etiquetas, insignias de fecha, metadatos de tarjeta, cabeceras de tabla y días de la semana, contadores. Siempre en minúscula de frase.
- **Mono** (400, 14px, 1.6): código; el código en línea va al 85% sobre lavado de hover.

### Named Rules
**La Regla del Peso, no de la Mayúscula.** Las etiquetas de sección ("Proyectos", "Favoritos", "Subpáginas", las de Ajustes y Atajos) son texto de 12 a 13px en peso 500 y tinta secundaria, en minúscula de frase. Nada de versalitas, mayúsculas espaciadas ni colores de acento en rótulos.

## Iconografía

Todo icono es Lucide (`lucide-static`, sprite servido en `/icons.svg`). No hay emojis en la interfaz, ni como icono de usuario, ni en el selector.
- **Iconos de interfaz:** `icon(name, cls)` en `public/js/util.js` genera `<svg class="i"><use href="/icons.svg#name"/></svg>`. Clase `.i`: 16px, sin relleno, trazo `currentColor` de 1.75px con extremos redondeados; `.i.sm` a 14px. Heredan la tinta de su contenedor (normalmente tinta secundaria).
- **Iconos de usuario:** proyectos, tableros, páginas y tarjetas guardan su icono como `lucide:<nombre>:<color>` (el campo de datos se sigue llamando `emoji`, y las clases `.em` / `.big-emoji` también: son nombres heredados, no emojis). `glyph(v, cls)` lo pinta como `<svg class="gl c-<color>">`: mide 1em del contenedor, trazo 1.75 y color `--tag-strong` de su familia. Sin icono de usuario se usa un icono de interfaz por tipo (p. ej. `square-kanban` azul para tableros).
- **Tamaños de icono de usuario** (los da el `font-size` del contenedor): 15px en el árbol de la barra lateral, 17px en filas de lista, 18px en opciones de menú, 64px sobre el título de página y 48px en tablero y vista lateral, en una caja de 78 o 60px que se ilumina al pasar el ratón. A tamaño grande el trazo baja a 1.4. Inicio y Papelera llevan un icono de interfaz a 52px, trazo 1.4, en tinta secundaria.
- **Selector de icono:** popover ancho con buscador (nombres en español), fila de los nueve colores arriba y rejilla de 8 iconos por fila, botones de 32px e iconos de 18px teñidos con el color elegido. "Quitar icono" al final, en rojo.

### Named Rules
**La Regla del Icono Teñido.** Un icono de usuario es siempre un Lucide con una de las nueve tintas fuertes; nunca un emoji, nunca un hex suelto, nunca el acento.

## Layout

Shell de escritorio en rejilla de dos columnas: barra lateral de 248px (redimensionable entre 200 y 420px) y área principal flexible; la barra lateral se pliega a 0 (Ctrl+\ o `[`) y aparece un botón para abrirla en la barra superior. La barra superior mide 44px (`--top`), es la zona de arrastre de la ventana y reserva a la derecha el hueco de los botones nativos con `env(titlebar-area-x)` y `env(titlebar-area-width)` (más 12px de aire).

Sólo se desplaza el contenido, nunca el cuerpo: la barra lateral desplaza su árbol, las páginas desplazan el área principal, y el tablero fija su cabecera (icono, título, barra de vista) y desplaza sólo la franja de columnas, la tabla o el calendario. La vista lateral de tarjeta se superpone por la derecha bajo la barra superior, con min(640px, 92vw) de ancho y su propio scroll.

Nada flotante invade la barra superior: popovers y burbuja de formato se colocan por debajo de `--top` (+4px los popovers, +6px la burbuja) y a 8px de los bordes de la ventana. Un popover va debajo de su ancla si cabe, si no encima, y si no cabe en ninguno ocupa el lado con más sitio y recorta su altura.

Márgenes laterales del contenido: max(32px, min(96px, 7vw)). Páginas: columna de 900px centrada, 80px arriba y 30vh de aire abajo. Tablero: 56px arriba, columnas de 272px (44px plegadas) con 12px entre ellas. Ritmo de espaciado en 4 / 6 / 8 / 12px; filas de 28px (barra lateral, botones), 30px (opciones de menú, cabecera de columna) y 36px (filas de lista). Secciones de página separadas 44px.

Por debajo de 760px (la ventana tiene 720px de mínimo): la vista lateral pasa a 24px de margen, la columna de nombres de propiedad a 110px y el título de página a 32px.

## Elevation & Depth

Casi plano. La profundidad de reposo es una sombra de contorno de 1px más una caída mínima, y el estado se comunica con lavados de fondo, no con elevación. Hay cuatro sombras, y sólo cuatro. En oscuro el contorno pasa a blanco translúcido y las caídas se oscurecen.

### Shadow Vocabulary
- **Contorno de tarjeta** (`0 0 0 1px rgba(15,15,15,.07), 0 2px 4px rgba(15,15,15,.05)`): tarjetas, compositor, tarjetas del calendario, opción elegida del segmentado.
- **Contorno de tarjeta en hover** (`0 0 0 1px rgba(15,15,15,.09), 0 4px 10px rgba(15,15,15,.08)`): tarjeta bajo el ratón.
- **Capa flotante** (`0 0 0 1px rgba(15,15,15,.05), 0 3px 6px rgba(15,15,15,.1), 0 9px 24px rgba(15,15,15,.2)`): popovers, burbuja de formato, buscador, diálogos y aviso.
- **Vista lateral** (`-1px 0 0 rgba(15,15,15,.06), -12px 0 32px rgba(15,15,15,.1)`): el panel de tarjeta sobre el tablero.

### Named Rules
**La Regla del Lavado.** Filas, botones, iconos y opciones no se elevan nunca: su hover es el lavado de hover y su estado pulsado o elegido, el lavado activo. Sólo las tarjetas ganan sombra al pasar el ratón.

**La Regla de la Columna Plana.** Las columnas no tienen ni borde ni sombra; las separa su tinte. Las tarjetas dentro de ellas son lo único que tiene contorno.

## Shapes

Radios pequeños y escalonados por tamaño: 3px en etiquetas, insignias y casillas; 4px en botones de icono, migas, chips, miniaturas y tarjetas del calendario; 6px en botones, filas, opciones y campos; 8px en tarjetas, popovers, burbuja y avisos; 10px en columnas y "Añadir columna"; 12px en diálogos. Círculos: puntos de estado de 8px, número del día de 22px, muestras de acento de 22px. Barras de progreso de 4px con radio de 2px. Bordes de 1px con la línea fina o marcada; la pestaña de vista activa es un subrayado de 2px en tinta. Las portadas se recortan con el radio de la tarjeta. Barras de desplazamiento finas (10px, pulgar redondeado y translúcido, sin pista).

## Components

### Buttons
Discretos y densos; casi todos son fantasma.
- **Shape:** 6px de radio, 28px de alto, 10px de relleno horizontal, peso 500, icono de 14 a 16px a 6px del texto.
- **Primary:** fondo de acento con texto blanco; sólo para la acción principal de la vista ("Nueva" en el tablero). Hover a acento profundo; transición de 120ms.
- **Ghost:** tinta secundaria sin fondo; hover con lavado y tinta principal. Con filtro activo pasa a lavado activo.
- **Danger:** texto rojo, hover con lavado rojo. **Rojo sólido** (`solid-danger`) sólo en el diálogo de confirmación.
- **Icon button** (`.ib`): 24px, radio 4px, tinta secundaria; hover con lavado y tinta, pulsado con lavado activo. Muchos aparecen sólo al pasar el ratón o con foco dentro de su contenedor. `.ib.danger` se vuelve rojo sobre lavado rojo.
- **Disabled:** opacidad 0.45.

### Chips (etiquetas)
- **Style:** la propiedad de selección. 20px de alto, 6px de relleno, radio 3px, texto de 12px, fondo y texto de su familia, sin borde. Corta con puntos suspensivos.
- **Variantes:** con punto de estado de 8px; como nombre de columna a 14px, 22px de alto y peso 500; como filtro activo a 24px con una x para quitarlo.
- **Insignia de fecha** (`.due.tag`): chip con icono de reloj (o de check si está hecha) y la fecha o el rango inicio – fin, en la familia del estado (Regla de las Tres Tintas). Si sólo hay fecha de inicio va sin chip, en tinta secundaria.
- **Enlace a página:** chip neutro de 24px con subrayado en línea marcada desplazado 3px; hover con lavado.

### Cards / Containers
- **Corner Style:** 8px. **Background:** superficie de tarjeta; hover a #fafaf9.
- **Shadow Strategy:** contorno de tarjeta en reposo, contorno hover al pasar el ratón; transición de 150ms. Sin borde.
- **Internal Padding:** 8px 10px, con 6px entre etiquetas, título (500, 1.4) y metadatos (12px, tinta secundaria, iconos de 14px separados 10px: insignia de fecha, checklist, adjuntos, notas, "Plantilla").
- **Portada:** franja de 32px con la tinta fuerte de su color, o una imagen adjunta (`cover: "img:<id>"`) recortada con `object-fit: cover` hasta 160px de alto.
- **Arrastre:** la tarjeta arrastrada baja a 0.35 de opacidad y una línea de acento de 3px marca el destino.

### Columnas
Tinte de columna, radio 10px, 6px de relleno, sin borde ni sombra. Cabecera de 30px con el nombre como chip (clicable para renombrar, arrastrable para mover la columna) y el contador en tinta de columna. Pie con "Nueva tarjeta" y un botón de plantillas. **Plegada** (`.col.collapsed`): 44px de ancho, el nombre en vertical (`writing-mode: vertical-rl`) en el texto de la familia; todo el bloque es un botón que la despliega. La columna arrastrada baja a 0.4 y el hueco de destino se marca con una línea de acento a su lado.

### Fondo del tablero
El tablero puede llevar uno de los nueve colores como fondo (`.board-view.has-bg.c-<color>`): fondo de etiqueta al 32% sobre el lienzo, que tiñe cabecera y franja de columnas. Las columnas siguen con su propio tinte encima.

### Inputs / Fields
- **Style:** sin borde ni fondo en reposo; el texto se edita in situ (títulos, nombre de columna, checklist). Buscador de popover y campos de fecha y hora: lavado de hover y contorno interior de 1px en línea fina, radio 6px, 30px de alto.
- **Focus:** contorno interior en acento más el halo de 3px; los campos en línea (compositor, renombrar columna, nueva nota) llevan un halo de 2px.
- **Checkbox:** cuadrado de 16px, borde de 1.5px en tinta secundaria, radio 3px; marcado en acento con check blanco. El elemento hecho se tacha en tinta secundaria. Es el mismo en checklists y en las tareas del texto.

### Navigation
- **Barra lateral:** papel gris con borde derecho fino. Cabecera de 44px con el logo pequeño a 22px, "Taskvia" en 600 y el botón de ocultar, que sólo aparece al pasar el ratón. Filas fijas (Buscar, Inicio, Ajustes, con su `kbd`), Favoritos, Proyectos y, al pie, Papelera y "Nuevo proyecto". Filas de 28px, radio 6px, tinta secundaria en 500; árbol con sangría de 14px por nivel, flecha que gira 90° (150ms), icono de usuario de 15px y contador de 12px que deja su sitio a las acciones al pasar el ratón. Fila seleccionada: lavado activo, tinta principal, peso 500. Reordenar proyectos: línea de 2px en el acento. El borde derecho es un asa invisible de 5px que se ve en `line-strong` al pasar o arrastrar, nunca en el acento; doble clic vuelve a 248px.
- **Barra superior:** atrás / adelante y migas con icono (24px de alto, máximo 240px por miga, separador "/" en tinta terciaria); a la derecha estado, estrella de favorito (rellena de acento cuando lo es) y menú «···».
- **Pestañas de vista:** "Tablero", "Lista" y "Calendario" (teclas 1, 2, 3), texto 500 con icono y subrayado de 2px en tinta sobre la línea fina de la barra de vista (40px). Al lado, el conteo de tarjetas y de vencidas en 13px.

### Vista lateral de tarjeta
El componente firma. Panel derecho a ras de la barra superior, de min(640px, 92vw), sobre el lienzo con la sombra de vista lateral; entra desde 32px a la derecha con un fundido de 220ms en curva de salida suave. Barra propia de 44px con la ubicación en 13px. Portada opcional (color a 120px o imagen hasta 220px), icono de 48px, título de 30px y una tabla de propiedades de dos columnas (150px para el nombre con icono, el valor clicable con lavado al pasar el ratón, filas de 34px): estado, etiquetas, fechas, portada, páginas enlazadas. Debajo, descripción (editor visual), una o varias checklists con barra de progreso verde, adjuntos, notas e historial. Soltar ficheros sobre el panel lo marca con un contorno interior de 2px en el acento.

### Fechas
Popover con formulario (`.dates-form`): rótulos de 12px en 500 y tinta secundaria, campos nativos de fecha y hora (`input type=date` / `time`) en pareja, casillas a 14px. El tablero lo refleja con la insignia de fecha, el conteo de vencidas y el filtro por fecha (vencidas, esta semana, sin fecha, completadas).

### Adjuntos
Filas de 6px de relleno, radio 6px, hover con lavado: miniatura de 56×40 (imagen recortada o icono sobre papel de barra lateral, radio 4px), nombre en 500 que se subraya al pasar y, debajo, datos a 12px en tinta secundaria. Las acciones (usar como portada, quitar…) aparecen al pasar el ratón o con foco.

### Vista Lista
Tabla a todo el ancho: cabeceras de 12px en 500 y tinta secundaria sobre `line-strong`, pegajosas; filas de 8px 10px separadas por la línea fina, hover con lavado y fila abierta con lavado activo. Estado como chip con punto, insignia de fecha, cifras en `tabular-nums` y la checklist completa en verde hecho.

### Vista Calendario
Barra con flechas de mes, el mes en 20px / 600 centrado (170px de mínimo) y un conteo en 13px. Rejilla de 7 columnas con la línea fina como bordes: días de la semana a 12px en 500, celdas de 112px de mínimo sobre el lienzo (fuera del mes, papel de barra lateral y número en tinta terciaria). El número del día va en un círculo de 22px a 12px; hoy, relleno de acento con texto blanco en 600. Las tarjetas son píldoras de 12px (radio 4px, contorno de tarjeta); vencidas y próximas llevan el tinte suave de su familia, las completadas van tachadas en tinta secundaria. Al arrastrar una tarjeta a otro día, la celda se tiñe con el halo.

### Menús y buscador
Popover de 260px (320px ancho; 280 / 340px para el menú del cursor) sobre superficie elevada, radio 8px, capa flotante, 6px de relleno; aparece con fundido y 4px de desplazamiento (120ms) y se coloca según la regla de Layout. Opciones de 30px con radio 6px; la elegida lleva un check en acento. Rótulos de grupo de 12px en 500 y tinta secundaria; separadores de 1px a sangre. Selector de color en rejilla de 9 muestras con la tinta fuerte y un anillo doble para la elegida. Clic derecho o «···» sobre proyectos, tableros, páginas y tarjetas abre este mismo popover, con la acción destructiva al final en rojo. El buscador (Ctrl K) es un diálogo de min(620px, 92vw), radio 12px, campo de 52px a 16px y fondo velado al 35%.

### Diálogos: Ajustes, confirmación y atajos
Modales `dialog.sheet` sobre superficie elevada, radio 12px, capa flotante y fondo velado al 35%. Cabecera con título de 20px en 600 y botón de cerrar, separada por la línea fina.
- **Ajustes** (min(680px, 92vw)): secciones Apariencia (tema, acento), Páginas (tipografía, ancho, barra de formato), IA (Consejos para la IA) y Datos (carpeta, copias). Filas con nombre en 500 y ayuda de 12px a la izquierda y el control a la derecha: segmentado (lavado de hover como pista, opción elegida en superficie elevada con contorno de tarjeta), muestras de acento circulares de 22px con anillo doble, interruptor de 34×20px que se rellena con el acento.
- **Confirmación** (min(420px, 90vw)): título de 16px en 600, consecuencias en tinta secundaria, "Cancelar" (fantasma, con el foco) y la acción en rojo sólido.
- **Atajos de teclado** (`#keys`, min(620px, 92vw), se abre con `?`): secciones con rótulo de 13px en 500 sobre línea fina; cada atajo en una rejilla de 170px + descripción, con teclas `kbd` de 22px de alto.

### Editor visual
Las páginas y descripciones se escriben como en un procesador de texto y se guardan como markdown.
- **Burbuja de formato** (`#bubble`, por defecto): barra flotante que aparece al seleccionar texto, centrada sobre la selección (o debajo si arriba invadiría la barra superior) y a 8px de los bordes. Superficie elevada, radio 8px, capa flotante, 4px de relleno; botones de 28px (radio 4px, tinta secundaria, lavado al pasar, lavado activo con el formato aplicado) y separadores verticales de 18px.
- **Barra fija** (opcional, Ajustes > Barra de formato > Fija, `body.fixed-bar`): la misma botonera pegajosa sobre el lienzo con borde inferior fino; en la descripción de la tarjeta sólo aparece mientras se escribe.
- Negrita, cursiva y tachado son las letras B, I y S. Menús `/` (insertar bloque o subpágina) y `[[` (enlazar página) en el popover de menús anclado al cursor. Los enlaces a página van en 500 subrayados con `line-strong`; si la página no existe, en tinta terciaria con subrayado discontinuo. Las imágenes ocupan como mucho el ancho de la columna, con radio 6px.

### Notas e historial
- **Notas:** bloques sobre papel de barra lateral, radio 6px, relleno 10px 12px; cabecera de 12px con icono (robot para la IA, persona para ti), autor en 600 («IA» o tu nombre) y tiempo relativo. Mismo fondo para los dos autores: la autoría la dicen el icono y el nombre, nunca el acento.
- **Historial:** desplegable de 13px en tinta secundaria con flecha que gira 90°; entradas sobre un raíl neutro de 1px.

### Avisos
- **Aviso neutro** (`.banner`): papel de barra lateral, radio 6px, 13px en tinta secundaria (tarjeta archivada, tarjeta plantilla).
- **Aviso de choque** (`.banner.warn.c-yellow`): tinte suave de la familia, texto e icono en la familia, acción principal en el acento. Se usa cuando la IA cambia lo que estás editando.
- **Toast:** píldora oscura con texto blanco de 13px abajo en el centro; roja en error; con acción ("Deshacer") subrayada.

### Papelera
Cabecera como Inicio (icono de 52px en tinta secundaria), una línea de 14px en tinta secundaria y filas de 36px con tipo, ubicación y «borrado hace … por …» en 12px. «Restaurar» es fantasma; borrar para siempre es un botón de icono que se vuelve rojo; vacía, un estado centrado con icono de 32px.

## Do's and Don'ts

### Do:
- **Do** pinta todo elemento teñido con las tres variables de su familia (`.c-<color>`) o con una mezcla `color-mix(in srgb, …)` de ellas.
- **Do** tiñe las superficies grandes mezclando el fondo de etiqueta con el lienzo (30 a 32%) y deja el color puro para etiquetas, puntos, portadas e iconos.
- **Do** usa `icon()` para iconos de interfaz y `glyph()` para iconos de usuario (`lucide:<nombre>:<color>`); ambos salen del sprite local `/icons.svg`.
- **Do** usa el lavado de hover y el lavado activo como único estado de filas, botones e iconos.
- **Do** mantén la densidad de escritorio: texto de 14px, filas de 28px, botones de icono de 24px, iconos de 16px con trazo 1.75.
- **Do** esconde las acciones secundarias hasta el hover o el foco de su contenedor, y deja siempre un camino por teclado (`:focus-within`, atajos listados en `#keys`).
- **Do** coloca todo lo flotante por debajo de `--top` y a 8px de los bordes de la ventana.
- **Do** define cada color nuevo para claro y oscuro a la vez, y mantén la barra nativa de la ventana con el mismo color que el lienzo.

### Don't:
- **Don't** uses emojis: ni en la interfaz, ni como icono de usuario, ni en los textos de la app.
- **Don't** uses el acento como color de marca o decoración (ni para distinguir autores, ni en asas o separadores), ni los colores del logo fuera del logo.
- **Don't** inventes colores de etiqueta fuera de los nueve de la paleta, ni uses un hex de etiqueta suelto sin su familia.
- **Don't** pongas bordes ni sombras en las columnas, ni sombras de elevación en filas, botones u opciones.
- **Don't** pongas rótulos en mayúsculas, versalitas o espaciados.
- **Don't** introduzcas una segunda familia tipográfica para títulos de la interfaz; la jerarquía es tamaño y peso sobre la fuente del sistema.
- **Don't** uses radios por encima de 12px ni sombras duras desplazadas.
