# Sin framework

`mountNotes` pone las notas en cualquier elemento, y da las `Notes` para hablar con ellas.

```ts
import { mountNotes } from '@rebonotes/editor';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';

const notes = mountNotes(document.querySelector('#notes')!, {
  locale: 'es',
  storageKey: 'mi-app:notas',
  page: location.hash.slice(1) || undefined,
  onNavigate: (id) => history.replaceState(null, '', `#${id}`),
  formats: [sheetsFormat],
});

notes.on('change', () => marcarSinGuardar());
```

Toma las mismas opciones que el [componente de React](/docs/react/), y `chrome: false` para solo la página, sin la barra lateral ni la barra de arriba. La [API del editor](/docs/editor-api/) lista lo que hacen las `Notes`.
