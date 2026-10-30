// The notes' side of working on a workspace with other people: they tell the
// server what their person changes, make the changes of the others as they
// come, and show where each of them is.
//
// What a person types is seen at once, without waiting for the server. The
// others' changes are made on the workspace as it is, except to the blocks
// and pages this person has changed and the server has not yet told back:
// those stay theirs until it does, and whichever the server took last is
// then the one everybody has. Undoing is the notes' own, and takes back this
// person's changes only.

import { applyWorkspaceChanges, changeKeys, diffWorkspaces, type Workspace, type WorkspaceChange } from '@rebonotes/core';
import { type ChangesPost, type CreatePost, decode, encode, type Hello, type LeavePost, PREFIX, PROTOCOL, type Presence, type PresencePost, readEvent, type ServerEvent } from './protocol';

export { DEFAULT_COLLAB_PORT, PROTOCOL, type Presence } from './protocol';

/** What a session works on: the workspace shown, and where its person is. */
export interface CollabHost {
  workspace(): Workspace;
  /** The room's workspace, given whole when the session comes in. */
  load(workspace: Workspace): void;
  /** The others' changes, made on the workspace, what is in `keep` (by `changeKey`) left as it is. */
  applyRemote(changes: WorkspaceChange[], keep: Set<string>): void;
  /** Called after each change of the workspace made here; what it returns stops it. */
  onChange(fn: () => void): () => void;
  presence?(): Presence;
  onPresence?(fn: () => void): () => void;
  setPeers?(peers: PeerPresence[]): void;
}

export interface Peer {
  client: string;
  name: string;
  color: string;
}

export interface PeerPresence extends Peer {
  page?: string;
  block?: string;
}

export type CollabState = 'connecting' | 'on' | 'offline' | 'closed';
export type ClosedReason = 'left' | 'not-found' | 'denied' | 'removed' | 'outdated';

export interface CollabOptions {
  url: string;
  name?: string;
  ticket?: string;
  onChange?: () => void;
  /** How long changes are gathered before they are sent; 150 ms. */
  batch?: number;
}

export interface Session {
  readonly room: string;
  readonly state: CollabState;
  readonly reason: ClosedReason | undefined;
  readonly title: string;
  readonly peers: Peer[];
  readonly color: string;
  readonly name: string;
  readonly readOnly: boolean;
  readonly pending: number;
  rename(name: string): void;
  leave(): void;
}

const clean = (url: string) => url.replace(/\/+$/, '');

/** Starts sharing a workspace: says the name of the room the server made for it. */
export async function createRoom(url: string, workspace: Workspace, name: string, token?: string): Promise<string> {
  const post: CreatePost = { name, workspace };
  const response = await fetch(`${clean(url)}${PREFIX}/rooms${token ? `?token=${encodeURIComponent(token)}` : ''}`, { method: 'POST', body: encode(post) });
  const answer = decode<{ room?: string; error?: string }>(await response.text());
  if (!response.ok || !answer.room) throw new Error(answer.error ?? `${response.status}`);
  return answer.room;
}

async function* events(body: ReadableStream<Uint8Array>): AsyncGenerator<ServerEvent> {
  const reader = body.getReader();
  const text = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += text.decode(value, { stream: true });
    let end = buffer.indexOf('\n\n');
    while (end >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) name = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      const event = data ? readEvent(name, data) : undefined;
      if (event) yield event;
      end = buffer.indexOf('\n\n');
    }
  }
}

