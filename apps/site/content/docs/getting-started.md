# Getting started

ReboNotes is not on npm yet: clone the repository, with the other apps of the suite beside it (the formulas of databases use Rebosheets' engine, and the viewers of the suite show files in a page).

```sh
git clone https://github.com/JFranciscoRobles/rebonotes notes
git clone https://github.com/JFranciscoRobles/rebosheets sheets
git clone https://github.com/JFranciscoRobles/reboslides slides
# and Rebodocs as docs/
cd notes && npm install
npm run dev        # the playground, on :5200
```

## In React

```tsx
'use client';
import { NotesEditor, sampleWorkspace } from '@rebonotes/react';

export default function Wiki() {
  return (
    <div style={{ height: '100vh' }}>
      <NotesEditor workspace={sampleWorkspace('en')} locale="en" storageKey="my-app:notes" />
    </div>
  );
}
```

The element takes the height of what it is in. See [React component](/docs/react/).

## In any page

```ts
import { mountNotes } from '@rebonotes/editor';

const notes = mountNotes(document.querySelector('#notes')!, { storageKey: 'my-app:notes', locale: 'es' });
```

See [Without a framework](/docs/vanilla/).

## Keeping what is written

`storageKey` keeps the workspace in the browser. To keep it on your server, take it from `onChange` (as JSON), or as files with `workspaceToFiles` (Markdown by path) or `notes.toZip()`. See [Markdown files](/docs/markdown/) and [On a server](/docs/server/).

## The example apps

| Command | What it is |
| --- | --- |
| `npm run dev` | The playground: every package together, the menu, languages, sharing with `?collab=`. |
| `npm run collab` | The collaboration server, on :7450. |
| `npm run mcp` | The MCP server for assistants. |
| `npm run site` | This site. |
