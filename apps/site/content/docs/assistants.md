# AI assistants (MCP)

`@rebonotes/mcp` is an MCP server so that Claude and other assistants read and write notes: a folder of Markdown files is a workspace, each file a page, each folder the pages inside the page of its name.

```sh
claude mcp add rebonotes -- node /path/to/notes/packages/mcp/bin/rebonotes-mcp.mjs --root ~/notes
```

For Claude Desktop, in its configuration:

```json
{
  "mcpServers": {
    "rebonotes": { "command": "node", "args": ["/path/to/notes/packages/mcp/bin/rebonotes-mcp.mjs", "--root", "/Users/me/notes"] }
  }
}
```

`--root` limits the folders it may open; anywhere when left out.

## The tools

| Tool | What it does |
| --- | --- |
| `open_workspace`, `new_workspace`, `save_workspace` | A folder of notes, opened, started, written back. |
| `join_room` | Works live in a room people have open: they see every change. |
| `list_pages`, `read_page` | The tree, and a page with its blocks numbered ([1], [2]…). |
| `search_pages`, `get_backlinks` | Pages by their words, and the pages that link to one. |
| `create_page`, `write_page`, `rename_page`, `move_page`, `delete_page` | Pages. |
| `insert_blocks`, `replace_blocks`, `delete_blocks`, `set_task` | Blocks, by their numbers, written as Markdown. |
| `undo`, `list_workspaces`, `close_workspace` | The history, and what is open. |

A database is read and written as a Markdown table, so an assistant fills one as it fills any table. Changes stay in memory until `save_workspace`; in a room, they go to everyone at once.
