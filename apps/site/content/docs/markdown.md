# Markdown files

Every page is a Markdown file, and the workspace is a folder of them: a page `Projects.md` has the pages inside it in `Projects/`. Links between pages are relative paths, so the files work in any editor, and in git.

```md
---
id: "x7k2m9q1ab"
icon: "🚀"
created: "2026-10-28T10:00:00.000Z"
updated: "2026-10-28T12:30:00.000Z"
order: 0
---

# Launch plan

- [x] Write the announcement
- [ ] Send it to the team

See the [budget](./Launch%20plan/Budget.md).
```

What the page is goes in front matter; its title is the first heading. Blocks are written as Markdown writes them, with a few choices for what Markdown has no word for:

| Block | Written as |
| --- | --- |
| Callout | `> [!NOTE]` and its lines, as GitHub writes one; the emoji first |
| Toggle | `<details><summary>…</summary> … </details>` |
| Underline · line break | `<u>…</u>` · `<br>` |
| Link to a page | `[Title](./Path/To/Page.md)`, or `[Title](page:<id>)` outside files |
| Image with a width | `![caption|60%](image.png)` |
| File | `![[Budget.xlsx|Budget.xlsx|80%x520]]`, as Obsidian writes one |
| Database | A table as GitHub writes one, with what its columns are in a comment. See [Databases](/docs/databases/). |

Files from elsewhere are read too: without front matter, a page takes its title from its first heading or its name, and a plain table becomes a database.

## As code

```ts
import { markdownToPage, pageToMarkdown, workspaceFromFiles, workspaceToFiles, workspaceToZip } from '@rebonotes/core';

const page = markdownToPage(text);
const files = workspaceToFiles(workspace); // { 'Launch plan.md': '…', 'Launch plan/Budget.md': '…' }
const again = workspaceFromFiles(files);
const zip = workspaceToZip(workspace);
```

In the editor, the menu (☰) saves the workspace as a `.zip` and the page in view as a `.md`, and opens either.
