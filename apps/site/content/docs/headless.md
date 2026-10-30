# Headless: your own UI

For an interface of your own, `@rebonotes/react` gives a provider, a hook and the page. The side, the tree, the path and the bars are yours; the page is edited in place as in the editor.

```tsx
import { NotesPage, NotesProvider, useNotes } from '@rebonotes/react';

function Tree() {
  const { tree, page, open, addPage } = useNotes();
  return (
    <nav>
      {tree.map((p) => (
        <button key={p.id} aria-current={page?.id === p.id} onClick={() => open(p.id)}>
          {p.icon} {p.title}
        </button>
      ))}
      <button onClick={() => addPage()}>New page</button>
    </nav>
  );
}

export function Wiki({ workspace }) {
  return (
    <NotesProvider workspace={workspace} locale="en" onChange={save}>
      <Tree />
      <NotesPage className="page" />
    </NotesProvider>
  );
}
```

## `useNotes()`

| | What it is |
| --- | --- |
| `workspace` | The workspace as it is now. |
| `tree` | The pages as a tree: `{ id, title, icon, depth, children }`. |
| `page`, `path` | The page open, and the pages from the top down to it. |
| `collab` | The state of the collaboration and who is in, when shared. |
| `open(id)`, `addPage(parent?, title?)`, `deletePage(id)`, `duplicatePage(id)` | The pages. |
| `undo()`, `redo()`, `search()`, `find(query)` | The history, the quick search, and a search for your own list. |
| `toMarkdown(id?)`, `toZip()` | The page or the workspace as Markdown. |

`NotesProvider` takes `workspace`, `locale`, `storageKey`, `page`, `onChange`, `onNavigate`, `uploadImage`, `collab` and `onCollab`. There is one `NotesPage` in a provider.
