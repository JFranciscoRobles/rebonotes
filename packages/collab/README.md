# @rebonotes/collab

Real-time collaboration for [ReboNotes](../../README.md): the room server, its client, and the changes between them.

```sh
node packages/collab/bin/rebonotes-collab.mjs --port 7450 --data rooms   # or --memory, or --backend https://…
```

```ts
import { connectNotes, createRoom } from '@rebonotes/collab/browser';

const room = await createRoom('http://127.0.0.1:7450', notes.workspace, 'Team notes');
const session = connectNotes(notes, room, { url: 'http://127.0.0.1:7450', name: 'Ana' });
```

Each room is a workspace. With `--data`, it is kept as a folder of Markdown files, one per page, in folders as the tree has them. With `--backend`, the system the server works for keeps it (GET and PUT `<url>/<room>` as JSON) and says who may come in (POST `<url>/<room>/access` with the ticket). Changes go block by block: what this person changed and the server has not told back is never overwritten by the others' changes.
