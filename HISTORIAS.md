# Historias de usuario

Cada una se ha probado en la app (navegador interno + ventana Electron) o con `npm test` (MCP).

1. **Proyectos.** Como usuario creo un proyecto desde la barra lateral ("Nuevo proyecto"), le pongo nombre y emoji escribiendo encima del título.
2. **Varios tableros.** En un proyecto creo tableros distintos (p. ej. "Sprint" e "Ideas") y salto entre ellos desde la barra lateral o las migas.
3. **Tareas desde la IA.** Pego una tarea de otra herramienta en el chat y digo "vamos con esto en el tablero Sprint de Acme": la IA la crea con su checklist (MCP) y la veo aparecer sola en la app.
4. **Contexto de la tarjeta.** Abro una tarjeta en la vista lateral: edito título y descripción en markdown, marco la checklist, le pongo etiquetas de color, emoji y portada.
5. **Mover trabajo.** Arrastro tarjetas entre columnas y dentro de una columna; creo, renombro, coloreo, muevo y borro columnas.
6. **Docs enlazadas.** Enlazo una tarjeta con páginas del proyecto (o creo la página desde la tarjeta), salto a ellas, y la página muestra qué tarjetas la enlazan.
7. **Documentación anidada.** Escribo páginas markdown con subpáginas y emoji; al renombrar una página no se rompen sus subpáginas ni los enlaces de las tarjetas.
8. **Encontrar cosas.** Con Ctrl+K busco cualquier tablero, página o tarjeta y voy directo.
9. **Pasarle una tarjeta a la IA.** "Copiar para la IA" en la tarjeta deja una frase lista para pegar en el chat.
10. **Ajustes.** Elijo tema claro, oscuro o el de Windows, el color de acento, si lo nuevo lleva emoji o iconos, y la tipografía y el ancho de las páginas.
11. **Iconos.** A cualquier proyecto, tablero, página o tarjeta le pongo un icono con color en vez de un emoji.
12. **Borrar y organizar con el ratón.** Con clic derecho o el botón «···» elimino, renombro, cambio el icono o muevo proyectos, tableros, páginas y tarjetas, siempre con una confirmación antes de borrar.
13. **Escribir como en Word.** En páginas y descripciones escribo con formato (títulos, negrita, listas, tareas, tablas, enlaces), pego desde Word sin basura, y por debajo se guarda markdown que la IA sigue leyendo.
14. **Deshacer y papelera.** Si borro algo sin querer, «Deshacer» lo devuelve al momento; si me doy cuenta más tarde, está en la Papelera 30 días. Cada día se hace sola una copia de seguridad.
15. **Sin pisarnos con la IA.** Si la IA cambia la página o la descripción que estoy escribiendo, la app me avisa y elijo qué versión queda; nunca se pierde lo mío en silencio.
16. **Saber qué hizo la IA.** En cada tarjeta veo sus notas de trabajo (qué hizo, qué falta) y un historial con quién movió o marcó qué y cuándo; la IA encuentra tarjetas buscando por texto.
17. **Documentación enlazada.** Con `/` inserto bloques, con `[[` enlazo otras páginas (que muestran «Enlazada desde») y pego o arrastro imágenes.
18. **Tablero a mi manera.** Muevo columnas arrastrándolas, filtro por etiquetas, archivo lo hecho en vez de borrarlo y cambio a vista Lista cuando quiero ver todo en tabla.
19. **Escritorio cómodo.** Tengo favoritos y recientes, ordeno los proyectos arrastrándolos y ajusto el ancho de la barra lateral.
20. **Una app con nombre propio.** Taskvia tiene su icono en la barra de tareas y sus datos en la carpeta del usuario, no junto al código.
21. **Solo iconos.** Proyectos, tableros, páginas y tarjetas llevan iconos con color; los emojis antiguos se convierten solos.
22. **Subpáginas en el texto.** Una subpágina entra como enlace dentro de la página padre, donde yo la quiera colocar.
23. **Formato al seleccionar.** Al seleccionar texto aparece una barra flotante; la barra fija de arriba es opcional.
24. **Fechas y calendario.** Pongo inicio y vencimiento, veo lo vencido en rojo y lo hecho en verde, y muevo tarjetas de día en el calendario.
25. **Tarjetas completas.** Varias checklists, adjuntos (ficheros y enlaces) y una imagen de portada.
26. **Reutilizar y reorganizar.** Plantillas de tarjeta, copiar o mover tarjetas a otro tablero, plegar, copiar y ordenar columnas, fondo y duplicado de tableros.
27. **Teclado.** Los atajos de teclado de tablero kanban que tienen sentido para una persona, con `?` para verlos.
28. **Empezar un tablero.** Al crear un tablero elijo plantilla (vacío, tareas, tareas con tamaño, sprint, contenido) y nace con sus columnas y etiquetas.
29. **Portadas.** Desde el menú de la tarjeta pongo una portada de color o una imagen, como franja arriba o en toda la tarjeta.
