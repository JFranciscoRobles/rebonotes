// What the server and the notes say to each other, both ways: the events of
// the stream the notes listen to, and what they post. Both sides build and
// read them with these types, so that one cannot send what the other does not
// expect without the compiler saying so.

import { decodeChanges, encodeChanges, type Workspace, type WorkspaceChange } from '@rebonotes/core';

export const DEFAULT_COLLAB_PORT = 7450;
/** The version of what is said here: a server that speaks another sends the notes away saying so. */
export const PROTOCOL = 1;
/** Where everything of the server is, under its address. */
export const PREFIX = '/collab';

/** Where someone is: the page they are on and the block their caret is in. */
export interface Presence {
  page?: string;
  block?: string;
}

/** One sending of changes, in its place in the room. */
export interface Entry {
  by: string;
  seq: number;
  changes: WorkspaceChange[];
}

export interface PeerInfo {
  client: string;
  name: string;
  color: string;
  sel?: Presence;
}

/** What the notes are told first, once they are in. */
export interface Hello {
  protocol: number;
  client: string;
  /** What only these notes are given: everything they send carries it. */
  key: string;
  color: string;
  as: string;
  readOnly: boolean;
  rev: number;
  /** The workspace as the room has it now. */
  workspace: Workspace;
  name: string;
  peers: PeerInfo[];
}

export interface Events {
  hello: Hello;
  op: Entry & { rev: number };
  presence: PeerInfo;
  leave: { client: string };
  removed: Record<string, never>;
}

export type EventName = keyof Events;
export type ServerEvent = { [K in EventName]: { event: K; data: Events[K] } }[EventName];

const NAMES = new Set<string>(['hello', 'op', 'presence', 'leave', 'removed'] satisfies EventName[]);

export const encode = (value: unknown): string => encodeChanges(value);
export const decode = <T = unknown>(text: string): T => decodeChanges<T>(text);

export function eventText<K extends EventName>(event: K, data: Events[K]): string {
  return `event: ${event}\ndata: ${encode(data)}\n\n`;
}

export function readEvent(event: string, data: string): ServerEvent | undefined {
  return NAMES.has(event) ? ({ event, data: decode(data) } as ServerEvent) : undefined;
}

interface Signed {
  client: string;
  key: string;
}

export interface ChangesPost extends Signed {
  seq: number;
  changes: WorkspaceChange[];
}

export interface PresencePost extends Signed {
  sel: Presence | null;
  name?: string;
}

export type LeavePost = Signed;

/** What starts sharing a workspace. */
export interface CreatePost {
  name: string;
  workspace: Workspace;
}
