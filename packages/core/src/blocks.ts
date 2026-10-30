// What is done to the blocks of a page: change one, put some in, take some
// out, move them with what is under them, cut one in two at an offset, join
// one to the one before it, set them further in or out. Each gives a new
// page; the blocks it did not touch are the same objects as before.

import { type Block, type BlockType, createBlock, LIST_TYPES, type Page, PARENT_TYPES, type Span, TEXT_TYPES } from './model';
import { joinSpans, splitSpans, spansLength } from './spans';

const touched = (page: Page, blocks: Block[]): Page => ({ ...page, blocks: blocks.length ? blocks : [createBlock()], updated: Date.now() });

/** The place of a block in its page; -1 when it is not there. */
export const blockIndex = (page: Page, id: string): number => page.blocks.findIndex((b) => b.id === id);

/** Where what is under a block ends: the index after the last block set further in than it. */
export function subtreeEnd(blocks: readonly Block[], index: number): number {
  const indent = blocks[index]?.indent ?? 0;
  let end = index + 1;
  while (end < blocks.length && (blocks[end].indent ?? 0) > indent) end++;
  return end;
}

/** The blocks shown: none of what is under a closed toggle. */
export function visibleBlocks(blocks: readonly Block[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    out.push(blocks[i]);
    if (blocks[i].type === 'toggle' && blocks[i].folded) i = subtreeEnd(blocks, i) - 1;
  }
  return out;
}

/** The number an item of a numbered list shows: one more than the item before it at its level. */
export function listNumber(blocks: readonly Block[], index: number): number {
  const indent = blocks[index].indent ?? 0;
  let n = 1;
  for (let i = index - 1; i >= 0; i--) {
    const b = blocks[i];
    const level = b.indent ?? 0;
    if (level > indent) continue;
    if (level < indent || b.type !== 'numbered') break;
    n++;
  }
  return n;
}

/** A block changed. */
export function updateBlock(page: Page, id: string, patch: Partial<Block>): Page {
  const index = blockIndex(page, id);
  if (index < 0) return page;
  const blocks = page.blocks.slice();
  const next = { ...blocks[index], ...patch };
  for (const key of Object.keys(next) as (keyof Block)[]) if (next[key] === undefined) delete next[key];
  blocks[index] = next;
  return touched(page, blocks);
}

/** A block made another type: its text stays, and what only the old type had goes. */
export function setBlockType(page: Page, id: string, type: BlockType, extra: Partial<Block> = {}): Page {
  const block = page.blocks[blockIndex(page, id)];
  if (!block) return page;
  const patch: Partial<Block> = { type, checked: undefined, language: undefined, icon: undefined, folded: undefined, ...extra };
  if (type === 'callout' && !extra.icon) patch.icon = '💡';
  if (type === 'code') patch.text = [{ text: block.text.map((s) => s.text).join('') }].filter((s) => s.text);
  if (!TEXT_TYPES.has(type) && type !== 'image' && type !== 'page') patch.text = [];
  return updateBlock(page, id, patch);
}

/** Blocks put in at an index. */
export function insertBlocks(page: Page, index: number, blocks: Block[]): Page {
  const all = page.blocks.slice();
  all.splice(Math.max(0, Math.min(index, all.length)), 0, ...blocks);
  return touched(page, all);
}

/** Blocks taken out; a page is never left without one. */
export function removeBlocks(page: Page, ids: readonly string[]): Page {
  const gone = new Set(ids);
  return touched(
    page,
    page.blocks.filter((b) => !gone.has(b.id)),
  );
}

/**
 * Blocks moved, each with what is under it, to before the block `before` (to
 * the end with none), and set in as far as `indent` says for the first.
 */
export function moveBlocks(page: Page, ids: readonly string[], before: string | undefined, indent?: number): Page {
  const picked = new Set<number>();
  for (const id of ids) {
    const index = blockIndex(page, id);
    if (index < 0) continue;
    for (let i = index; i < subtreeEnd(page.blocks, index); i++) picked.add(i);
  }
  if (!picked.size) return page;
  const moving = page.blocks.filter((_, i) => picked.has(i));
  if (before && moving.some((b) => b.id === before)) return page;
  const rest = page.blocks.filter((_, i) => !picked.has(i));
  let at = before ? rest.findIndex((b) => b.id === before) : rest.length;
  if (at < 0) at = rest.length;
  let moved = moving;
  if (indent !== undefined) {
    const shift = indent - (moving[0].indent ?? 0);
    moved = moving.map((b) => withIndent(b, (b.indent ?? 0) + shift));
  }
  rest.splice(at, 0, ...moved);
  return touched(page, rest);
}

const withIndent = (block: Block, indent: number): Block => {
  const { indent: _old, ...rest } = block;
  return indent > 0 ? { ...rest, indent } : rest;
};

/** The furthest in a block can be set at an index: one more than the block before it, if that one has blocks under it. */
export function maxIndent(blocks: readonly Block[], index: number): number {
  const before = blocks[index - 1];
  if (!before) return 0;
  return (before.indent ?? 0) + (PARENT_TYPES.has(before.type) ? 1 : 0);
}

