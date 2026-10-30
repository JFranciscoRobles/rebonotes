# API del editor

`mountNotes(element, options)` da las `Notes`; el componente de React las da por su ref u `onReady`.

## Opciones

`workspace`, `locale`, `storageKey`, `page`, `onChange`, `onNavigate`, `onLocale`, `onTheme`, `menu`, `name`, `logo`, `formats`, `uploadImage`, `uploadFile`, y `chrome: false` para solo la página. Ver [Componente de React](/docs/react/) para lo que hace cada una.

## Notes

| | Qué hace |
| --- | --- |
| `workspace` | El espacio como está ahora. |
| `page` | El id de la página abierta. |
| `open(id, focus?)` | Abre una página; `'title'` pone el cursor en su título. |
| `addPage(parent?, title?)` | Una página nueva, abierta. |
| `deletePage(id, ask?)`, `duplicatePage(id)` | Páginas. |
| `load(workspace, page?)` | Otro espacio, como paso del historial. |
| `undo()`, `redo()` | Los cambios de esta persona, entre páginas. |
| `search()` | La búsqueda rápida. |
| `toMarkdown(id?)`, `toZip()` | Una página, o todas, como Markdown. |
| `setTheme('light' \| 'dark' \| 'system')` | Los colores. |
| `on(event, fn)` | `change` (hecho aquí), `update` (cualquiera), `presence`, `navigate`; da lo que lo detiene. |
| `focus()`, `destroy()` | |

Para colaborar, `presence()`, `setPeers(peers)`, `applyRemote(changes, keep)` y `replace(workspace)` son lo que usa `connectNotes`.

## Formatos

Un formato muestra un tipo de archivo en una página: `{ test({ name, type }), view(element, bytes, { language }) → { destroy() }, icon? }`. Los de la suite vienen como `@rebonotes/editor/rebosheets`, `/reboslides` y `/rebodocs`.
