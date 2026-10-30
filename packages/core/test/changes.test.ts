import { describe, expect, it } from 'vitest';
import {
  applyWorkspaceChanges,
  changeKeys,
  createBlock,
  diffWorkspaces,
  insertBlocks,
  movePage,
  newPage,
  plainText,
  removeBlocks,
  removePage,
  renamePage,
  sampleWorkspace,
  updateBlock,
  updatePage,
  type Workspace,
} from '../src';

const texts = (ws: Workspace, id: string) => ws.pages.find((p) => p.id === id)!.blocks.map((b) => plainText(b.text));

describe('changes between workspaces', () => {
  it('make the one into the other', () => {
    const a = sampleWorkspace('en');
    let b = renamePage(a, 'meeting', { title: 'Monday', icon: '📅' });
    b = updatePage(b, 'meeting', (p) => updateBlock(p, p.blocks[0].id, { text: [{ text: 'Changed' }] }));
    b = updatePage(b, 'ideas', (p) => removeBlocks(p, [p.blocks[1].id]));
    b = updatePage(b, 'ideas', (p) => insertBlocks(p, 0, [createBlock('paragraph', 'First')]));
    b = movePage(b, 'ideas', undefined);
    b = newPage(b, 'New', 'welcome').workspace;
    b = removePage(b, 'meeting');
    const changes = diffWorkspaces(a, b);
    expect(applyWorkspaceChanges(a, changes)).toEqual(b);
  });

  it('touch nothing that did not change', () => {
    const a = sampleWorkspace('en');
    const b = updatePage(a, 'meeting', (p) => updateBlock(p, p.blocks[1].id, { text: [{ text: 'x' }] }));
    const changes = diffWorkspaces(a, b);
    expect(changes).toEqual([{ op: 'block', page: 'meeting', block: b.pages[1].blocks[1] }]);
    const c = applyWorkspaceChanges(a, changes);
    expect(c.pages[0]).toBe(a.pages[0]);
    expect(c.pages[1].blocks[0]).toBe(a.pages[1].blocks[0]);
  });

  it('merge the changes of two people to different blocks', () => {
    const base = sampleWorkspace('en');
    const [x, y] = base.pages[1].blocks;
    const mine = updatePage(base, 'meeting', (p) => updateBlock(p, x.id, { text: [{ text: 'mine' }] }));
    const theirs = updatePage(base, 'meeting', (p) => insertBlocks(updateBlock(p, y.id, { text: [{ text: 'theirs' }] }), 0, [createBlock('paragraph', 'new')]));
    const merged = applyWorkspaceChanges(mine, diffWorkspaces(base, theirs));
    expect(texts(merged, 'meeting').slice(0, 3)).toEqual(['new', 'mine', 'theirs']);
  });

  it('keep what this person changed and was not told back', () => {
    const base = sampleWorkspace('en');
    const block = base.pages[1].blocks[0];
    const mine = updatePage(base, 'meeting', (p) => updateBlock(p, block.id, { text: [{ text: 'mine' }] }));
    const theirs = updatePage(base, 'meeting', (p) => updateBlock(p, block.id, { text: [{ text: 'theirs' }] }));
    const keep = changeKeys(diffWorkspaces(base, mine));
    expect(texts(applyWorkspaceChanges(mine, diffWorkspaces(base, theirs), { keep }), 'meeting')[0]).toBe('mine');
    expect(texts(applyWorkspaceChanges(mine, diffWorkspaces(base, theirs)), 'meeting')[0]).toBe('theirs');
  });

  it('undo one change on a workspace changed since by someone else', () => {
    const base = sampleWorkspace('en');
    const [x, y] = base.pages[1].blocks;
    const step = updatePage(base, 'meeting', (p) => updateBlock(p, x.id, { text: [{ text: 'mine' }] }));
    const later = updatePage(step, 'meeting', (p) => updateBlock(p, y.id, { text: [{ text: 'theirs' }] }));
    const undone = applyWorkspaceChanges(later, diffWorkspaces(step, base));
    expect(texts(undone, 'meeting').slice(0, 2)).toEqual([plainText(x.text), 'theirs']);
  });

  it('keep a block made here after the block it followed when the order comes from elsewhere', () => {
    const base = sampleWorkspace('en');
    const page = base.pages[2];
    const fresh = createBlock('paragraph', 'here');
    const mine = updatePage(base, 'ideas', (p) => insertBlocks(p, 1, [fresh]));
    const theirs = updatePage(base, 'ideas', (p) => ({ ...p, blocks: [...p.blocks].reverse() }));
    const merged = applyWorkspaceChanges(mine, diffWorkspaces(base, theirs));
    const ids = merged.pages[2].blocks.map((b) => b.id);
    expect(ids).toEqual([page.blocks[2].id, page.blocks[1].id, page.blocks[0].id, fresh.id]);
  });
});
