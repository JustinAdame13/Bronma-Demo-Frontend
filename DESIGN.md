---
name: "BRONMA — Mapa de clientes"
description: "Sistema visual local del mapa para supervisar y priorizar la cartera en oficina."
colors:
  gold: "#927239"
  charcoal: "#252622"
  text: "#252824"
  muted: "#656a63"
  canvas: "#f5f5f0"
  surface: "#fff"
  border: "#e1e2db"
  input-border: "#c9ccc3"
  field-border: "#cbd1c2"
  workspace-border: "#d2d7c9"
  nav-text: "#bdc3b6"
  nav-active-bg: "#423f33"
  nav-active-text: "#efdbad"
  row-hover: "#f6f8f0"
  row-selected: "#f5f0e3"
  filter-bg: "#eff1eb"
  focus-soft: "#e4d8bd"
  overdue: "#a04438"
  soon: "#826124"
  current: "#3f725b"
  pin-overdue: "#a75241"
  pin-soon: "#8c6a2e"
  pin-current: "#4f7a60"
  pin-active: "#2d3029"
  map-ground: "#e9ebe2"
  action: "#343a2e"
  action-hover: "#252b20"
typography:
  headline:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "25px"
    fontWeight: 500
    letterSpacing: "-.035em"
  title:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "17px"
    fontWeight: 500
    letterSpacing: "-.025em"
  body:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "-.01em"
  label:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "11px"
  metric:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-.04em"
rounded:
  compact: "3px"
  control: "5px"
  workspace: "8px"
  mobile-workspace: "6px"
spacing:
  compact: "8px"
  control: "12px"
  group: "20px"
  section: "24px"
components:
  map-import:
    backgroundColor: "{colors.surface}"
    textColor: "#3d4336"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  client-row:
    backgroundColor: "{colors.surface}"
    padding: "17px 18px 17px 20px"
  client-row-selected:
    backgroundColor: "{colors.row-selected}"
  nav-active:
    backgroundColor: "{colors.nav-active-bg}"
    textColor: "{colors.nav-active-text}"
    rounded: "{rounded.control}"
  workspace:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.workspace}"
---

# Design System: BRONMA — Mapa de clientes

## Overview

**Creative North Star: "Mesa de supervisión"**

Sistema local de la ruta Mapa de clientes, delimitado por `.map-page-shell`. El marco carbón y el área de trabajo clara expresan la dirección premium sobria confirmada: densidad funcional de SaaS, alineación precisa y dorado contenido. La prioridad es comparar cuentas, localizar clientes y consultar su expediente.

**Key Characteristics:**

- Navegación estable, controles compactos y lista conectada al mapa.
- Jerarquía numérica clara, tipografía local y estados reconocibles por texto y forma además de color.
- Uso por teclado y adaptación a escritorio, tablet y móvil.

Los tokens del frontmatter son normativos dentro de este alcance. Se extraen de `src/pages/collection-map.css`; la fuente local y ciertos estilos base se heredan de `src/styles.css` y `src/bronma.css`. Las demás pantallas conservan su CSS e identidad incumbente: este documento no autoriza adoptarlos automáticamente. La estrategia de esta superficie sigue en `.impeccable/mapa-brief.md`.

## Colors

### Primary

El dorado `gold` marca foco, selección y pestaña activa. El carbón `charcoal` fija el marco de navegación; `action` distingue las acciones principales del expediente.

### Neutral

`canvas`, `surface` y `map-ground` separan el lienzo, los paneles y el mapa. `text` y `muted` ordenan lectura; los bordes finos delimitan grupos sin convertir cada dato en una tarjeta.

Los estados de cobranza usan `overdue`, `soon` y `current`; sus pines tienen colores propios (`pin-*`). El pin próximo a vencer conserva el ajuste de contraste (`pin-soon`), distinto del texto de estado `soon`. La selección del pin pasa a `pin-active` y añade escala y contorno.

## Typography

