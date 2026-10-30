# Headless: tu propia interfaz

Para una interfaz propia, `@rebonotes/react` da un proveedor, un hook y la página. La barra lateral, el árbol, la ruta y las barras son tuyos; la página se edita en su sitio como en el editor.

```tsx
import { NotesPage, NotesProvider, useNotes } from '@rebonotes/react';

function Arbol() {
  const { tree, page, open, addPage } = useNotes();
  return (
    <nav>
      {tree.map((p) => (
        <button key={p.id} aria-current={page?.id === p.id} onClick={() => open(p.id)}>
          {p.icon} {p.title}
        </button>
      ))}
      <button onClick={() => addPage()}>Nueva página</button>
    </nav>
  );
}

export function Wiki({ workspace }) {
  return (
    <NotesProvider workspace={workspace} locale="es" onChange={guardar}>
      <Arbol />
      <NotesPage className="pagina" />
    </NotesProvider>
  );
}
```

## `useNotes()`

| | Qué es |
| --- | --- |
| `workspace` | El espacio como está ahora. |
| `tree` | Las páginas como árbol: `{ id, title, icon, depth, children }`. |
| `page`, `path` | La página abierta, y las páginas desde arriba hasta ella. |
| `collab` | El estado de la colaboración y quién está, cuando se comparte. |
| `open(id)`, `addPage(parent?, title?)`, `deletePage(id)`, `duplicatePage(id)` | Las páginas. |
| `undo()`, `redo()`, `search()`, `find(query)` | El historial, la búsqueda rápida, y una búsqueda para tu propia lista. |
| `toMarkdown(id?)`, `toZip()` | La página o el espacio como Markdown. |

`NotesProvider` toma `workspace`, `locale`, `storageKey`, `page`, `onChange`, `onNavigate`, `uploadImage`, `collab` y `onCollab`. Hay una sola `NotesPage` por proveedor.
