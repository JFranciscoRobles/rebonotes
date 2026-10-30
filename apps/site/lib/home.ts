// What the landing page says: one place for the version, the packages and the
// features, so the badge, the install picker and the table change together.

import { version } from '../package.json';
import type { L } from './i18n';

/** The version every package is at; the site moves with them. */
export const VERSION = version;

/** The six pastel pairs, background and text, that take turns on tags, icons and packages. */
export type Pastel = 'blue' | 'yellow' | 'green' | 'pink' | 'purple' | 'orange';
export const PASTELS: Pastel[] = ['pink', 'yellow', 'blue', 'green', 'purple', 'orange'];
/** Whole class names, so Tailwind finds them. */
export const PASTEL_CLASS: Record<Pastel, string> = {
  blue: 'bg-pastel-blue text-pastel-blue-fg',
  yellow: 'bg-pastel-yellow text-pastel-yellow-fg',
  green: 'bg-pastel-green text-pastel-green-fg',
  pink: 'bg-pastel-pink text-pastel-pink-fg',
  purple: 'bg-pastel-purple text-pastel-purple-fg',
  orange: 'bg-pastel-orange text-pastel-orange-fg',
};
export const pastelAt = (i: number) => PASTELS[i % PASTELS.length];

export const TAGS: L[] = [
  { en: 'Markdown files', es: 'Archivos Markdown' },
  { en: 'Pages of blocks', es: 'Páginas de bloques' },
  { en: 'Slash menu', es: 'Menú /' },
  { en: 'Markdown as you type', es: 'Markdown al escribir' },
  { en: 'Drag blocks', es: 'Arrastrar bloques' },
  { en: 'Tree of pages', es: 'Árbol de páginas' },
  { en: 'Links and backlinks', es: 'Enlaces y retroenlaces' },
  { en: 'Quick search', es: 'Búsqueda rápida' },
  { en: 'To-dos and toggles', es: 'Tareas y desplegables' },
  { en: 'Callouts and code', es: 'Destacados y código' },
  { en: 'Databases', es: 'Bases de datos' },
  { en: 'Boards', es: 'Tableros' },
  { en: 'Spreadsheet formulas', es: 'Fórmulas de hoja de cálculo' },
  { en: 'Workbooks, decks and documents in a page', es: 'Hojas, presentaciones y documentos en una página' },
  { en: 'Light & dark', es: 'Claro y oscuro' },
  { en: 'English & Spanish', es: 'Inglés y español' },
  { en: 'Real-time collaboration', es: 'Colaboración en tiempo real' },
  { en: 'React & headless', es: 'React y headless' },
  { en: 'MCP for AI assistants', es: 'MCP para asistentes de IA' },
];

export interface Package {
  name: string;
  what: L;
  tag: L;
  color: Pastel;
}

/** In the order of the table; the install picker shows them in this order too. */
export const PACKAGES: Package[] = [
  {
    name: '@rebonotes/react',
    what: {
      en: 'The notes as a React component, or headless hooks (NotesProvider, useNotes, NotesPage) for an interface of your own.',
      es: 'Las notas como componente de React, o hooks headless (NotesProvider, useNotes, NotesPage) para una interfaz propia.',
    },
    tag: { en: 'Browser, SSR-safe', es: 'Navegador, seguro en SSR' },
    color: 'blue',
  },
  {
    name: '@rebonotes/editor',
    what: {
      en: 'The notes for any page, without a framework: the tree of pages and the page edited in place.',
      es: 'Las notas para cualquier página, sin framework: el árbol de páginas y la página editada en su sitio.',
    },
    tag: { en: 'Browser', es: 'Navegador' },
    color: 'pink',
  },
  {
    name: '@rebonotes/core',
    what: {
      en: 'The engine alone: pages, blocks, databases, search and Markdown both ways. No DOM.',
      es: 'El motor solo: páginas, bloques, bases de datos, búsqueda y Markdown de ida y vuelta. Sin DOM.',
    },
    tag: { en: 'Browser, Node, Deno, Bun', es: 'Navegador, Node, Deno, Bun' },
    color: 'yellow',
  },
  {
    name: '@rebonotes/mcp',
    what: {
      en: 'An MCP server for Claude and other assistants to read and write notes, in folders of Markdown or live.',
      es: 'Un servidor MCP para que Claude y otros asistentes lean y escriban notas, en carpetas de Markdown o en vivo.',
    },
    tag: { en: 'Node', es: 'Node' },
    color: 'purple',
  },
  {
    name: '@rebonotes/collab',
    what: {
      en: 'Collaboration in real time: the room server, its client, and the changes of a workspace between them, block by block.',
      es: 'Colaboración en tiempo real: el servidor de salas, su cliente y los cambios de un espacio de trabajo entre ambos, bloque por bloque.',
    },
    tag: { en: 'Node + browser', es: 'Node + navegador' },
    color: 'orange',
  },
];
export const INSTALL_ORDER = PACKAGES.map((pkg) => pkg.name);

