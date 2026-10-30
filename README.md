# ReboNotes

Notes, documents and wikis for the browser, with an engine of its own, in
the look of the Rebo suite (light and dark). Pages of blocks edited in
place, a tree of pages, links between them, quick search, and every page
kept as a **Markdown** file you can open anywhere, keep in git, and take with
you. The interface is in English and Spanish.

It is the notes of the Rebo suite, beside
[Rebodocs](https://rebodocs.com), Rebosheets, ReboSlides and ReboFiles. It
is early: version 0.1, the engine and the editor written and tested, nothing
on npm yet.

## Quick start

```ts
import { sampleWorkspace } from '@rebonotes/core';
import { mountNotes } from '@rebonotes/editor';

import { sheetsFormat } from '@rebonotes/editor/rebosheets';
import { slidesFormat } from '@rebonotes/editor/reboslides';
import { docsFormat } from '@rebonotes/editor/rebodocs';

const notes = mountNotes(document.querySelector('#notes')!, {
  workspace: sampleWorkspace('en'),
  locale: 'en',
  formats: [sheetsFormat, slidesFormat, docsFormat], // files of the suite shown in the page
  storageKey: 'my-app:notes',
  onChange: (workspace) => save(workspace),
});
notes.toMarkdown(); // the page in view, as Markdown
notes.toZip(); // every page, as Markdown files in folders
```

```ts
// A server: read a folder of Markdown, change it, write it back
import { workspaceFromFiles, newPage, workspaceToFiles } from '@rebonotes/core';

const ws = workspaceFromFiles({ 'Projects.md': '# Projects\n\n- [ ] Launch' });
const { workspace } = newPage(ws, 'Ideas', ws.pages[0].id);
workspaceToFiles(workspace); // { 'Projects.md': …, 'Projects/Ideas.md': … }
```

## What a page can have

- **Blocks:** text, three sizes of heading, bulleted and numbered lists, to-do lists, toggles, quotes, callouts, code, dividers, images, pages inside the page, databases, and files.
- **Databases:** a table of rows in a page, each column of a kind (text, number, select, checkbox, date, formula), sorted by any column, shown as a table or as a board of cards dragged between columns. Formulas are worked out by Rebosheets' engine, every function of a spreadsheet included: `=[Price]*[Units]`, `=IF([Paid], "paid", TEXT([Total], "0.00"))`.
- **Files in a page:** a workbook of Rebosheets, a deck of ReboSlides or a Word document shown in the page by the viewers of the suite; PDFs, videos, sounds, and YouTube or Vimeo videos by the browser. Put in with `/file`, pasted, or dropped on the page.
- **Marks:** bold, italic, underline, strikethrough, code, links to the web and links to other pages.
- **Markdown as you type:** `#`, `##`, `###`, `-`, `1.`, `[]`, `>`, ```` ``` ```` and `---` at the start of a line make the block they write; `**bold**`, `*italic*`, `` `code` `` and `~~struck~~` mark the text.
- **The `/` menu** to add any block, and `[[` to link a page (or make a new one).
- **Blocks moved by hand:** drag the grip beside a block, with what is inside it; Tab and Shift+Tab set it in and out; Escape selects whole blocks to move, copy, duplicate or delete them.
- **Pages:** a tree in the side, pages dragged into each other, an icon for each, the path to the page above it, the pages that link to it at its foot, and quick search (⌘K) through every title and line.
- **One history** for the whole workspace: ⌘Z goes back across pages, to the page the change was made on.

## Markdown, both ways

Each page is a Markdown file: what the page is (its id, its icon, when it
was made) in front matter, its title as the first heading, and its blocks as
Markdown writes them. A callout is written as GitHub writes one
(`> [!NOTE]`), a toggle as `<details>`, underline as `<u>`, a file as
Obsidian writes one (`![[Budget.xlsx]]`), and a database as a table, with
what its columns are in a comment before it, so that it reads as a table
anywhere. The tree is
folders: a page `Projects.md` has the pages under it in `Projects/`, and
links between pages are relative paths, so the files work in any editor.

## Packages

| Package | What it is |
| --- | --- |
| `@rebonotes/core` | The engine, with no DOM: pages and blocks, databases and their formulas, what is done to them (immutable), the workspace and its tree, links and backlinks, search, Markdown both ways, files in folders and .zip. |
| `@rebonotes/editor` | The notes, with no framework: the page edited in place, the slash menu, the bar over a selection, dragging blocks, the tree of pages, quick search, the menu of the workspace. |
| `@rebonotes/react` | The notes as a React component (`NotesEditor`), or headless hooks for an interface of one's own (`NotesProvider`, `useNotes`, `NotesPage`). |
| `@rebonotes/collab` | Real-time collaboration: the room server (`bin/rebonotes-collab.mjs`), its client, and the changes between them (`diffWorkspaces` / `applyWorkspaceChanges` of the core). Everyone sees where the others are and undoes only their own changes. |
| `@rebonotes/mcp` | An MCP server (`bin/rebonotes-mcp.mjs`) so that Claude and other assistants read and write notes, in folders of Markdown or live in a room. |
| `@rebonotes/playground` | Where everything is tried: `npm run dev` · :5200 |

And the apps:

| App | What it is | |
| --- | --- | --- |
| `apps/site` | The landing page, the live notes, the demo (with an interface of one's own on the headless hooks) and the documentation, in English and Spanish. | `npm run site` · :5201 |
| `apps/desktop` | The notes as a desktop app with Tauri: a folder of Markdown files is a workspace, written back as it changes. | `npm run desktop` · :5202 |

The engines of the other apps are linked from their repositories beside this
one with `file:`: `@rebosheets/core` (the formulas of databases) and the
viewers of Rebosheets, ReboSlides and Rebodocs (`@rebonotes/editor/rebosheets`,
`/reboslides`, `/rebodocs`, each loaded the first time a file of its kind is
shown). Clone `sheets`, `slides` and `docs` beside `notes`, and run
`npm install` in each.

## Usage

```sh
npm install
npm run dev        # the playground
npm test           # tests of the engine and the editor
npm run typecheck
npm run lint
```

## Collaboration

```sh
npm run collab                     # rooms kept as folders of Markdown in ./rooms, on :7450
npm run collab -- --memory         # or nowhere
```

```tsx
<NotesEditor workspace={ws} collab={{ url: 'http://127.0.0.1:7450', room, name: 'Ana' }} />
```

Changes go block by block: two people writing in different blocks of a page
both keep what they wrote, and in the same block the last one wins. In the
playground: `/?collab=http://127.0.0.1:7450`, **Compartir**, and the address
it gives opened in another window.

## Assistants (MCP)

```sh
claude mcp add rebonotes -- node /path/to/notes/packages/mcp/bin/rebonotes-mcp.mjs --root ~/notes
```

The assistant opens a folder of Markdown as a workspace (`open_workspace`),
reads pages with their blocks numbered (`read_page`), and changes them with
`insert_blocks`, `replace_blocks`, `delete_blocks`, `set_task`,
`create_page`, `move_page` and the rest; or joins a room (`join_room`) and
everyone sees its changes as it makes them.

## Shortcuts

| | |
| --- | --- |
| `/` | The menu of blocks |
| `[[` | Link a page |
| ⌘K · ⌘P | Search the pages (⌘K on selected text: a link) |
| ⌘B · ⌘I · ⌘U · ⌘⇧S · ⌘E | Bold, italic, underline, strikethrough, code |
| Enter · ⇧Enter | A new block · a line break |
| Tab · ⇧Tab | Set in · set out |
| ⌘Enter | Tick a task · open or close a toggle |
| ⌘D | Duplicate the block |
| ⌘⇧↑ · ⌘⇧↓ | Move the block up · down |
| Esc | Select the block (then ↑ ↓, ⇧, Delete, ⌘C) |
| ⌘Z · ⇧⌘Z | Undo · redo |
| ⌘\ | Hide or show the side |
# rebonotes
