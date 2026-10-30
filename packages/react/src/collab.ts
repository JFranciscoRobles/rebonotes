// Working with other people on the notes, for the component and the hooks
// alike: a session joined while the options say so, left when they change or
// the notes go.

import { connectNotes, type Session } from '@rebonotes/collab/browser';
import type { Notes } from '@rebonotes/editor';

export interface NotesCollab {
  /** Where the collaboration server is. */
  url: string;
  /** The room of the workspace: what `createRoom` gave, or the id the system the notes belong to keeps them by. */
  room: string;
  /** What the others see this person as. */
  name?: string;
  /** What the system the notes belong to gave this person to show they may edit them. */
  ticket?: string;
}

/** Joins the room with the notes; what it returns leaves it. `onChange` hears the state and the people in it. */
export function connect(notes: Notes, collab: NotesCollab, onChange: (session: Session) => void): () => void {
  let session: Session | undefined;
  session = connectNotes(notes, collab.room, { url: collab.url, name: collab.name, ticket: collab.ticket, onChange: () => session && onChange(session) });
  onChange(session);
  return () => session?.leave();
}