/** The project in four numbers. */
export const METRICS: { value: string; label: L; note: L }[] = [
  { value: '.md', label: { en: 'Every page a file', es: 'Cada página un archivo' }, note: { en: 'Open it anywhere, keep it in git', es: 'Ábrelo donde sea, guárdalo en git' } },
  { value: '16', label: { en: 'Kinds of block', es: 'Tipos de bloque' }, note: { en: 'Databases and files included', es: 'Bases de datos y archivos incluidos' } },
  { value: '20', label: { en: 'Tools for assistants', es: 'Herramientas para asistentes' }, note: { en: 'An MCP server', es: 'Un servidor MCP' } },
  { value: '150', label: { en: 'Functions in databases', es: 'Funciones en bases de datos' }, note: { en: 'Rebosheets’ engine', es: 'El motor de Rebosheets' } },
];

/** Each feature: its title, a line or two on it, and the path of its icon on a 20 grid. */
export const FEATURES: [L, L, string][] = [
  [
    { en: 'Markdown, both ways', es: 'Markdown, de ida y vuelta' },
    {
      en: 'Every page is a Markdown file and every folder the pages inside a page. Open them in any editor, keep them in git, take them with you.',
      es: 'Cada página es un archivo Markdown y cada carpeta las páginas dentro de una página. Ábrelas en cualquier editor, guárdalas en git, llévatelas.',
    },
    'M2.75 5.25h14.5v9.5H2.75zM5.25 12.25v-4.5l2 2.25 2-2.25v4.5M13.25 7.75v4.5M11.5 10.5l1.75 1.75L15 10.5',
  ],
  [
    { en: 'Write, don’t format', es: 'Escribe, sin dar formato' },
    {
      en: 'Type # for a heading, - for a list, [] for a task, ``` for code. The / menu for every block, [[ to link a page.',
      es: 'Escribe # para un título, - para una lista, [] para una tarea, ``` para código. El menú / para cualquier bloque, [[ para enlazar una página.',
    },
    'M4.5 5.25h11M10 5.25v10.5',
  ],
  [
    { en: 'Blocks you move', es: 'Bloques que se mueven' },
    {
      en: 'Drag a block by its grip with what is inside it, Tab to set it in, Escape to select whole blocks and move, copy or delete them.',
      es: 'Arrastra un bloque por su asa con lo que tiene dentro, Tab para meterlo, Escape para seleccionar bloques enteros y moverlos, copiarlos o borrarlos.',
    },
    'M7.5 5h.01M12.5 5h.01M7.5 10h.01M12.5 10h.01M7.5 15h.01M12.5 15h.01',
  ],
  [
    { en: 'A wiki of pages', es: 'Una wiki de páginas' },
    {
      en: 'Pages inside pages in a tree you drag into shape, links between them, the pages that link to one at its foot, and ⌘K to find any line.',
      es: 'Páginas dentro de páginas en un árbol que se ordena arrastrando, enlaces entre ellas, las que enlazan a una al pie, y ⌘K para encontrar cualquier línea.',
    },
    'M5.25 2.75h6.25l3.25 3.25v11.25h-9.5zM11.5 2.75V6h3.25M7.75 10h4.5M7.75 13h4.5',
  ],
  [
    { en: 'Databases', es: 'Bases de datos' },
    {
      en: 'A table in a page with columns of a kind, as a table or a board of cards. Formulas by Rebosheets’ engine: =[Price]*[Units], IF, TEXT, SUM…',
      es: 'Una tabla en una página con columnas de un tipo, como tabla o tablero de tarjetas. Fórmulas con el motor de Rebosheets: =[Precio]*[Unidades], IF, TEXT, SUM…',
    },
    'M3.25 3.75h13.5v12.5H3.25zM3.25 7.75h13.5M3.25 12h13.5M8 7.75v8.5',
  ],
  [
    { en: 'The suite in a page', es: 'La suite en una página' },
    {
      en: 'Put a workbook, a deck or a Word document in a page and it is shown there by the viewers of Rebosheets, ReboSlides and Rebodocs. PDFs and videos too.',
      es: 'Pon una hoja, una presentación o un documento de Word en una página y se muestra ahí con los visores de Rebosheets, ReboSlides y Rebodocs. PDFs y videos también.',
    },
    'M3.25 4.25h13.5v9.5H3.25zM10 13.75v3M7 16.75h6',
  ],
  [
    { en: 'Together, live', es: 'En equipo, en vivo' },
    {
      en: 'Everyone sees where the others are and what they write, block by block, and undoes only their own changes.',
      es: 'Cada quien ve dónde están los demás y lo que escriben, bloque por bloque, y deshace solo lo suyo.',
    },
    'M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 16c0-2.5 2-4 4-4s4 1.5 4 4M13.5 9a2 2 0 1 0 0-4M14 12c1.8.3 3 1.7 3 4',
  ],
  [
    { en: 'AI assistants', es: 'Asistentes de IA' },
    {
      en: 'An MCP server with 20 tools: open a folder of notes, read a page with its blocks numbered, write Markdown, tick tasks, and join a room to write live.',
      es: 'Un servidor MCP con 20 herramientas: abrir una carpeta de notas, leer una página con sus bloques numerados, escribir Markdown, marcar tareas, y entrar a una sala para escribir en vivo.',
    },
    'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7.5 9h.01M12.5 9h.01M7.5 12.5s1 1 2.5 1 2.5-1 2.5-1',
  ],
];

