# Desktop

ReboNotes as an application of its own, with [Tauri](https://tauri.app): the notes in a window of the system, and the workspace a folder of Markdown files on the disk.

- **A folder is a workspace**: each page a `.md` file, each folder the pages inside the page of its name. Every change is written back a moment after it is made, so the folder is always what the notes say: keep it in git, sync it, open it in any editor. Pages renamed or moved take their files with them.
- **Opened** from Archivo → Abrir carpeta, by dropping a folder (or a `.zip` of notes) on the window or on the icon of the application, or as it was last time. Each workspace in a window of its own.
- **Not in a folder yet** (the first notes, or a `.zip` opened): Archivo → Guardar en una carpeta. A folder that has notes already is offered to be opened instead, never written over.
- **The menus of the system**, in Spanish or English: a new page, a new window, open, save, export as `.zip` or the page as `.md`, undo, search, the theme and the language.
- Workbooks, decks and documents put in a page are shown by the viewers of the suite, as in the browser.
- **What the page cannot do** is in `src-tauri/src/lib.rs`: reading a folder of Markdown and writing a workspace back to it, opening windows, hearing of the folders the system asks to open.

```bash
npm run desktop         # from the root: the application, with the page served by Vite (port 5202)
npm run build:desktop   # ReboNotes.app (or the installer of the system) in src-tauri/target/release/bundle
```

It needs Rust and the [prerequisites of Tauri](https://tauri.app/start/prerequisites/). The icons are made from `apps/site/public/logo.svg` with `npx tauri icon`.
