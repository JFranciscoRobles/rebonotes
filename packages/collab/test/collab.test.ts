import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBlock, insertBlocks, plainText, renamePage, sampleWorkspace, updateBlock, updatePage, type Workspace, type WorkspaceChange, applyWorkspaceChanges } from '@rebonotes/core';
import { afterEach, describe, expect, it } from 'vitest';
import { type CollabHost, createRoom, joinRoom, type PeerPresence, type Session } from '../src/session';
import { createCollabServer } from '../src/server';
import { folderStorage, memoryStorage } from '../src/storage';

/** Notes as a session sees them: a workspace changed here and told. */
function fakeNotes() {
  const listeners = new Set<() => void>();
  const state = { ws: { pages: [] } as Workspace, peers: [] as PeerPresence[], page: 'meeting' };
  const host: CollabHost = {
    workspace: () => state.ws,
    load: (ws) => {
      state.ws = ws;
    },
    applyRemote: (changes: WorkspaceChange[], keep) => {
      state.ws = applyWorkspaceChanges(state.ws, changes, { keep });
    },
    onChange: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    presence: () => ({ page: state.page }),
    onPresence: () => () => {},
    setPeers: (peers) => {
      state.peers = peers;
    },
  };
  const change = (fn: (ws: Workspace) => Workspace) => {
    state.ws = fn(state.ws);
    for (const l of listeners) l();
  };
  return { state, host, change };
}

const until = async (ok: () => boolean, ms = 3000) => {
  for (let waited = 0; waited < ms && !ok(); waited += 20) await new Promise((r) => setTimeout(r, 20));
  if (!ok()) throw new Error('timed out');
};

const texts = (ws: Workspace, page: string) => ws.pages.find((p) => p.id === page)?.blocks.map((b) => plainText(b.text)) ?? [];

let close: (() => void)[] = [];
afterEach(() => {
  for (const fn of close) fn();
  close = [];
});

describe('working on a workspace together', () => {
  it('shares what each person changes, and where they are', async () => {
    const server = createCollabServer({ storage: memoryStorage(), port: 0, onEvent: () => {} });
    await server.ready;
    close.push(() => server.close());
    const url = `http://127.0.0.1:${server.port}`;
    const room = await createRoom(url, sampleWorkspace('en'), 'Team');
    const ana = fakeNotes();
    const ben = fakeNotes();
    const sessions: Session[] = [joinRoom(room, ana.host, { url, name: 'Ana', batch: 0 }), joinRoom(room, ben.host, { url, name: 'Ben', batch: 0 })];
    close.push(() => sessions.forEach((s) => s.leave()));
    await until(() => sessions.every((s) => s.state === 'on') && ana.state.ws.pages.length === 4 && ben.state.ws.pages.length === 4);
    expect(sessions[0].title).toBe('Team');

    // Ana changes one block and Ben another, at once.
    const [first, second] = ana.state.ws.pages[1].blocks;
    ana.change((ws) => updatePage(ws, 'meeting', (p) => updateBlock(p, first.id, { text: [{ text: 'Ana was here' }] })));
    ben.change((ws) => updatePage(ws, 'meeting', (p) => updateBlock(p, second.id, { text: [{ text: 'Ben too' }] })));
    ben.change((ws) => renamePage(ws, 'ideas', { title: 'Plans' }));
    ana.change((ws) => updatePage(ws, 'meeting', (p) => insertBlocks(p, 0, [createBlock('paragraph', 'At the top')])));
    await until(() => texts(ben.state.ws, 'meeting')[0] === 'At the top' && ana.state.ws.pages[2].title === 'Plans' && texts(ana.state.ws, 'meeting')[2] === 'Ben too');
    expect(texts(ana.state.ws, 'meeting').slice(0, 3)).toEqual(['At the top', 'Ana was here', 'Ben too']);
    expect(texts(ben.state.ws, 'meeting')).toEqual(texts(ana.state.ws, 'meeting'));
    await until(() => ana.state.peers.some((p) => p.name === 'Ben' && p.page === 'meeting'));
    expect(server.rooms()[0].people.sort()).toEqual(['Ana', 'Ben']);
  });

  it('keeps each room as Markdown files in a folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rebonotes-'));
    close.push(() => rmSync(dir, { recursive: true, force: true }));
    const server = createCollabServer({ storage: folderStorage(dir), port: 0, onEvent: () => {} });
    await server.ready;
    close.push(() => server.close());
    const url = `http://127.0.0.1:${server.port}`;
    const room = await createRoom(url, sampleWorkspace('en'), 'Kept');
    const ana = fakeNotes();
    const session = joinRoom(room, ana.host, { url, name: 'Ana', batch: 0 });
    close.push(() => session.leave());
    await until(() => session.state === 'on' && ana.state.ws.pages.length === 4);
    ana.change((ws) => renamePage(ws, 'meeting', { title: 'Monday' }));
    // Sent on the next turn, then told back.
    await new Promise((r) => setTimeout(r, 30));
    await until(() => session.pending === 0);
    await server.flush();
    expect(readFileSync(join(dir, room, 'Welcome to ReboNotes', 'Monday.md'), 'utf8')).toContain('# Monday');
    expect(readFileSync(join(dir, room, '.rebonotes'), 'utf8')).toBe('Kept');
  });
});
