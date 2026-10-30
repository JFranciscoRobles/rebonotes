# What is ReboNotes

ReboNotes is notes and wikis for the browser, with an engine of its own: pages of blocks edited in place, a tree of pages, links between them, databases with spreadsheet formulas, and the workbooks, decks and documents of the Rebo suite shown in a page. Every page is kept as a **Markdown file**, so what your users write is theirs: it opens in any editor, lives in git, and goes anywhere.

It is the notes of the Rebo suite, beside [Rebodocs](https://rebodocs.com), Rebosheets, ReboSlides and ReboFiles, and it looks like them. It is open source under MIT.

## What it does

- **Pages of blocks:** text, headings, lists, to-dos, toggles, quotes, callouts, code, dividers, images, pages inside pages, databases and files. See [Writing in the editor](/docs/editing/).
- **Markdown as you type**, the `/` menu for every block, `[[` to link a page, blocks dragged by their grip.
- **A wiki:** a tree of pages dragged into shape, the pages that link to one at its foot, quick search with ⌘K.
- **Databases:** tables and boards with columns of a kind and formulas by Rebosheets' engine. See [Databases](/docs/databases/).
- **The suite in a page:** an `.xlsx`, a `.reboslides` or a `.docx` shown by the viewers of the suite. See [Files in a page](/docs/files/).
- **Together:** real-time collaboration, block by block, with where everyone is. See [Collaboration](/docs/collaboration/).
- **AI assistants:** an MCP server with 20 tools. See [AI assistants](/docs/assistants/).

## The packages

| Package | What it is |
| --- | --- |
| `@rebonotes/core` | The engine, with no DOM: pages, blocks, databases, search, Markdown both ways. |
| `@rebonotes/editor` | The notes for any page, without a framework. |
| `@rebonotes/react` | The notes as a React component, or headless hooks. |
| `@rebonotes/collab` | The room server and its client. |
| `@rebonotes/mcp` | The MCP server for assistants. |

Start with [Getting started](/docs/getting-started/).