/** The examples beside "For developers": a name for the tab, the language of the code, and the code. */
export const SAMPLES: [L, string, string][] = [
  [
    { en: 'React and Next.js', es: 'React y Next.js' },
    'tsx',
    `'use client';
import { NotesEditor } from '@rebonotes/react';

export default function Wiki({ workspace }) {
  return (
    <div style={{ height: '100vh' }}>
      <NotesEditor
        workspace={workspace}
        locale="es"
        onChange={(ws) => save(ws)}
      />
    </div>
  );
}`,
  ],
  [
    { en: 'Any page', es: 'Cualquier página' },
    'ts',
    `import { mountNotes } from '@rebonotes/editor';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';

const notes = mountNotes(document.querySelector('#notes')!, {
  storageKey: 'my-app:notes',
  formats: [sheetsFormat],
});

notes.open('meeting');
const zip = notes.toZip(); // every page as Markdown`,
  ],
  [
    { en: 'On a server', es: 'En un servidor' },
    'ts',
    `import { workspaceFromFiles, newPage, workspaceToFiles } from '@rebonotes/core';

const ws = workspaceFromFiles(await readFolder('notes'));
const { workspace } = newPage(ws, 'Weekly report', ws.pages[0].id);
await writeFolder('notes', workspaceToFiles(workspace));`,
  ],
  [
    { en: 'AI assistants', es: 'Asistentes de IA' },
    'json',
    `{
  "mcpServers": {
    "rebonotes": {
      "command": "npx",
      "args": ["@rebonotes/mcp", "--root", "~/notes"]
    }
  }
}`,
  ],
];