export function joinRoom(room: string, host: CollabHost, options: CollabOptions): Session {
  const base = `${clean(options.url)}${PREFIX}/rooms/${encodeURIComponent(room)}`;
  const batch = options.batch ?? 150;
  let state: CollabState = 'connecting';
  let reason: ClosedReason | undefined;
  let me: Hello | undefined;
  let name = options.name ?? '';
  let peers: (Peer & { sel?: Presence })[] = [];
  /** The workspace as of the last sending, with the others' changes made on it as on the one shown: what is changed here since is counted from it. */
  let shadow: Workspace | undefined;
  /** This person's sendings the server has not told of yet. */
  let sent: { seq: number; changes: WorkspaceChange[]; keys: Set<string> }[] = [];
  let seq = 0;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let presenceTimer: ReturnType<typeof setTimeout> | undefined;
  let retry = 500;
  let abort: AbortController | undefined;
  let applying = false;

  const changed = () => options.onChange?.();
  const showPeers = () => host.setPeers?.(peers.map((peer) => ({ client: peer.client, name: peer.name, color: peer.color, page: peer.sel?.page, block: peer.sel?.block })));
  const post = (what: string, data: unknown) => fetch(`${base}/${what}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: encode(data) });

  const flush = () => {
    flushTimer = undefined;
    if (!me || state !== 'on' || !shadow || me.readOnly) return;
    const now = host.workspace();
    const changes = diffWorkspaces(shadow, now);
    if (!changes.length) return;
    shadow = now;
    const sending = { seq: ++seq, changes, keys: changeKeys(changes) };
    sent.push(sending);
    changed();
    const data: ChangesPost = { client: me.client, key: me.key, seq: sending.seq, changes };
    post('changes', data).catch(() => offline());
  };

  const local = () => {
    if (applying || state === 'closed') return;
    if (!flushTimer) flushTimer = setTimeout(flush, batch);
  };

  /** What is this person's while the server has not told it back: sent, or changed and not yet sent. */
  const kept = (): Set<string> => {
    const keys = new Set<string>();
    for (const sending of sent) for (const key of sending.keys) keys.add(key);
    if (shadow) for (const key of changeKeys(diffWorkspaces(shadow, host.workspace()))) keys.add(key);
    return keys;
  };

  const sendPresence = () => {
    presenceTimer = undefined;
    if (!me || state !== 'on' || !host.presence) return;
    const data: PresencePost = { client: me.client, key: me.key, sel: host.presence(), name };
    post('presence', data).catch(() => {});
  };
  const presenceChanged = () => {
    if (!presenceTimer) presenceTimer = setTimeout(sendPresence, 120);
  };

  const receive = (event: ServerEvent) => {
    switch (event.event) {
      case 'hello': {
        const hello = event.data;
        // Back after being away: what was sent and not told of, and what was changed meanwhile, made again on the room's workspace.
        const mine = shadow ? [...sent.flatMap((sending) => sending.changes), ...diffWorkspaces(shadow, host.workspace())] : [];
        me = hello;
        name = hello.as;
        sent = [];
        peers = hello.peers;
        state = 'on';
        retry = 500;
        shadow = hello.workspace;
        applying = true;
        try {
          host.load(hello.workspace);
          if (mine.length) host.applyRemote(mine, new Set());
        } finally {
          applying = false;
        }
        showPeers();
        changed();
        if (mine.length) flush();
        presenceChanged();
        return;
      }
      case 'op': {
        const entry = event.data;
        if (entry.by === me?.client) {
          sent = sent.filter((sending) => sending.seq !== entry.seq);
          changed();
          return;
        }
        if (!shadow) return;
        const keep = kept();
        applying = true;
        try {
          host.applyRemote(entry.changes, keep);
        } finally {
          applying = false;
        }
        // The same on the copy: what was changed here and not sent stays what it is counted from.
        shadow = applyWorkspaceChanges(shadow, entry.changes, { keep });
        return;
      }
      case 'presence': {
        const peer = event.data;
        peers = [...peers.filter((one) => one.client !== peer.client), peer];
        showPeers();
        changed();
        return;
      }
      case 'leave':
        peers = peers.filter((one) => one.client !== event.data.client);
        showPeers();
        changed();
        return;
      case 'removed':
        close('removed');
        return;
    }
  };

  const offline = () => {
    if (state === 'closed') return;
    state = 'offline';
    changed();
    abort?.abort();
    setTimeout(connect, retry);
    retry = Math.min(retry * 2, 15000);
  };

  async function connect(): Promise<void> {
    if (state === 'closed') return;
    abort = new AbortController();
    const query = new URLSearchParams({ protocol: String(PROTOCOL), ...(name ? { name } : {}), ...(options.ticket ? { ticket: options.ticket } : {}) });
    try {
      const response = await fetch(`${base}/events?${query}`, { signal: abort.signal, headers: { accept: 'text/event-stream' } });
      if (response.status === 404) return close('not-found');
      if (response.status === 403) return close('denied');
      if (response.status === 426) return close('outdated');
      if (!response.ok || !response.body) return offline();
      for await (const event of events(response.body)) receive(event);
      offline();
    } catch {
      offline();
    }
  }

  const close = (why: ClosedReason) => {
    if (state === 'closed') return;
    state = 'closed';
    reason = why;
    clearTimeout(flushTimer);
    clearTimeout(presenceTimer);
    stopChange();
    stopPresence?.();
    abort?.abort();
    peers = [];
    showPeers();
    changed();
  };

  const stopChange = host.onChange(local);
  const stopPresence = host.onPresence?.(presenceChanged);
  void connect();

  return {
    room,
    get state() {
      return state;
    },
    get reason() {
      return reason;
    },
    get title() {
      return me?.name ?? '';
    },
    get peers() {
      return peers.map(({ client, name: who, color }) => ({ client, name: who, color }));
    },
    get color() {
      return me?.color ?? '';
    },
    get name() {
      return name;
    },
    get readOnly() {
      return me?.readOnly ?? false;
    },
    get pending() {
      return sent.length;
    },
    rename(next: string) {
      name = next;
      sendPresence();
    },
    leave() {
      if (me && state === 'on') {
        flush();
        const data: LeavePost = { client: me.client, key: me.key };
        post('leave', data).catch(() => {});
      }
      close('left');
    },
  };
}

/** What a session needs of the notes of `@rebonotes/editor`. */
export interface NotesLike {
  readonly workspace: Workspace;
  readonly remote: boolean;
  replace(workspace: Workspace): void;
  applyRemote(changes: readonly WorkspaceChange[], keep?: ReadonlySet<string>): void;
  presence(): Presence;
  on(event: 'change' | 'presence' | 'navigate', fn: () => void): () => void;
  setPeers(peers: PeerPresence[]): void;
}

/** The notes as what a session works on. */
export function notesHost(notes: NotesLike): CollabHost {
  return {
    workspace: () => notes.workspace,
    load: (workspace) => notes.replace(workspace),
    applyRemote: (changes, keep) => notes.applyRemote(changes, keep),
    onChange: (fn) => notes.on('change', () => !notes.remote && fn()),
    presence: () => notes.presence(),
    onPresence: (fn) => notes.on('presence', fn),
    setPeers: (peers) => notes.setPeers(peers),
  };
}

/** The notes joined to a room: what they change goes to the others, and theirs comes in. */
export function connectNotes(notes: NotesLike, room: string, options: CollabOptions): Session {
  return joinRoom(room, notesHost(notes), options);
}
