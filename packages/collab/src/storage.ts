// Where the workspaces of the rooms are kept, and who may come into them. The
// server asks a storage for a room's workspace when someone opens it and
// nobody is in, gives it back a while after the changes stop, and asks it
// whether each person may come in. Three come with it: memory, a folder with
// the pages of each room as Markdown files, and the system the server works
// for, over HTTP.

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { type Workspace, workspaceFromFiles, workspaceToFiles } from '@rebonotes/core';

/** What the storage says of someone: what they are called, and whether they only watch. Nothing for no. */
export type Pass = { name?: string; readOnly?: boolean } | undefined;

export interface Kept {
  workspace: Workspace;
  /** The name it was shared under. */
  name: string;
}

export interface RoomStorage {
  load(room: string): Promise<Kept | undefined>;
  save(room: string, kept: Kept): Promise<void>;
  /** Whether rooms may be made here by the notes: false when the system makes them. */
  readonly creates: boolean;
  /** Who may come into a room with `ticket`; everybody, as editors, when left out. */
  access?(room: string, ticket: string | undefined): Promise<Pass>;
}

/** Rooms kept while the server runs, and gone with it. */
export function memoryStorage(): RoomStorage {
  const rooms = new Map<string, string>();
  return {
    creates: true,
    load: async (room) => {
      const kept = rooms.get(room);
      return kept ? (JSON.parse(kept) as Kept) : undefined;
    },
    save: async (room, kept) => {
      rooms.set(room, JSON.stringify(kept));
    },
  };
}

const safe = (room: string) => /^[\w-]{1,80}$/.test(room);
const NAME_FILE = '.rebonotes';

/** Every Markdown file under a folder, by its path from the folder; hidden files and folders left out. */
export function readMarkdownFolder(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at)) {
      if (name.startsWith('.')) continue;
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.md')) files[relative(dir, path).split('\\').join('/')] = readFileSync(path, 'utf8');
    }
  };
  walk(dir);
  return files;
}

/** Each room a folder `<room>/` in `dir`, its pages Markdown files in folders as the tree has them. */
export function folderStorage(dir: string): RoomStorage {
  mkdirSync(dir, { recursive: true });
  return {
    creates: true,
    async load(room) {
      if (!safe(room)) return undefined;
      const at = join(dir, room);
      try {
        if (!statSync(at).isDirectory()) return undefined;
      } catch {
        return undefined;
      }
      let name = room;
      try {
        name = readFileSync(join(at, NAME_FILE), 'utf8').trim() || room;
      } catch {
        // The folder's own name.
      }
      return { workspace: workspaceFromFiles(readMarkdownFolder(at)), name };
    },
    async save(room, kept) {
      if (!safe(room)) return;
      const at = join(dir, room);
      writeMarkdownFolder(at, kept.workspace);
      writeFileSync(join(at, NAME_FILE), kept.name);
    },
  };
}

/**
 * A workspace written to a folder as Markdown files, in folders as its tree
 * has them; the Markdown files there that are not one of its pages (pages
 * gone, renamed, moved) taken away. Says which were written and which went.
 */
export function writeMarkdownFolder(dir: string, workspace: Workspace): { written: string[]; removed: string[] } {
  const files = workspaceToFiles(workspace);
  const removed: string[] = [];
  try {
    for (const old of Object.keys(readMarkdownFolder(dir))) {
      if (old in files) continue;
      rmSync(join(dir, old));
      removed.push(old);
    }
  } catch {
    // A new folder.
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return { written: Object.keys(files), removed };
}

/** The rooms a folder has. */
export function storedRooms(dir: string): string[] {
  try {
    return readdirSync(dir).filter((name) => safe(name) && statSync(join(dir, name)).isDirectory());
  } catch {
    return [];
  }
}

export interface BackendOptions {
  /** Where the system's three routes are: GET and PUT `<url>/<room>` (the workspace as JSON), POST `<url>/<room>/access`. */
  url: string;
  /** Sent as `Authorization: Bearer <key>`. */
  key?: string;
  fetch?: typeof fetch;
}

/** The workspaces kept by the system the server works for, which also says who may come in. */
export function backendStorage(options: BackendOptions): RoomStorage {
  const base = options.url.replace(/\/+$/, '');
  const call = options.fetch ?? fetch;
  const headers = (more: Record<string, string> = {}) => ({ ...more, ...(options.key ? { authorization: `Bearer ${options.key}` } : {}) });
  return {
    creates: false,
    async load(room) {
      const response = await call(`${base}/${encodeURIComponent(room)}`, { headers: headers() });
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`The system said ${response.status} for the workspace of ${room}.`);
      const body = (await response.json()) as { workspace?: Workspace; name?: string } & Workspace;
      const workspace = body.workspace ?? { pages: body.pages };
      return { workspace, name: body.name ?? room };
    },
    async save(room, kept) {
      const response = await call(`${base}/${encodeURIComponent(room)}`, {
        method: 'PUT',
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(kept),
      });
      if (!response.ok) throw new Error(`The system said ${response.status} when ${room} was saved.`);
    },
    async access(room, ticket) {
      const response = await call(`${base}/${encodeURIComponent(room)}/access`, {
        method: 'POST',
        headers: headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ ticket }),
      });
      if (!response.ok) return undefined;
      return (await response.json()) as Pass;
    },
  };
}
