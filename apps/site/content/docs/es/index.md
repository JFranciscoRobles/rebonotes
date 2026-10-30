# Qué es ReboNotes

ReboNotes son notas y wikis para el navegador, con motor propio: páginas de bloques editadas en su sitio, un árbol de páginas, enlaces entre ellas, bases de datos con fórmulas de hoja de cálculo, y las hojas, presentaciones y documentos de la suite Rebo mostrados en una página. Cada página se guarda como un **archivo Markdown**, así que lo que escriben tus usuarios es suyo: se abre en cualquier editor, vive en git y va a donde sea.

Son las notas de la suite Rebo, junto a [Rebodocs](https://rebodocs.com), Rebosheets, ReboSlides y ReboFiles, y se ven como ellas. Es código abierto con licencia MIT.

## Qué hace

- **Páginas de bloques:** texto, títulos, listas, tareas, desplegables, citas, destacados, código, separadores, imágenes, páginas dentro de páginas, bases de datos y archivos. Ver [Escribir en el editor](/docs/editing/).
- **Markdown al escribir**, el menú `/` para cualquier bloque, `[[` para enlazar una página, bloques que se arrastran por su asa.
- **Una wiki:** un árbol de páginas que se ordena arrastrando, las páginas que enlazan a una al pie, búsqueda rápida con ⌘K.
- **Bases de datos:** tablas y tableros con columnas de un tipo y fórmulas con el motor de Rebosheets. Ver [Bases de datos](/docs/databases/).
- **La suite en una página:** un `.xlsx`, un `.reboslides` o un `.docx` mostrados con los visores de la suite. Ver [Archivos en una página](/docs/files/).
- **En equipo:** colaboración en tiempo real, bloque por bloque, viendo dónde está cada quien. Ver [Colaboración](/docs/collaboration/).
- **Asistentes de IA:** un servidor MCP con 20 herramientas. Ver [Asistentes de IA](/docs/assistants/).

## Los paquetes

| Paquete | Qué es |
| --- | --- |
| `@rebonotes/core` | El motor, sin DOM: páginas, bloques, bases de datos, búsqueda, Markdown de ida y vuelta. |
| `@rebonotes/editor` | Las notas para cualquier página, sin framework. |
| `@rebonotes/react` | Las notas como componente de React, o hooks headless. |
| `@rebonotes/collab` | El servidor de salas y su cliente. |
| `@rebonotes/mcp` | El servidor MCP para asistentes. |

Empieza por [Primeros pasos](/docs/getting-started/).
