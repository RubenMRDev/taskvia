// Proyecto de ejemplo que se crea la primera vez que se abre la app: enseña lo que hace sin explicar nada aparte.
// Se borra como cualquier proyecto (clic derecho → Eliminar, va a la papelera).
import * as s from './store.js';

const P = 'Bienvenida', B = 'Primeros pasos';
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export function seedExample() {
  s.createProject({ name: P, icon: 'lucide:sparkles:yellow' });
  s.writePage(P, 'Léeme', { icon: 'lucide:book-open:blue', content: `Esto es una página. Escribe como en cualquier editor: lo que pongas se guarda solo, en markdown, en tu disco.

## Prueba esto

- Escribe \`/\` al principio de una línea para insertar títulos, listas, tablas o imágenes.
- Escribe \`[[\` para enlazar otra página, como [[Trabajar con la IA]].
- Selecciona una palabra y aparece la barra de formato.
- Pega o arrastra una imagen.

- [x] Abrir Taskvia
- [ ] Mover una tarjeta del tablero «${B}»
- [ ] Crear tu primer proyecto

Cuando acabes, borra este proyecto con clic derecho → Eliminar. Va a la papelera, por si acaso.
` });
  s.writePage(P, 'Trabajar con la IA', { icon: 'lucide:bot:purple', content: `Taskvia trae un servidor MCP: tu asistente de IA puede leer y escribir estos tableros y páginas mientras trabajas.

1. Abre **Ajustes → IA** y pulsa **Copiar configuración**.
2. Pégala en la configuración MCP de tu asistente y reinícialo.
3. Pega una tarea de cualquier herramienta en el chat y di *«vamos con esto en el tablero ${B}»*.

La IA crea la tarjeta con su checklist, la mueve mientras trabaja y deja notas de lo que ha hecho y lo que falta. Lo verás aparecer aquí solo.
` });
  s.createBoard(P, { name: B, icon: 'lucide:rocket:orange' });
  const add = (column, o) => s.createCard(P, B, { column, ...o }).card;
  add('Por hacer', { title: 'Arrastra esta tarjeta a «En curso»', labels: ['empieza aquí'] });
  const open = add('Por hacer', {
    title: 'Ábreme: tengo una checklist', labels: ['empieza aquí'], docs: ['Léeme'],
    description: 'Al abrir una tarjeta ves su descripción, sus pasos, sus notas y su historial. Esta enlaza la página «Léeme».',
    checklist: ['Marca este paso', 'Añade otro paso debajo', 'Ponle una fecha desde «Fechas»'],
  });
  s.updateChecklistItem(open.id, open.checklist[0].id, { done: true });
  add('Por hacer', { title: 'Conecta tu IA', labels: ['ia'], docs: ['Trabajar con la IA'], description: 'Ajustes → IA → Copiar configuración.' });
  add('En curso', { title: 'Mira esta tarjeta en el calendario', due: day(2), description: 'Las tarjetas con fecha salen en la vista Calendario y avisan cuando vencen.' });
  add('En curso', { title: 'Pulsa ? para ver los atajos de teclado' });
  add('Hecho', { title: 'Instalar Taskvia', labels: ['empieza aquí'] });
}
