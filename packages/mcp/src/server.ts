// A Model Context Protocol server for notes: what an assistant talks to. It
// speaks JSON-RPC, a message a line, and offers the tools of `tools.ts` on
// the folders of Markdown it is asked to open (each a workspace, kept in
// memory until it is saved) and on the rooms it joins. Node only; `main.ts`
// runs it.

import { existsSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { joinRoom, type Session } from '@rebonotes/collab/browser';
import { readMarkdownFolder, writeMarkdownFolder } from '@rebonotes/collab/storage';
import { applyWorkspaceChanges, createPage, diffWorkspaces, type Workspace, workspaceFromFiles } from '@rebonotes/core';
import { version } from '../package.json';
import { findTool, type Tool, TOOLS, ToolError } from './tools';

export interface ServerOptions {
  /** Folders that may be opened and written; anywhere, when none is given. */
  roots?: string[];
  /** Where relative paths start. */
  cwd?: string;
}

interface Message {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface Open {
  /** The folder, or "room:<id>". */
  key: string;
  ws: Workspace;
  unsaved: boolean;
  /** Each change of the tools, before and after: what undo takes back. */
  history: { before: Workspace; after: Workspace }[];
  session?: Session;
  listeners?: Set<() => void>;
}

const HISTORY = 30;
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS = `Tools to read and write notes: workspaces of pages kept as Markdown files, in folders as the tree of pages has them. Open a folder with open_workspace, see its pages with list_pages, read one with read_page: it shows each block with its number ([1], [2]…), which insert_blocks, replace_blocks, delete_blocks and set_task take. Pages go by their id, their title or their path ("Projects / Launch"). Write Markdown. Changes stay in memory until save_workspace. To work on notes people have open in ReboNotes, join their room with join_room: every change is seen by them at once.`;

const WORKSPACE = { type: 'string', description: 'The folder of a workspace opened with open_workspace, or "room:<id>" for one joined. Left out, the last one opened.' };

const OWN: (Omit<Tool, 'run' | 'writes'> & { annotations: Record<string, boolean> })[] = [
  {
    name: 'open_workspace',
    title: 'Open a workspace',
    annotations: { readOnlyHint: true },
    description:
      'Opens a folder of Markdown files as a workspace of notes: each file a page, each folder the pages inside the page of its name. Kept in memory: nothing is written until save_workspace. Gives its pages.',
    properties: { folder: { type: 'string', description: 'The path of the folder.' } },
    required: ['folder'],
  },
  {
    name: 'new_workspace',
    title: 'New workspace',
    annotations: { readOnlyHint: true },
    description: 'Starts an empty workspace with one page, to fill and save to a folder.',
    properties: { folder: { type: 'string', description: 'The folder it will be saved to.' }, title: { type: 'string', description: 'The title of its first page. "Notes" when left out.' } },
    required: ['folder'],
  },
  {
    name: 'save_workspace',
    title: 'Save a workspace',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    description: 'Writes a workspace to its folder as Markdown files. The Markdown files there that are no longer one of its pages (pages deleted, renamed or moved) are taken away: it says which.',
    properties: { workspace: WORKSPACE },
  },
  {
    name: 'join_room',
    title: 'Join a room',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    description:
      'Works on notes people have open in ReboNotes, through the collaboration server: every change of the tools is seen by them at once, and theirs by the tools. The person shares the address of the server and the id of the room.',
    properties: {
      url: { type: 'string', description: 'Where the collaboration server is, as "http://127.0.0.1:7450".' },
      room: { type: 'string', description: 'The id of the room.' },
      name: { type: 'string', description: 'What the people in it see the assistant as. "Claude" when left out.' },
      ticket: { type: 'string', description: 'What the system the notes belong to gave, when it asks for one.' },
    },
    required: ['url', 'room'],
  },
  {
    name: 'undo',
    title: 'Undo changes',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    description: `Undoes the last changes the tools made to a workspace, one at a time or several, up to ${HISTORY}. In a room, only the tools' changes are taken back.`,
    properties: { workspace: WORKSPACE, steps: { type: 'integer', description: 'How many. 1 when left out.' } },
  },
  {
    name: 'list_workspaces',
    title: 'List the workspaces',
    annotations: { readOnlyHint: true },
    description: 'The workspaces open, with whether each has changes not saved.',
    properties: {},
  },
  {
    name: 'close_workspace',
    title: 'Close a workspace',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    description: 'Forgets a workspace that is open, with any changes that were not saved, or leaves a room.',
    properties: { workspace: WORKSPACE },
  },
];

export interface NotesServer {
  handle(message: Message): Promise<object | undefined>;
  /** Leaves the rooms joined. */
  close(): void;
}

export function createNotesServer(options: ServerOptions = {}): NotesServer {
  const cwd = options.cwd ?? process.cwd();
  const roots = (options.roots ?? []).map((root) => resolve(cwd, root));
  const open = new Map<string, Open>();
  let current: string | undefined;

  class Refused extends Error {}
  const refuse = (message: string): never => {
    throw new Refused(message);
  };

  const folderOf = (given: unknown): string => {
    if (typeof given !== 'string' || !given.trim()) refuse('"folder" must be the path of a folder.');
    const path = resolve(cwd, given as string);
    const inside = (root: string) => {
      const rel = relative(root, path);
      return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
    };
    if (roots.length && !roots.some(inside)) refuse(`"${given}" is outside the folders this server may use: ${roots.join(', ')}.`);
    return path;
  };

  const workspaceOf = (given: unknown): Open => {
    if (given === undefined || given === null || given === '') {
      if (!current) refuse('No workspace is open: open a folder with open_workspace, start one with new_workspace, or join one with join_room.');
      return open.get(current!)!;
    }
    if (String(given).startsWith('room:')) return open.get(String(given)) ?? refuse(`"${given}" is not joined: join it with join_room first.`);
    return open.get(folderOf(given)) ?? refuse(`"${given}" is not open: open it with open_workspace first.`);
  };

  const pages = (ws: Workspace) => findTool('list_pages')!.run(ws, {}).text;
  const until = async (ok: () => boolean, ms: number) => {
    for (let waited = 0; waited < ms && !ok(); waited += 25) await new Promise((r) => setTimeout(r, 25));
  };
  const told = (item: Open) => {
    for (const fn of item.listeners ?? []) fn();
  };

  const own = async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'open_workspace': {
        const folder = folderOf(args.folder);
        if (!existsSync(folder) || !statSync(folder).isDirectory()) refuse(`There is no folder at "${folder}".`);
        const ws = workspaceFromFiles(readMarkdownFolder(folder));
        open.set(folder, { key: folder, ws, unsaved: false, history: [] });
        current = folder;
        return `Opened ${folder}.\n${pages(ws)}`;
      }
      case 'new_workspace': {
        const folder = folderOf(args.folder);
        const ws = { pages: [createPage(typeof args.title === 'string' && args.title ? args.title : 'Notes')] };
        open.set(folder, { key: folder, ws, unsaved: true, history: [] });
        current = folder;
        return `Started a workspace, to be saved in ${folder}${existsSync(folder) ? ' (the folder is there: saving takes away its Markdown files that are not pages of this workspace)' : ''}. Its page: "${ws.pages[0].title}" (id ${ws.pages[0].id}).`;
      }
      case 'save_workspace': {
        const item = workspaceOf(args.workspace);
        if (item.session) return 'It is the workspace of a room: its server keeps it.';
        const { written, removed } = writeMarkdownFolder(item.key, item.ws);
        item.unsaved = false;
        return `Saved ${written.length} page(s) to ${item.key}.${removed.length ? ` Took away files that are no longer pages: ${removed.join(', ')}.` : ''}`;
      }
      case 'join_room': {
        if (typeof args.url !== 'string' || !/^https?:\/\//.test(args.url)) refuse('"url" must be the address of the collaboration server, as "http://127.0.0.1:7450".');
        if (typeof args.room !== 'string' || !args.room.trim()) refuse('"room" must be the id of the room.');
        const key = `room:${args.room}`;
        open.get(key)?.session?.leave();
        const item: Open = { key, ws: { pages: [] }, unsaved: false, history: [], listeners: new Set() };
        open.set(key, item);
        current = key;
        let ready = false;
        item.session = joinRoom(
          String(args.room),
          {
            workspace: () => item.ws,
            load: (ws) => {
              item.ws = ws;
              ready = true;
            },
            applyRemote: (changes, keep) => {
              item.ws = applyWorkspaceChanges(item.ws, changes, { keep });
            },
            onChange: (fn) => {
              item.listeners!.add(fn);
              return () => item.listeners!.delete(fn);
            },
          },
          { url: String(args.url), name: typeof args.name === 'string' && args.name ? args.name : 'Claude', ticket: typeof args.ticket === 'string' ? args.ticket : undefined, batch: 0 },
        );
        await until(() => ready || item.session?.state === 'closed', 8000);
        const session = item.session;
        if (session.state === 'closed' || !ready) {
          open.delete(key);
          session.leave();
          return refuse(session.state === 'closed' ? `Could not join the room: ${session.reason}.` : `The server at ${args.url} did not answer.`);
        }
        const peers = session.peers.map((p) => p.name);
        return `Joined the room "${session.title || args.room}" as ${session.name}${peers.length ? `, with ${peers.join(', ')}` : ''}. Use workspace "${key}".\n${pages(item.ws)}`;
      }
      case 'undo': {
        const item = workspaceOf(args.workspace);
        const steps = args.steps === undefined ? 1 : Number(args.steps);
        if (!Number.isInteger(steps) || steps < 1) refuse('"steps" must be a whole number of 1 or more.');
        if (!item.history.length) refuse('There is nothing to undo.');
        const n = Math.min(steps, item.history.length);
        // Each step taken back on the workspace as it is: what others changed meanwhile stays.
        for (const step of item.history.splice(item.history.length - n).reverse()) item.ws = applyWorkspaceChanges(item.ws, diffWorkspaces(step.after, step.before));
        item.unsaved = !item.session;
        told(item);
        return `Undid ${n} change(s).${item.history.length ? ` ${item.history.length} more can be undone.` : ''}`;
      }
      case 'list_workspaces':
        return open.size
          ? [...open.values()].map((o) => `${o.key} (${o.ws.pages.length} pages)${o.unsaved ? ' (changes not saved)' : ''}${o.key === current ? ' (current)' : ''}`).join('\n')
          : 'No workspace is open.';
      case 'close_workspace': {
        const item = workspaceOf(args.workspace);
        item.session?.leave();
        open.delete(item.key);
        if (current === item.key) current = [...open.keys()].pop();
        return `Closed ${item.key}${item.unsaved ? ', without saving its changes' : ''}.`;
      }
    }
    return refuse(`There is no tool "${name}".`);
  };

  const call = async (name: string, args: Record<string, unknown>): Promise<string> => {
    if (OWN.some((t) => t.name === name)) return own(name, args);
    const tool = findTool(name) ?? refuse(`There is no tool "${name}".`);
    const { workspace: which, ...rest } = args;
    const item = workspaceOf(which);
    const { text, workspace } = tool.run(item.ws, rest);
    if (tool.writes && workspace && workspace !== item.ws) {
      item.history.push({ before: item.ws, after: workspace });
      if (item.history.length > HISTORY) item.history.shift();
      item.ws = workspace;
      item.unsaved = !item.session;
      told(item);
    }
    return text;
  };

  const schema = (properties: Record<string, unknown>, required?: string[]) => ({ type: 'object', properties, ...(required?.length && { required }) });
  const listed = [
    ...OWN.map((t) => ({ name: t.name, title: t.title, description: t.description, inputSchema: schema(t.properties, t.required), annotations: { title: t.title, ...t.annotations } })),
    ...TOOLS.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: schema({ workspace: WORKSPACE, ...t.properties }, t.required),
      annotations: { title: t.title, readOnlyHint: !t.writes, ...(t.writes && { destructiveHint: false, idempotentHint: false }) },
    })),
  ];

  return {
    close() {
      for (const item of open.values()) item.session?.leave();
    },
    async handle(message) {
      const { id, method, params = {} } = message;
      const answer = (result: object) => (id === undefined || id === null ? undefined : { jsonrpc: '2.0', id, result });
      switch (method) {
        case 'initialize': {
          const asked = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
          return answer({
            protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
            capabilities: { tools: {} },
            serverInfo: { name: 'rebonotes', title: 'ReboNotes', version },
            instructions: INSTRUCTIONS,
          });
        }
        case 'ping':
          return answer({});
        case 'tools/list':
          return answer({ tools: listed });
        case 'tools/call': {
          const name = String(params.name ?? '');
          const args = params.arguments && typeof params.arguments === 'object' ? (params.arguments as Record<string, unknown>) : {};
          try {
            return answer({ content: [{ type: 'text', text: await call(name, args) }] });
          } catch (error) {
            // What the assistant can put right is said to it as the result of the tool; anything else is a fault of the server.
            const known = error instanceof Refused || error instanceof ToolError;
            const text = error instanceof Error ? error.message : String(error);
            return answer({ content: [{ type: 'text', text: known ? text : `The tool failed: ${text}` }], isError: true });
          }
        }
        default:
          if (id === undefined || id === null) return undefined;
          return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
      }
    },
  };
}
