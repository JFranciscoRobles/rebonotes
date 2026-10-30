# React component

`NotesEditor` is the whole of the notes as a React component: the side with the tree of pages, and the page in view. For an interface of your own around the page, see [Headless](/docs/headless/). It renders nothing on the server and mounts in the browser after the first render, so it works as it is in Next.js.

## Properties

| Property | Type | What it does |
| --- | --- | --- |
| `workspace` | `Workspace` | The pages to show. The one kept under `storageKey` when left out, or one empty page. |
| `page` | `string` | The id of the page open. Changing it opens that page. |
| `locale` | `'en' \| 'es'` | The language of the interface. Another one mounts it again, with the workspace as it is. |
| `onLocale` | `(locale) => void` | Given, the menu (☰) offers the language; set `locale` to the one chosen. |
| `storageKey` | `string` | Where the workspace is kept in the browser. |
| `onChange` | `(workspace) => void` | Called after every change. |
| `onNavigate` | `(id) => void` | Called with the page opened: keep it in the address. |
| `formats` | `EmbedFormat[]` | The files of the suite shown in a page. See [Files in a page](/docs/files/). |
| `uploadImage`, `uploadFile` | `(file) => Promise<string>` | Where images and files put in a page are kept; a `data:` address when left out. |
| `theme` | `'light' \| 'dark'` | The system's when left out. |
| `menu` | `boolean` | `false` leaves out the menu of the workspace. |
| `name`, `logo` | `string` | The name of the workspace and the image beside it. |
| `collab` | `{ url, room, name?, ticket? }` | Works with other people. See [Collaboration](/docs/collaboration/). |
| `onCollab` | `(session) => void` | Told how the collaboration goes. |
| `onReady` | `(notes) => void` | Called with the [`Notes`](/docs/editor-api/) once they are there. |

The workspace is opened again when `workspace` changes; another `locale` mounts it again with the same page open.

```tsx
const [ws, setWs] = useState<Workspace>(initial);

<NotesEditor workspace={initial} onChange={(next) => save(next)} onNavigate={(id) => router.replace(`#${id}`)} />
```

A ref gives the `Notes` themselves: `notes.toMarkdown()`, `notes.toZip()`, `notes.open(id)`, `notes.addPage()`.
