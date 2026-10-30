# Primeros pasos

ReboNotes aún no está en npm: clona el repositorio con las otras apps de la suite al lado (las fórmulas de las bases de datos usan el motor de Rebosheets, y los visores de la suite muestran los archivos en una página).

```sh
git clone https://github.com/JFranciscoRobles/rebonotes notes
git clone https://github.com/JFranciscoRobles/rebosheets sheets
git clone https://github.com/JFranciscoRobles/reboslides slides
# y Rebodocs como docs/
cd notes && npm install
npm run dev        # el playground, en :5200
```

## En React

```tsx
'use client';
import { NotesEditor, sampleWorkspace } from '@rebonotes/react';

export default function Wiki() {
  return (
    <div style={{ height: '100vh' }}>
      <NotesEditor workspace={sampleWorkspace('es')} locale="es" storageKey="mi-app:notas" />
    </div>
  );
}
```

El elemento toma la altura de lo que lo contiene. Ver [Componente de React](/docs/react/).

## En cualquier página

```ts
import { mountNotes } from '@rebonotes/editor';

const notes = mountNotes(document.querySelector('#notes')!, { storageKey: 'mi-app:notas', locale: 'es' });
```

Ver [Sin framework](/docs/vanilla/).

## Guardar lo escrito

`storageKey` guarda el espacio de trabajo en el navegador. Para guardarlo en tu servidor, tómalo de `onChange` (como JSON), o como archivos con `workspaceToFiles` (Markdown por ruta) o `notes.toZip()`. Ver [Archivos Markdown](/docs/markdown/) y [En un servidor](/docs/server/).

## Las apps de ejemplo

| Comando | Qué es |
| --- | --- |
| `npm run dev` | El playground: todos los paquetes juntos, el menú, los idiomas, compartir con `?collab=`. |
| `npm run collab` | El servidor de colaboración, en :7450. |
| `npm run mcp` | El servidor MCP para asistentes. |
| `npm run site` | Este sitio. |
