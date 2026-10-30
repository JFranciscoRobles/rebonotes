# @rebonotes/core

The engine of [ReboNotes](../../README.md): pages of blocks, the workspace and its tree, links between pages, search, and Markdown both ways. No DOM: it runs in the browser, Node, Deno, Bun and Workers.

```ts
import { markdownToPage, splitBlock, pageToMarkdown, searchPages, workspaceToFiles } from '@rebonotes/core';

const page = markdownToPage('# Plan\n\n- [ ] Write it');
const { page: next } = splitBlock(page, page.blocks[0].id, 5); // Enter after "Write"
pageToMarkdown(next);
```

Everything is immutable: each function gives a new page or workspace, and the blocks it did not touch are the same objects as before, so a change is found by comparing them.
