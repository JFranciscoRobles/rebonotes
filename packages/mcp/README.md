# @rebonotes/mcp

An MCP server so that Claude and other assistants read and write the notes of [ReboNotes](../../README.md): a folder of Markdown files is a workspace, each file a page, each folder the pages inside the page of its name.

```sh
claude mcp add rebonotes -- node /path/to/notes/packages/mcp/bin/rebonotes-mcp.mjs --root ~/notes
```

Tools: `open_workspace`, `new_workspace`, `save_workspace`, `join_room`, `undo`, `list_workspaces`, `close_workspace`, `list_pages`, `read_page`, `search_pages`, `get_backlinks`, `create_page`, `write_page`, `insert_blocks`, `replace_blocks`, `delete_blocks`, `set_task`, `rename_page`, `move_page`, `delete_page`. `read_page` numbers each block; the tools that change blocks take those numbers.
