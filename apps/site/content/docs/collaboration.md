# Collaboration

Several people on one workspace at once, each seeing where the others are. Run the room server, and give the notes a room.

```sh
npm run collab                       # rooms as folders of Markdown in ./rooms, on :7450
npm run collab -- --memory           # or nowhere
npm run collab -- --backend https://your.app/api/notes --backend-key secret
```

```tsx
import { createRoom } from '@rebonotes/react';

const room = await createRoom('http://127.0.0.1:7450', workspace, 'Team notes');
<NotesEditor collab={{ url: 'http://127.0.0.1:7450', room, name: 'Ana' }} />
```

Without React: `connectNotes(notes, room, { url, name })` from `@rebonotes/collab/browser`.

## How changes go

What a person types is seen at once, and sent a moment later as changes, block by block: a block made, changed, moved or taken out, a page renamed or moved. Two people writing in different blocks of a page both keep what they wrote; in the same block, the last one wins. What a person has changed and the server has not told back is never overwritten by the others. Undo takes back only what this person did, on the workspace as it is.

The others are shown over the page, and the block each is in is marked with their colour and name.

## The rooms

With `--data` each room is a folder of Markdown files, one per page. With `--backend`, your system keeps the workspaces and says who may come in:

| Route | What it is |
| --- | --- |
| `GET <url>/<room>` | The workspace, as JSON `{ workspace, name }`. |
| `PUT <url>/<room>` | The workspace to keep. |
| `POST <url>/<room>/access` | `{ ticket }` → `{ name?, readOnly? }`, or an error for no. |

The server goes into a server of your own too: `createCollabServer({ storage }).handle(request, response)` answers what is under `/collab`.

## On the playground

`npm run collab`, then open `http://localhost:5200/?collab=http://127.0.0.1:7450`, press **Share**, and open the address it gives in another window.
