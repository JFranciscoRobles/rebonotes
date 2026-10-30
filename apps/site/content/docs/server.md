# On a server

The engine, `@rebonotes/core`, has no DOM: it runs in Node, Deno, Bun and Workers. Read a folder of notes, change it, write it back, search it, with the same code the editor runs.

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { markdownToPage, pageToMarkdown, insertBlocks, markdownToBlocks, searchPages, workspaceFromFiles, workspaceToFiles } from '@rebonotes/core';

// A page: read, a block put at its end, written.
const page = markdownToPage(await readFile('notes/Plan.md', 'utf8'));
const next = insertBlocks(page, page.blocks.length, markdownToBlocks('- [ ] Review on Friday'));
await writeFile('notes/Plan.md', pageToMarkdown(next));

// A workspace: every file by its path.
const ws = workspaceFromFiles(files);
searchPages(ws, 'budget'); // pages, the block found, and the words around it
const out = workspaceToFiles(ws);
```

Everything is immutable: each function gives a new page or workspace, and what it did not touch is the same object as before, so a change is found by comparing them. `diffWorkspaces(a, b)` gives the changes from one to the other, and `applyWorkspaceChanges(ws, changes)` makes them; they are what goes between people working together.

## What the engine has

| | |
| --- | --- |
| Pages and blocks | `createPage`, `createBlock`, `updateBlock`, `insertBlocks`, `removeBlocks`, `moveBlocks`, `splitBlock`, `joinBackward`, `indentBlock`, `setBlockType` |
| Text | `insertText`, `deleteText`, `toggleMark`, `setLink`, `plainText` |
| Workspace | `newPage`, `addPage`, `renamePage`, `movePage`, `removePage`, `childrenOf`, `pathTo`, `backlinksOf`, `searchPages` |
| Databases | `createTable`, `addColumn`, `updateColumn`, `addRow`, `setCell`, `computeFormulas`, `sortedRows` |
| Markdown | `markdownToPage`, `pageToMarkdown`, `markdownToBlocks`, `blocksToMarkdown`, `workspaceFromFiles`, `workspaceToFiles`, `workspaceToZip`, `workspaceFromZip` |
| Changes | `diffWorkspaces`, `applyWorkspaceChanges`, `changeKeys` |
