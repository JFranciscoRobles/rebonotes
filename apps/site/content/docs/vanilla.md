# Without a framework

`mountNotes` puts the notes in any element, and gives the `Notes` to talk to.

```ts
import { mountNotes } from '@rebonotes/editor';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';

const notes = mountNotes(document.querySelector('#notes')!, {
  locale: 'en',
  storageKey: 'my-app:notes',
  page: location.hash.slice(1) || undefined,
  onNavigate: (id) => history.replaceState(null, '', `#${id}`),
  formats: [sheetsFormat],
});

notes.on('change', () => markUnsaved());
```

It takes the same options as the [React component](/docs/react/), and `chrome: false` for only the page, without the side and the bar over it. The [Editor API](/docs/editor-api/) lists what `Notes` does.
