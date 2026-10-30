# Colaboración

Varias personas en un espacio a la vez, cada una viendo dónde están las demás. Arranca el servidor de salas y dale una sala a las notas.

```sh
npm run collab                       # salas como carpetas de Markdown en ./rooms, en :7450
npm run collab -- --memory           # o en ningún lado
npm run collab -- --backend https://tu.app/api/notas --backend-key secreto
```

```tsx
import { createRoom } from '@rebonotes/react';

const room = await createRoom('http://127.0.0.1:7450', workspace, 'Notas del equipo');
<NotesEditor collab={{ url: 'http://127.0.0.1:7450', room, name: 'Ana' }} />
```

Sin React: `connectNotes(notes, room, { url, name })` de `@rebonotes/collab/browser`.

## Cómo viajan los cambios

Lo que alguien escribe se ve al instante, y se manda un momento después como cambios, bloque por bloque: un bloque creado, cambiado, movido o quitado, una página renombrada o movida. Dos personas que escriben en bloques distintos de una página conservan ambas lo suyo; en el mismo bloque, gana el último. Lo que alguien cambió y el servidor no ha confirmado nunca lo pisan los demás. Deshacer quita solo lo que hizo esa persona, sobre el espacio como está.

Los demás se muestran sobre la página, y el bloque donde está cada quien se marca con su color y su nombre.

## Las salas

Con `--data` cada sala es una carpeta de archivos Markdown, uno por página. Con `--backend`, tu sistema guarda los espacios y dice quién puede entrar:

| Ruta | Qué es |
| --- | --- |
| `GET <url>/<room>` | El espacio, como JSON `{ workspace, name }`. |
| `PUT <url>/<room>` | El espacio a guardar. |
| `POST <url>/<room>/access` | `{ ticket }` → `{ name?, readOnly? }`, o un error para no. |

El servidor también entra en un servidor propio: `createCollabServer({ storage }).handle(request, response)` responde lo que está bajo `/collab`.

## En el playground

`npm run collab`, luego abre `http://localhost:5200/?collab=http://127.0.0.1:7450`, pulsa **Compartir**, y abre la dirección que da en otra ventana.
