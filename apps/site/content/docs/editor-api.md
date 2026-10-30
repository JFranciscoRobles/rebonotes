# Editor API

`mountNotes(element, options)` gives the `Notes`; the React component gives them by its ref or `onReady`.

## Options

`workspace`, `locale`, `storageKey`, `page`, `onChange`, `onNavigate`, `onLocale`, `onTheme`, `menu`, `name`, `logo`, `formats`, `uploadImage`, `uploadFile`, and `chrome: false` for only the page. See [React component](/docs/react/) for what each does.

## Notes

| | What it does |
| --- | --- |
| `workspace` | The workspace as it is now. |
| `page` | The id of the page open. |
| `open(id, focus?)` | Opens a page; `'title'` puts the caret in its title. |
| `addPage(parent?, title?)` | A new page, opened. |
| `deletePage(id, ask?)`, `duplicatePage(id)` | Pages. |
| `load(workspace, page?)` | Another workspace, as a step of the history. |
| `undo()`, `redo()` | This person's changes, across pages. |
| `search()` | The quick search. |
| `toMarkdown(id?)`, `toZip()` | A page, or every page, as Markdown. |
| `setTheme('light' \| 'dark' \| 'system')` | The colours. |
| `on(event, fn)` | `change` (made here), `update` (any), `presence`, `navigate`; gives what stops it. |
| `focus()`, `destroy()` | |

For collaboration, `presence()`, `setPeers(peers)`, `applyRemote(changes, keep)` and `replace(workspace)` are what `connectNotes` uses.

## Formats

A format shows a kind of file in a page: `{ test({ name, type }), view(element, bytes, { language }) → { destroy() }, icon? }`. The suite's come as `@rebonotes/editor/rebosheets`, `/reboslides` and `/rebodocs`.