Helvetica Neue local, con Helvetica, Arial y sans-serif de respaldo. La escala observada privilegia títulos compactos, nombres de cliente medios y cifras grandes sin peso excesivo. `headline` corresponde al título de página; `title`, al encabezado de lista; `body`, al nombre del cliente; `label`, a texto auxiliar. No hay tipografía de marketing ni fuente nueva.

Los conteos y saldos usan cifras tabulares heredadas. En móvil, el título baja a 22px y el conteo a 27px; el campo de búsqueda sube a 16px. Son variantes responsive del mapa, no cambios globales de fuente.

## Layout

El escritorio usa una cabecera de 68px, navegación de 208px y contenido fluido con `minmax(0, 1fr)`. El área principal tiene padding de 27px 28px 24px. La lista ocupa 344px y el expediente 324px. Conteos, búsqueda y filtros preceden a una sola superficie conectada lista/mapa. Las filas mantienen al menos 99px de altura.

- Hasta 1500px: navegación de 190px, lista de 320px y expediente superpuesto a la derecha.
- De 641px a 1100px: navegación como riel de 68px, lista de 290px; el expediente de 310px sustituye visualmente la lista cuando está abierto.
- Hasta 640px: cabecera de 62px, navegación horizontal y contenido con padding de 20px 12px 12px. El selector inferior Mapa/Lista ocupa 50px; el expediente se presenta sobre el espacio de trabajo, por encima del selector. Los campos de búsqueda/ruta tienen al menos 44px; recentrar y zoom miden 40px.

La altura de trabajo sigue el viewport dinámico y sus mínimos existentes; no se fuerza todo el contenido a caber sin scroll. Los umbrales y consultas de preferencias se registran en el sidecar.

## Elevation & Depth

Predominan superficies planas, tonos y separadores. Las sombras delimitan controles flotantes, tooltip, pines y expediente superpuesto; el filtro seleccionado usa una sombra mínima. Los valores exactos viven en `extensions.shadows` del sidecar. El expediente integrado en tablet pierde su sombra; móvil usa una sombra superior.

## Shapes

Controles y navegación tienen esquinas discretas; filtros y etiquetas, curvas menores; el espacio de trabajo, curvas más amplias. El pin conserva la silueta de gota heredada y borde blanco; no se reemplaza por una tarjeta o círculo genérico. La selección de fila añade una línea vertical fina sin desplazar su contenido.

## Components

- **Navegación:** carbón, texto claro y selección dorada sobre fondo tonal. En tablet los nombres se ocultan visualmente conservando su texto accesible; en móvil vuelve la navegación horizontal.
- **Campos y filtros:** búsqueda y ruta comparten borde, fondo claro y esquinas. El foco del contenedor usa dorado y contorno suave; el filtro activo combina blanco, texto oscuro y `aria-pressed`.
- **Filas de cliente:** nombre, dirección, saldo y estado forman una unidad compacta. Hover aclara el fondo; selección usa tono cálido y una línea de 1px. Se conserva la relación existente entre lista, pin y expediente.
- **Mapa:** controles blancos coherentes, cartografía atenuada por saturación/contraste y tooltip oscuro. El pin activo crece a 1.18; suspendido añade contorno discontinuo. La transición dura 180ms y se elimina con movimiento reducido.
- **Acciones:** importar usa botón claro con borde; las acciones principales del expediente usan `action`. Se mantiene el estado deshabilitado a opacidad .5 y el foco visible de 2px con desplazamiento de 3px. El modo de contraste aumentado refuerza selección y variables de texto/borde.

## Do's and Don'ts

- **Do** mantener todas las reglas de este sistema dentro de `.map-page-shell`.
- **Do** conservar foco visible, etiquetas accesibles, estados textuales y correspondencia lista/mapa.
- **Do** reutilizar las funciones, datos, logo y fuentes existentes.
- **Don't** extender este rediseño a otras pantallas automáticamente.
- **Don't** añadir encabezados publicitarios, etiqueta demo, «Operación Torreón» o datos inventados.
- **Don't** convertir la cartografía en un fondo oscuro ni introducir ornamentación que dificulte priorizar cuentas.
