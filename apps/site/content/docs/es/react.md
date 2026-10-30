# Componente de React

`NotesEditor` son las notas completas como componente de React: la barra lateral con el árbol de páginas, y la página abierta. Para una interfaz propia alrededor de la página, ver [Headless](/docs/headless/). No dibuja nada en el servidor y se monta en el navegador tras el primer render, así que funciona tal cual en Next.js.

## Propiedades

| Propiedad | Tipo | Qué hace |
| --- | --- | --- |
| `workspace` | `Workspace` | Las páginas a mostrar. La guardada en `storageKey` si se omite, o una página vacía. |
| `page` | `string` | El id de la página abierta. Cambiarlo abre esa página. |
| `locale` | `'en' \| 'es'` | El idioma de la interfaz. Otro la monta de nuevo, con el espacio como está. |
| `onLocale` | `(locale) => void` | Si se da, el menú (☰) ofrece el idioma; pon `locale` en el elegido. |
| `storageKey` | `string` | Dónde se guarda el espacio en el navegador. |
| `onChange` | `(workspace) => void` | Se llama tras cada cambio. |
| `onNavigate` | `(id) => void` | Se llama con la página abierta: guárdala en la dirección. |
| `formats` | `EmbedFormat[]` | Los archivos de la suite que se muestran en una página. Ver [Archivos en una página](/docs/files/). |
| `uploadImage`, `uploadFile` | `(file) => Promise<string>` | Dónde se guardan las imágenes y archivos que se ponen en una página; una dirección `data:` si se omite. |
| `theme` | `'light' \| 'dark'` | El del sistema si se omite. |
| `menu` | `boolean` | `false` quita el menú del espacio. |
| `name`, `logo` | `string` | El nombre del espacio y la imagen a su lado. |
| `collab` | `{ url, room, name?, ticket? }` | Trabaja con otras personas. Ver [Colaboración](/docs/collaboration/). |
| `onCollab` | `(session) => void` | Avisa cómo va la colaboración. |
| `onReady` | `(notes) => void` | Se llama con las [`Notes`](/docs/editor-api/) una vez que están. |

El espacio se abre de nuevo cuando cambia `workspace`; otro `locale` lo monta de nuevo con la misma página abierta.

```tsx
<NotesEditor workspace={inicial} onChange={(ws) => guardar(ws)} onNavigate={(id) => router.replace(`#${id}`)} />
```

Una ref da las `Notes` mismas: `notes.toMarkdown()`, `notes.toZip()`, `notes.open(id)`, `notes.addPage()`.
