# Changelog

Every package of ReboNotes is released at the same version. Before 1.0, a
minor version (0.x.0) may change the API; such changes are listed under
**Changed** with what to do about them.

## 0.1.0 — 2026-10-29

### Added

- **The packages on npm.** `@rebonotes/core`, `editor`, `collab`,
  `react` and `mcp` are each built to a `dist/` of their own by
  `tools/package.mjs`, with their types and a package.json for npm, and
  `npm run release` publishes them in that order, passing over a version
  already there. The apps of the suite linked from beside the repository
  go to npm at the version each is at: `@rebosheets/core` and
  `@rebosheets/viewer` 0.1, `@rebodocs/viewer` 0.13 and
  `@reboslides/viewer` 0.7. The commands of
  `@rebonotes/collab` and `@rebonotes/mcp` are built into the package.
- **The engine** (`@rebonotes/core`): pages of blocks (text, headings,
  lists, to-dos, toggles, quotes, callouts, code, dividers, images, pages),
  text with marks and links, what is done to blocks and pages (immutable),
  the tree of pages, links and backlinks, search without minding case or
  accents, Markdown both ways, the workspace as files in folders and as a
  .zip, and a sample workspace in English and Spanish.
- **The editor** (`@rebonotes/editor`): `mountNotes`, the page edited in
  place with Markdown as it is typed, the `/` menu, `[[` to link a page, the
  bar over a selection, blocks dragged by their grip, whole blocks selected
  with Escape, pasting Markdown and images, the tree of pages with pages
  dragged into each other, quick search (⌘K), one history for the whole
  workspace, the workspace kept in the browser (`storageKey`), and the menu
  of the workspace (open, save, export, language, appearance). In the look
  of the Rebo suite, in rose (#c2255c), light and dark, English and Spanish.
- **Changes between workspaces** (`diffWorkspaces`, `applyWorkspaceChanges`):
  pages and blocks made, changed, taken out and reordered, made on a
  workspace others have changed meanwhile without touching what they did.
  Undo goes by them: ⌘Z takes back this person's change only.
- **Collaboration** (`@rebonotes/collab`): the room server over HTTP and a
  stream of events (`npm run collab`, port 7450), rooms kept in memory, as
  folders of Markdown, or by the system the server works for; the client
  (`connectNotes`, `createRoom`), with the others shown over the page and by
  the block they are in.
- **Assistants** (`@rebonotes/mcp`): an MCP server with 20 tools, on
  folders of Markdown or live in a room.
- **React** (`@rebonotes/react`): `NotesEditor`, and `NotesProvider`,
  `useNotes` and `NotesPage` for an interface of one's own.
- The notes tell what happens (`notes.on('change' | 'update' | 'presence' |
  'navigate')`), take the changes of others (`applyRemote`, `replace`), show
  them (`setPeers`), and can be only the page (`chrome: false`).
- **Databases**: a block with columns of a kind (text, number, select,
  checkbox, date, formula) and rows, as a table edited cell by cell (Enter
  goes down, Tab across) or as a board of cards dragged between the choices
  of a column; sorted by any column; formulas worked out by Rebosheets'
  engine (`=[Price]*[Units]`). As Markdown, a table as GitHub writes one
  with what its columns are in a comment; a table from elsewhere is read as
  a database.
- **Files in a page**: workbooks, decks and Word documents shown by the
  viewers of the suite (`formats: [sheetsFormat, slidesFormat, docsFormat]`
  from `@rebonotes/editor/rebosheets`, `/reboslides`, `/rebodocs`); PDFs,
  videos, sounds and YouTube or Vimeo by the browser. Put in with `/file`
  or `/embed`, pasted or dropped. Written as Obsidian writes them:
  `![[Budget.xlsx]]`. `uploadFile` says where they are kept.
- **Images and files resized** by handles on their sides (narrower or
  wider, kept in the middle) and, for a file shown, under it (taller or
  shorter). Kept in Markdown as Obsidian writes a size: `![a cat|60%](cat.png)`,
  `![[Budget.xlsx|Budget.xlsx|80%x520]]`.
- What has not been kept in the browser yet is kept when the page is closed
  or reloaded.
- **The site** (`npm run site`): the landing page in the suite's design
  with a picture of a page in the hero and the live notes under it, the
  demo on the whole window (the notes as they come, or an interface of
  one's own on the headless hooks, shared with `?collab=`), and sixteen
  pages of documentation in English and Spanish.
- **The desktop app** (`npm run desktop`): a folder of Markdown files is a
  workspace, written back a moment after every change, pages renamed or
  moved taking their files with them; folders and `.zip` files opened from
  the menu, dropped on the window or the icon; native menus in Spanish and
  English.
- The tree of pages scrolls within itself to the page open, not the page
  the notes are in.
- **The playground**, on port 5200, shares its workspace with
  `?collab=http://127.0.0.1:7450`.
