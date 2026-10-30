# @rebonotes/react

The notes of [ReboNotes](../../README.md) in React: the whole thing as a component, or headless hooks for an interface of one's own.

```tsx
import { NotesEditor } from '@rebonotes/react';

<NotesEditor workspace={ws} locale="es" onChange={save} collab={{ url, room, name: 'Ana' }} />
```

```tsx
import { NotesPage, NotesProvider, useNotes } from '@rebonotes/react';

function Tree() {
  const { tree, open, page } = useNotes();
  return tree.map((p) => <button key={p.id} onClick={() => open(p.id)}>{p.icon} {p.title}</button>);
}

<NotesProvider workspace={ws} onChange={save}>
  <Tree />
  <NotesPage />
</NotesProvider>
```
