# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Electron (main.js) mostrando una UI web local (index.html + vanilla JS) servida por ui.js; datos en disco vía store.js; servidor MCP stdio (mcp.js) para la IA.

## Users

Rubén, desarrollador, para sus proyectos personales y de trabajo. Trabaja a diario con su asistente de IA y quiere un sitio local donde vivan sus tareas y su documentación, y que la IA pueda leer y escribir.

## Product Purpose

Taskvia es un gestor local de proyectos: tableros kanban y páginas de documentación markdown, agrupados por proyecto. Éxito: pega una tarea de otra herramienta en el chat, dice "vamos con esto", y la IA la crea en el tablero con su checklist, la va marcando mientras trabaja y documenta lo aprendido en las páginas del proyecto.

## Positioning

Todo local (ficheros en disco, sin cuenta ni nube) y pensado para trabajar a medias con su asistente de IA vía MCP: la tarjeta es el contexto de trabajo de la IA.

## Operating Context

- Proyectos en la barra lateral (p. ej. "Acme", "Personal"); cada proyecto tiene varios tableros y páginas de docs anidadas.
- La IA modifica tableros y páginas mientras la app está abierta; la UI refleja los cambios sola.
- Uso de escritorio en Windows, ventana Electron.

## Capabilities and Constraints

- Tarjetas: título, descripción markdown (editor visual), una o varias checklists, etiquetas de color (por tablero), enlaces a páginas de docs del proyecto, icono, portada de color o de imagen, fechas de inicio y vencimiento (con aviso de vencida / vence pronto), adjuntos, notas, historial y plantillas.
- Proyectos, tableros, páginas y tarjetas con icono Lucide teñido con uno de los nueve colores; sin emojis.
- Vistas del tablero: kanban (columnas plegables, fondo de color), lista y calendario; filtro por texto, etiquetas y fechas; archivo y papelera (30 días).
- Páginas markdown anidables (carpetas = jerarquía), con enlaces `[[página]]` e imágenes.
- Sin prioridad (descartado por el usuario).
- Atajos de teclado en todo (ayuda con `?`), favoritos, ajustes de tema, acento y tipografía de páginas, copias de seguridad diarias.
- 100% local, sin servicios externos ni CDNs en tiempo de ejecución.

## Brand Commitments

- Nombre: **Taskvia** (antes "Tablero"). Logo: una "O" clara sobre negro cálido con un tablero de tres columnas dentro (`public/icon.svg`, `public/icon-small.svg`).
- Estética pedida explícitamente: mezcla de cuaderno de documentos (base visual, tipografía, sidebar, páginas) y tablero kanban (columnas, tarjetas, etiquetas). El cuaderno manda en el look.
- Sin emojis en la interfaz ni como icono: todo icono es Lucide.

## Product Principles

1. La tarjeta es el contexto: todo lo necesario para retomar una tarea vive en ella.
2. Local y legible: los datos son ficheros que se pueden abrir sin la app.
3. La IA y la persona editan lo mismo; nada se pierde ni se pisa en silencio.
4. Calma de herramienta de escritorio: densidad, atajos y nada de adornos que estorben.
