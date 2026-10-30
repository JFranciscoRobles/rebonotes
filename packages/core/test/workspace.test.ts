import { describe, expect, it } from 'vitest';
import { withoutIds } from './helpers';
import {
  addPage,
  backlinksOf,
  childrenOf,
  createBlock,
  createPage,
  deleteText,
  duplicateBlock,
  indentBlock,
  insertText,
  joinBackward,
  listNumber,
  movePage,
  moveBlocks,
  newPage,
  type Page,
  pathTo,
  plainText,
  removePage,
  sampleWorkspace,
  searchPages,
  splitBlock,
  splitSpans,
  toggleMark,
  visibleBlocks,
  workspaceFromFiles,
  workspaceFromZip,
  workspaceToFiles,
  workspaceToZip,
} from '../src';

const pageOf = (...blocks: ReturnType<typeof createBlock>[]): Page => createPage('Test', { blocks });
const texts = (page: Page) => page.blocks.map((b) => plainText(b.text));

describe('spans', () => {
  it('puts text in, in the style around it', () => {
    const spans = insertText([{ text: 'ab', marks: ['bold'] }, { text: 'cd' }], 2, 'X');
    expect(spans).toEqual([{ text: 'abX', marks: ['bold'] }, { text: 'cd' }]);
  });

  it('takes text out, cuts and marks', () => {
    expect(deleteText([{ text: 'hello' }, { text: ' world', marks: ['italic'] }], 3, 7)).toEqual([{ text: 'hel' }, { text: 'orld', marks: ['italic'] }]);
    expect(splitSpans([{ text: 'abcd' }], 1)).toEqual([[{ text: 'a' }], [{ text: 'bcd' }]]);
    const bold = toggleMark([{ text: 'abcd' }], 1, 3, 'bold');
    expect(bold).toEqual([{ text: 'a' }, { text: 'bc', marks: ['bold'] }, { text: 'd' }]);
    expect(toggleMark(bold, 1, 3, 'bold')).toEqual([{ text: 'abcd' }]);
  });
});

describe('blocks of a page', () => {
  it('cuts a block in two, and an item stays an item', () => {
    const item = createBlock('bulleted', 'one two');
    const { page, focus } = splitBlock(pageOf(item), item.id, 3);
    expect(texts(page)).toEqual(['one', ' two']);
    expect(page.blocks[1]).toMatchObject({ id: focus, type: 'bulleted' });
  });

  it('ends a list on Enter in an empty item', () => {
    const item = createBlock('bulleted', '');
    expect(splitBlock(pageOf(item), item.id, 0).page.blocks[0].type).toBe('paragraph');
    const inner = createBlock('bulleted', '', { indent: 1 });
    expect(splitBlock(pageOf(createBlock('bulleted', 'a'), inner), inner.id, 0).page.blocks[1].indent).toBeUndefined();
  });

  it('puts what follows an open toggle under it', () => {
    const toggle = createBlock('toggle', 'Fold');
    const { page } = splitBlock(pageOf(toggle), toggle.id, 4);
    expect(page.blocks[1]).toMatchObject({ type: 'paragraph', indent: 1 });
  });

  it('joins a block to the one before it on Backspace at its start', () => {
    const a = createBlock('paragraph', 'ab');
    const b = createBlock('paragraph', [{ text: 'cd', marks: ['bold'] }]);
    const result = joinBackward(pageOf(a, b), b.id)!;
    expect(result).toMatchObject({ focus: a.id, offset: 2 });
    expect(result.page.blocks).toHaveLength(1);
    expect(result.page.blocks[0].text).toEqual([{ text: 'ab' }, { text: 'cd', marks: ['bold'] }]);
  });

  it('makes a heading a paragraph before joining it', () => {
    const a = createBlock('paragraph', 'a');
    const h = createBlock('heading2', 'b');
    expect(joinBackward(pageOf(a, h), h.id)!.page.blocks[1].type).toBe('paragraph');
  });

  it('sets a block in only under one that can have blocks under it, with what is under it', () => {
    const a = createBlock('paragraph', 'a');
    const b = createBlock('bulleted', 'b');
    const c = createBlock('bulleted', 'c');
    const d = createBlock('bulleted', 'd', { indent: 1 });
    let page = pageOf(a, b, c, d);
    expect(indentBlock(page, b.id, 1)).toBe(page);
    page = indentBlock(page, c.id, 1);
    expect(page.blocks.map((x) => x.indent ?? 0)).toEqual([0, 0, 1, 2]);
    page = indentBlock(page, c.id, -1);
    expect(page.blocks.map((x) => x.indent ?? 0)).toEqual([0, 0, 0, 1]);
  });

  it('moves a block with what is under it', () => {
    const a = createBlock('bulleted', 'a');
    const a1 = createBlock('bulleted', 'a1', { indent: 1 });
    const b = createBlock('paragraph', 'b');
    const page = moveBlocks(pageOf(a, a1, b), [a.id], undefined);
    expect(texts(page)).toEqual(['b', 'a', 'a1']);
    expect(moveBlocks(pageOf(a, a1, b), [a.id], a1.id)).toMatchObject({ blocks: [a, a1, b] });
  });

  it('hides what is under a closed toggle, and numbers lists', () => {
    const t = createBlock('toggle', 't', { folded: true });
    const blocks = [
      t,
      createBlock('paragraph', 'in', { indent: 1 }),
      createBlock('numbered', 'x'),
      createBlock('numbered', 'y'),
      createBlock('numbered', 'z', { indent: 1 }),
      createBlock('numbered', 'w'),
    ];
    expect(visibleBlocks(blocks).map((b) => plainText(b.text))).toEqual(['t', 'x', 'y', 'z', 'w']);
    expect([2, 3, 4, 5].map((i) => listNumber(blocks, i))).toEqual([1, 2, 1, 3]);
  });

  it('duplicates a block with new ids', () => {
    const a = createBlock('toggle', 'a');
    const a1 = createBlock('paragraph', 'a1', { indent: 1 });
    const { page, focus } = duplicateBlock(pageOf(a, a1), a.id);
    expect(texts(page)).toEqual(['a', 'a1', 'a', 'a1']);
    expect(focus).not.toBe(a.id);
    expect(new Set(page.blocks.map((b) => b.id)).size).toBe(4);
  });
});

