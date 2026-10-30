# En un servidor

El motor, `@rebonotes/core`, no usa el DOM: corre en Node, Deno, Bun y Workers. Lee una carpeta de notas, cámbiala, escríbela, búscala, con el mismo código que corre el editor.

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { markdownToPage, pageToMarkdown, insertBlocks, markdownToBlocks, searchPages, workspaceFromFiles, workspaceToFiles } from '@rebonotes/core';

// Una página: leída, un bloque al final, escrita.
const page = markdownToPage(await readFile('notas/Plan.md', 'utf8'));
const next = insertBlocks(page, page.blocks.length, markdownToBlocks('- [ ] Revisar el viernes'));
await writeFile('notas/Plan.md', pageToMarkdown(next));

// Un espacio: cada archivo por su ruta.
const ws = workspaceFromFiles(files);
searchPages(ws, 'presupuesto'); // páginas, el bloque encontrado y las palabras alrededor
const out = workspaceToFiles(ws);
```

Todo es inmutable: cada función da una página o espacio nuevo, y lo que no tocó es el mismo objeto que antes, así que un cambio se encuentra comparándolos. `diffWorkspaces(a, b)` da los cambios de uno a otro, y `applyWorkspaceChanges(ws, changes)` los aplica; son lo que viaja entre personas trabajando juntas.

## Lo que tiene el motor

| | |
| --- | --- |
| Páginas y bloques | `createPage`, `createBlock`, `updateBlock`, `insertBlocks`, `removeBlocks`, `moveBlocks`, `splitBlock`, `joinBackward`, `indentBlock`, `setBlockType` |
| Texto | `insertText`, `deleteText`, `toggleMark`, `setLink`, `plainText` |
| Espacio | `newPage`, `addPage`, `renamePage`, `movePage`, `removePage`, `childrenOf`, `pathTo`, `backlinksOf`, `searchPages` |
| Bases de datos | `createTable`, `addColumn`, `updateColumn`, `addRow`, `setCell`, `computeFormulas`, `sortedRows` |
| Markdown | `markdownToPage`, `pageToMarkdown`, `markdownToBlocks`, `blocksToMarkdown`, `workspaceFromFiles`, `workspaceToFiles`, `workspaceToZip`, `workspaceFromZip` |
| Cambios | `diffWorkspaces`, `applyWorkspaceChanges`, `changeKeys` |
