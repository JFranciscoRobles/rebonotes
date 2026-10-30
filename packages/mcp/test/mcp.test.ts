import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNotesServer } from '../src/server';

let dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
});

const folder = () => {
  const dir = mkdtempSync(join(tmpdir(), 'rebonotes-mcp-'));
  dirs.push(dir);
  return dir;
};

async function tools() {
  const server = createNotesServer();
  let id = 0;
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const answer = (await server.handle({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } })) as { result: { content: { text: string }[]; isError?: boolean } };
    return { text: answer.result.content[0].text, error: !!answer.result.isError };
  };
  return { server, call };
}

describe('the MCP server', () => {
  it('says what it is and lists its tools', async () => {
    const server = createNotesServer();
    const init = (await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })) as {
      result: { serverInfo: { name: string }; protocolVersion: string };
    };
    expect(init.result.serverInfo.name).toBe('rebonotes');
    expect(init.result.protocolVersion).toBe('2025-06-18');
    const list = (await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' })) as { result: { tools: { name: string }[] } };
    const names = list.result.tools.map((t) => t.name);
    for (const name of ['open_workspace', 'save_workspace', 'join_room', 'list_pages', 'read_page', 'insert_blocks', 'replace_blocks', 'set_task', 'create_page']) expect(names).toContain(name);
  });

  it('opens a folder, changes its pages and saves them back', async () => {
    const dir = folder();
    writeFileSync(join(dir, 'Plan.md'), '# Plan\n\n## Goals\n\n- [ ] Ship it\n- [ ] Tell people\n\nNotes here.');
    const { call } = await tools();
    expect((await call('open_workspace', { folder: dir })).text).toContain('Plan (id');
    const read = (await call('read_page', { page: 'plan' })).text;
    expect(read).toContain('[1]  ## Goals');
    expect(read).toContain('[2]  - [ ] Ship it');
    expect((await call('set_task', { page: 'Plan', block: 2 })).text).toContain('done');
    await call('replace_blocks', { page: 'Plan', from: 4, markdown: 'Notes **changed**.' });
    await call('insert_blocks', { page: 'Plan', after: 3, markdown: '- [ ] Celebrate' });
    await call('create_page', { title: 'Launch', parent: 'Plan', icon: '🚀', markdown: 'See [the plan](page:x)' });
    expect((await call('read_page', { page: 'Plan / Launch' })).text).toContain('Path: Plan / Launch');
    expect((await call('search_pages', { query: 'celebrate' })).text).toContain('"Plan"');
    const saved = (await call('save_workspace')).text;
    expect(saved).toContain('Saved 2 page(s)');
    const plan = readFileSync(join(dir, 'Plan.md'), 'utf8');
    expect(plan).toContain('- [x] Ship it\n- [ ] Tell people\n- [ ] Celebrate');
    expect(plan).toContain('Notes **changed**.');
    expect(readdirSync(join(dir, 'Plan'))).toEqual(['Launch.md']);
  });

  it('undoes, and says what it cannot do', async () => {
    const dir = folder();
    writeFileSync(join(dir, 'A.md'), '# A\n\none');
    const { call } = await tools();
    await call('open_workspace', { folder: dir });
    await call('write_page', { page: 'A', markdown: 'two' });
    expect((await call('read_page', { page: 'A' })).text).toContain('[1]  two');
    await call('undo');
    expect((await call('read_page', { page: 'A' })).text).toContain('[1]  one');
    const wrong = await call('read_page', { page: 'Nope' });
    expect(wrong.error).toBe(true);
    expect(wrong.text).toContain('There is no page "Nope"');
    expect((await call('set_task', { page: 'A', block: 1 })).error).toBe(true);
  });
});