describe('the workspace', () => {
  it('keeps pages as a tree', () => {
    let ws = sampleWorkspace('en');
    const made = newPage(ws, 'Deep', 'meeting');
    ws = made.workspace;
    expect(pathTo(ws, made.page.id).map((p) => p.id)).toEqual(['welcome', 'meeting', made.page.id]);
    expect(childrenOf(ws, 'welcome').map((p) => p.id)).toEqual(['meeting', 'ideas', 'projects']);
    // Not under itself.
    expect(movePage(ws, 'welcome', made.page.id)).toBe(ws);
    ws = movePage(ws, 'ideas', undefined, 'welcome');
    expect(childrenOf(ws, undefined).map((p) => p.id)).toEqual(['ideas', 'welcome']);
    ws = removePage(ws, 'meeting');
    expect(ws.pages.map((p) => p.id)).toEqual(['ideas', 'welcome', 'projects']);
  });

  it('puts a page after another and every page under it', () => {
    let ws = sampleWorkspace('en');
    ws = addPage(ws, createPage('After', { id: 'after' }), 'welcome');
    expect(ws.pages.map((p) => p.id)).toEqual(['welcome', 'meeting', 'ideas', 'projects', 'after']);
  });

  it('finds the pages that link to one', () => {
    expect(backlinksOf(sampleWorkspace('en'), 'meeting').map((p) => p.id)).toEqual(['welcome']);
  });

  it('searches titles before text, without minding accents or case', () => {
    const ws = sampleWorkspace('es');
    const results = searchPages(ws, 'REUNION');
    expect(results[0].page.id).toBe('meeting');
    expect(results[0].block).toBeUndefined();
    const inText = searchPages(ws, 'decisiones');
    expect(inText[0]).toMatchObject({ page: { id: 'meeting' } });
    expect(inText[0].snippet[1].toLowerCase()).toBe('decisiones');
    expect(searchPages(ws, 'nothing-like-this')).toEqual([]);
  });

  it('goes to files in folders and back, the links as relative paths', () => {
    const ws = sampleWorkspace('en');
    const files = workspaceToFiles(ws);
    expect(Object.keys(files).sort()).toEqual(['Welcome to ReboNotes.md', 'Welcome to ReboNotes/Ideas.md', 'Welcome to ReboNotes/Meeting notes.md', 'Welcome to ReboNotes/Projects.md']);
    expect(files['Welcome to ReboNotes.md']).toContain('[Meeting notes](./Welcome%20to%20ReboNotes/Meeting%20notes.md)');
    const again = workspaceFromFiles(files);
    expect(withoutIds(again)).toEqual(withoutIds(ws));
    expect(withoutIds(workspaceFromZip(workspaceToZip(ws)))).toEqual(withoutIds(ws));
  });

  it('reads files from elsewhere: no ids, a folder without its page', () => {
    const ws = workspaceFromFiles({ 'Notes/Todo.md': '- [ ] milk\n\nSee [the index](../Index.md)', 'Index.md': '# Index\n\nStart here.' });
    const index = ws.pages.find((p) => p.title === 'Index')!;
    const todo = ws.pages.find((p) => p.title === 'Todo')!;
    expect(todo.parent).toBeUndefined();
    expect(todo.blocks[1].text[1]).toMatchObject({ page: index.id });
  });
});