/** A block, with what is under it, set one further in (as far as it can go) or one further out. */
export function indentBlock(page: Page, id: string, by: 1 | -1): Page {
  const index = blockIndex(page, id);
  if (index < 0) return page;
  const block = page.blocks[index];
  const indent = block.indent ?? 0;
  const next = by > 0 ? Math.min(indent + 1, maxIndent(page.blocks, index)) : Math.max(0, indent - 1);
  if (next === indent) return page;
  const end = subtreeEnd(page.blocks, index);
  const blocks = page.blocks.slice();
  for (let i = index; i < end; i++) blocks[i] = withIndent(blocks[i], (blocks[i].indent ?? 0) + next - indent);
  return touched(page, blocks);
}

/**
 * A block cut in two at an offset: the text after it goes to a new block
 * under it, of the same type for an item of a list, a paragraph otherwise.
 * Enter on an empty item ends the list instead: the item becomes a paragraph,
 * or goes one further out. Gives the page and the block the caret goes to.
 */
export function splitBlock(page: Page, id: string, offset: number): { page: Page; focus: string; offset: number } {
  const index = blockIndex(page, id);
  const block = page.blocks[index];
  if (!block) return { page, focus: id, offset };
  if (LIST_TYPES.has(block.type) || block.type === 'toggle' || block.type === 'quote' || block.type === 'callout') {
    if (spansLength(block.text) === 0 && block.type !== 'callout') {
      const out = (block.indent ?? 0) > 0 ? indentBlock(page, id, -1) : setBlockType(page, id, 'paragraph');
      return { page: out, focus: id, offset: 0 };
    }
  }
  const [before, after] = splitSpans(block.text, offset);
  // At the start of a block with text, an empty one goes before it and the block keeps its place.
  if (offset === 0 && after.length && block.type !== 'code') {
    const empty = createBlock(LIST_TYPES.has(block.type) ? block.type : 'paragraph', [], block.indent ? { indent: block.indent } : {});
    return { page: insertBlocks(page, index, [empty]), focus: id, offset: 0 };
  }
  const type: BlockType = LIST_TYPES.has(block.type) ? block.type : 'paragraph';
  // What is under an open toggle goes on under it.
  const under = block.type === 'toggle' && !block.folded;
  const indent = (block.indent ?? 0) + (under ? 1 : 0);
  const fresh = createBlock(type, after, indent ? { indent } : {});
  let next = updateBlock(page, id, { text: before });
  const at = block.type === 'toggle' && block.folded ? subtreeEnd(page.blocks, index) : index + 1;
  next = insertBlocks(next, at, [fresh]);
  return { page: next, focus: fresh.id, offset: 0 };
}

/**
 * Backspace at the start of a block: a block of another type becomes a
 * paragraph first; a paragraph set in goes out; then it joins the text block
 * before it. Gives the page and where the caret goes, or nothing to do.
 */
export function joinBackward(page: Page, id: string): { page: Page; focus: string; offset: number } | undefined {
  const index = blockIndex(page, id);
  const block = page.blocks[index];
  if (!block) return undefined;
  if (block.type !== 'paragraph' && TEXT_TYPES.has(block.type)) return { page: setBlockType(page, id, 'paragraph'), focus: id, offset: 0 };
  if ((block.indent ?? 0) > 0) return { page: indentBlock(page, id, -1), focus: id, offset: 0 };
  // The text block before it, among those shown.
  const shown = visibleBlocks(page.blocks);
  const at = shown.findIndex((b) => b.id === id);
  const previous = shown[at - 1];
  if (!previous) return undefined;
  if (!TEXT_TYPES.has(previous.type)) {
    // A line, an image or a page before it: that goes, when this block is empty, this one goes.
    if (spansLength(block.text) === 0) return { page: removeBlocks(page, [id]), focus: previous.id, offset: -1 };
    return { page: removeBlocks(page, [previous.id]), focus: id, offset: 0 };
  }
  const offset = spansLength(previous.text);
  const text: Span[] =
    previous.type === 'code' ? [{ text: previous.text.map((s) => s.text).join('') + block.text.map((s) => s.text).join('') }].filter((s) => s.text) : joinSpans(previous.text, block.text);
  let next = updateBlock(page, previous.id, { text });
  // What was under it goes under the block it joined.
  next = removeBlocks(next, [id]);
  return { page: next, focus: previous.id, offset };
}

/** A block and what is under it, copied with new ids, after it. */
export function duplicateBlock(page: Page, id: string): { page: Page; focus: string } {
  const index = blockIndex(page, id);
  if (index < 0) return { page, focus: id };
  const end = subtreeEnd(page.blocks, index);
  const copies = page.blocks.slice(index, end).map((b) => ({ ...b, id: createBlock().id }));
  return { page: insertBlocks(page, end, copies), focus: copies[0].id };
}
