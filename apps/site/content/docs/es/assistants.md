# Asistentes de IA (MCP)

`@rebonotes/mcp` es un servidor MCP para que Claude y otros asistentes lean y escriban notas: una carpeta de archivos Markdown es un espacio, cada archivo una página, cada carpeta las páginas dentro de la página de su nombre.

```sh
claude mcp add rebonotes -- node /ruta/a/notes/packages/mcp/bin/rebonotes-mcp.mjs --root ~/notas
```

Para Claude Desktop, en su configuración:

```json
{
  "mcpServers": {
    "rebonotes": { "command": "node", "args": ["/ruta/a/notes/packages/mcp/bin/rebonotes-mcp.mjs", "--root", "/Users/yo/notas"] }
  }
}
```

`--root` limita las carpetas que puede abrir; cualquiera si se omite.

## Las herramientas

| Herramienta | Qué hace |
| --- | --- |
| `open_workspace`, `new_workspace`, `save_workspace` | Una carpeta de notas, abierta, empezada, escrita. |
| `join_room` | Trabaja en vivo en una sala que alguien tiene abierta: ven cada cambio. |
| `list_pages`, `read_page` | El árbol, y una página con sus bloques numerados ([1], [2]…). |
| `search_pages`, `get_backlinks` | Páginas por sus palabras, y las que enlazan a una. |
| `create_page`, `write_page`, `rename_page`, `move_page`, `delete_page` | Páginas. |
| `insert_blocks`, `replace_blocks`, `delete_blocks`, `set_task` | Bloques, por sus números, escritos en Markdown. |
| `undo`, `list_workspaces`, `close_workspace` | El historial, y lo abierto. |

Una base de datos se lee y escribe como tabla de Markdown, así que un asistente la llena como llena cualquier tabla. Los cambios quedan en memoria hasta `save_workspace`; en una sala, llegan a todos al instante.
