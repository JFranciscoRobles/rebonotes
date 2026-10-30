# Archivos Markdown

Cada página es un archivo Markdown, y el espacio de trabajo es una carpeta de ellos: una página `Proyectos.md` tiene sus páginas internas en `Proyectos/`. Los enlaces entre páginas son rutas relativas, así que los archivos funcionan en cualquier editor, y en git.

```md
---
id: "x7k2m9q1ab"
icon: "🚀"
created: "2026-10-28T10:00:00.000Z"
updated: "2026-10-28T12:30:00.000Z"
order: 0
---

# Plan de lanzamiento

- [x] Escribir el anuncio
- [ ] Mandarlo al equipo

Ver el [presupuesto](./Plan%20de%20lanzamiento/Presupuesto.md).
```

Lo que es la página va en front matter; su título es el primer encabezado. Los bloques se escriben como los escribe Markdown, con algunas decisiones para lo que Markdown no tiene:

| Bloque | Se escribe como |
| --- | --- |
| Destacado | `> [!NOTE]` y sus líneas, como lo escribe GitHub; el emoji primero |
| Desplegable | `<details><summary>…</summary> … </details>` |
| Subrayado · salto de línea | `<u>…</u>` · `<br>` |
| Enlace a una página | `[Título](./Ruta/A/Pagina.md)`, o `[Título](page:<id>)` fuera de archivos |
| Imagen con ancho | `![pie|60%](imagen.png)` |
| Archivo | `![[Presupuesto.xlsx|Presupuesto.xlsx|80%x520]]`, como lo escribe Obsidian |
| Base de datos | Una tabla como la escribe GitHub, con lo que son sus columnas en un comentario. Ver [Bases de datos](/docs/databases/). |

También se leen archivos de otros lados: sin front matter, una página toma su título de su primer encabezado o de su nombre, y una tabla normal se vuelve base de datos.

## En código

```ts
import { markdownToPage, pageToMarkdown, workspaceFromFiles, workspaceToFiles, workspaceToZip } from '@rebonotes/core';

const page = markdownToPage(texto);
const files = workspaceToFiles(workspace); // { 'Plan.md': '…', 'Plan/Presupuesto.md': '…' }
const again = workspaceFromFiles(files);
const zip = workspaceToZip(workspace);
```

En el editor, el menú (☰) guarda el espacio como `.zip` y la página abierta como `.md`, y abre cualquiera de los dos.
