# @rebonotes/editor

The notes of [ReboNotes](../../README.md) for the browser, with no framework: the tree of pages, the page edited in place, the `/` menu, quick search and the menu of the workspace.

```ts
import { mountNotes } from '@rebonotes/editor';

const notes = mountNotes(element, { locale: 'es', storageKey: 'app:notes', onNavigate: (id) => (location.hash = id) });
notes.open(id);
notes.toMarkdown();
```

The look is set by custom properties on `.rn-root` (`--rn-accent`, `--rn-font`, …), light and dark; `data-theme="light"` or `"dark"` on it fixes one.
