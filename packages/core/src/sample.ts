// A workspace to start with, in English or Spanish: a welcome page that shows
// what a page can have, and a few pages under it. Written as Markdown, the
// format pages are kept in.

import { markdownToPage } from './markdown';
import type { Workspace } from './model';

const TEXTS = {
  en: {
    welcome: `---
id: "welcome"
icon: "👋"
---

# Welcome to ReboNotes

Notes, documents and wikis, kept as **Markdown**: every page is a file you can open anywhere.

> [!TIP]
> Type **/** on an empty line to add a block, or start a line with \`#\`, \`-\`, \`1.\`, \`[]\` or \`>\`.

## What a page can have

- Text in **bold**, *italic*, <u>underlined</u>, ~~struck through~~ and \`code\`
- Lists, set further in with Tab
  - Like this one
- Links to [other pages](page:meeting) and to [the web](https://rebodocs.com)

- [x] Make a workspace
- [ ] Write the first page
- [ ] Share it

<details open>
<summary>A toggle: what is under it can be folded</summary>

  Click the arrow to hide it.

</details>

\`\`\`ts
import { markdownToPage } from '@rebonotes/core';
\`\`\`

---

[Meeting notes](page:meeting)

[Ideas](page:ideas)

[Projects](page:projects)
`,
    meeting: `---
id: "meeting"
icon: "🗓️"
---

# Meeting notes

## Monday

1. What was done last week
2. What comes next
3. Questions

> Decisions are written as they are taken, not after.

- [ ] Send the summary to the team
`,
    ideas: `---
id: "ideas"
icon: "💡"
---

# Ideas

- A page for each project, with its tasks under it
- Embed a spreadsheet of [Rebosheets](https://rebosheets.com) in a page
- Let an assistant keep the wiki in order
`,
    projects: `---
id: "projects"
icon: "📊"
---

# Projects

A database: each column of a kind, and formulas as in a spreadsheet.

<!-- rebonotes:database {"columns":[{"name":"Item","type":"text"},{"name":"Price","type":"number"},{"name":"Units","type":"number"},{"name":"Total","type":"formula","formula":"=[Price]*[Units]"},{"name":"Paid","type":"checkbox"}]} -->
| Item | Price | Units | Total | Paid |
| --- | ---: | ---: | ---: | --- |
| Paper | 12.5 | 4 | 50 | [x] |
| Ink | 30 | 2 | 60 | [ ] |
| Pens | 1.2 | 10 | 12 | [ ] |

The same kind of table, as a board: drag the cards from one column to another.

<!-- rebonotes:database {"columns":[{"name":"Task","type":"text"},{"name":"Status","type":"select","options":["To do","Doing","Done"]},{"name":"Due","type":"date"}],"view":"board","groupBy":"Status"} -->
| Task | Status | Due |
| --- | --- | --- |
| Write the plan | Done | 2026-11-02 |
| Design the site | Doing | 2026-11-10 |
| Launch | To do | 2026-12-01 |
`,
  },
  es: {
    welcome: `---
id: "welcome"
icon: "👋"
---

# Bienvenido a ReboNotes

Notas, documentos y wikis, guardados como **Markdown**: cada página es un archivo que puedes abrir donde quieras.

> [!TIP]
> Escribe **/** en una línea vacía para añadir un bloque, o empieza una línea con \`#\`, \`-\`, \`1.\`, \`[]\` o \`>\`.

## Lo que puede tener una página

- Texto en **negrita**, *cursiva*, <u>subrayado</u>, ~~tachado~~ y \`código\`
- Listas, con sangría usando Tab
  - Como esta
- Enlaces a [otras páginas](page:meeting) y a [la web](https://rebodocs.com)

- [x] Crear un espacio de trabajo
- [ ] Escribir la primera página
- [ ] Compartirla

<details open>
<summary>Un desplegable: lo que tiene dentro se puede ocultar</summary>

  Haz clic en la flecha para ocultarlo.

</details>

\`\`\`ts
import { markdownToPage } from '@rebonotes/core';
\`\`\`

---

[Notas de reunión](page:meeting)

[Ideas](page:ideas)

[Proyectos](page:projects)
`,
    meeting: `---
id: "meeting"
icon: "🗓️"
---

# Notas de reunión

## Lunes

1. Lo que se hizo la semana pasada
2. Lo que sigue
3. Preguntas

> Las decisiones se escriben cuando se toman, no después.

- [ ] Enviar el resumen al equipo
`,
    ideas: `---
id: "ideas"
icon: "💡"
---

# Ideas

- Una página por proyecto, con sus tareas dentro
- Insertar una hoja de [Rebosheets](https://rebosheets.com) en una página
- Que un asistente mantenga la wiki en orden
`,
    projects: `---
id: "projects"
icon: "📊"
---

# Proyectos

Una base de datos: cada columna de un tipo, y fórmulas como en una hoja de cálculo.

<!-- rebonotes:database {"columns":[{"name":"Artículo","type":"text"},{"name":"Precio","type":"number"},{"name":"Unidades","type":"number"},{"name":"Total","type":"formula","formula":"=[Precio]*[Unidades]"},{"name":"Pagado","type":"checkbox"}]} -->
| Artículo | Precio | Unidades | Total | Pagado |
| --- | ---: | ---: | ---: | --- |
| Papel | 12.5 | 4 | 50 | [x] |
| Tinta | 30 | 2 | 60 | [ ] |
| Plumas | 1.2 | 10 | 12 | [ ] |

La misma clase de tabla, como tablero: arrastra las tarjetas de una columna a otra.

<!-- rebonotes:database {"columns":[{"name":"Tarea","type":"text"},{"name":"Estado","type":"select","options":["Por hacer","En curso","Hecho"]},{"name":"Fecha","type":"date"}],"view":"board","groupBy":"Estado"} -->
| Tarea | Estado | Fecha |
| --- | --- | --- |
| Escribir el plan | Hecho | 2026-11-02 |
| Diseñar el sitio | En curso | 2026-11-10 |
| Lanzar | Por hacer | 2026-12-01 |
`,
  },
};

/** The workspace to start with, in a language (`en` or `es`; Spanish by default). */
export function sampleWorkspace(locale = 'es'): Workspace {
  const texts = locale.toLowerCase().startsWith('en') ? TEXTS.en : TEXTS.es;
  const welcome = markdownToPage(texts.welcome);
  const meeting = { ...markdownToPage(texts.meeting), parent: welcome.id };
  const ideas = { ...markdownToPage(texts.ideas), parent: welcome.id };
  const projects = { ...markdownToPage(texts.projects), parent: welcome.id };
  return { pages: [welcome, meeting, ideas, projects] };
}
