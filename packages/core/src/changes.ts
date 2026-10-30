// What changed from one workspace to another, as changes that make the one
// into the other: what a page is (its title, its icon, where it sits), the
// order of the pages, a block made or changed, a block taken out, the order
// of the blocks of a page. They are what goes between people working on the
// same workspace, and what undo takes back: made on a workspace that others
// have changed meanwhile, they touch only what they name, and the last one
// to change a block is the one whose block stays.

import type { Block, Page, Workspace } from './model';

/** What a page is, without its blocks. */
export type PageInfo = Omit<Page, 'blocks'>;

export type WorkspaceChange =
  | { op: 'page'; page: PageInfo }
  | { op: 'removePage'; id: string }
  | { op: 'pages'; order: string[] }
  | { op: 'block'; page: string; block: Block }
  | { op: 'removeBlock'; page: string; id: string }
  | { op: 'blocks'; page: string; order: string[] }
  | { op: 'workspace'; workspace: Workspace };

const infoOf = ({ blocks: _blocks, ...info }: Page): PageInfo => info;

const sameInfo = (a: Page, b: Page): boolean => a.title === b.title && a.icon === b.icon && a.parent === b.parent && a.created === b.created;

const same = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

const sameOrder = (a: readonly { id: string }[], b: readonly { id: string }[]): boolean => a.length === b.length && a.every((x, i) => x.id === b[i].id);

/** The changes that make `before` into `after`. */
export function diffWorkspaces(before: Workspace, after: Workspace): WorkspaceChange[] {
  if (before === after) return [];
  const changes: WorkspaceChange[] = [];
  const old = new Map(before.pages.map((p) => [p.id, p]));
  const now = new Set(after.pages.map((p) => p.id));
  for (const page of after.pages) {
    const was = old.get(page.id);
    if (!was) {
      changes.push({ op: 'page', page: infoOf(page) });
      for (const block of page.blocks) changes.push({ op: 'block', page: page.id, block });
      changes.push({ op: 'blocks', page: page.id, order: page.blocks.map((b) => b.id) });
      continue;
    }
    if (was === page) continue;
    if (!sameInfo(was, page)) changes.push({ op: 'page', page: infoOf(page) });
    if (was.blocks === page.blocks) continue;
    const blocks = new Map(was.blocks.map((b) => [b.id, b]));
    const kept = new Set(page.blocks.map((b) => b.id));
    for (const block of page.blocks) {
      const prior = blocks.get(block.id);
      if (!prior || (prior !== block && !same(prior, block))) changes.push({ op: 'block', page: page.id, block });
    }
    for (const block of was.blocks) if (!kept.has(block.id)) changes.push({ op: 'removeBlock', page: page.id, id: block.id });
    if (
      !sameOrder(
        was.blocks.filter((b) => kept.has(b.id)),
        page.blocks.filter((b) => blocks.has(b.id)),
      ) ||
      page.blocks.some((b) => !blocks.has(b.id))
    ) {
      changes.push({ op: 'blocks', page: page.id, order: page.blocks.map((b) => b.id) });
    }
  }
  for (const page of before.pages) if (!now.has(page.id)) changes.push({ op: 'removePage', id: page.id });
  const stayed = before.pages.filter((p) => now.has(p.id));
  const stays = after.pages.filter((p) => old.has(p.id));
  if (!sameOrder(stayed, stays) || after.pages.some((p) => !old.has(p.id))) changes.push({ op: 'pages', order: after.pages.map((p) => p.id) });
  return changes;
}

/** The key of what a change touches, to keep it from the changes of others: `page:<id>` or `<page>:<block>`. */
export function changeKey(change: WorkspaceChange): string | undefined {
  switch (change.op) {
    case 'page':
      return `page:${change.page.id}`;
    case 'block':
      return `${change.page}:${change.block.id}`;
    case 'removeBlock':
      return `${change.page}:${change.id}`;
    default:
      return undefined;
  }
}

/** The keys of what some changes touch. */
export function changeKeys(changes: readonly WorkspaceChange[]): Set<string> {
  const keys = new Set<string>();
  for (const change of changes) {
    const key = changeKey(change);
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * Items put in the order given; those it does not name (made here meanwhile)
 * stay after the item they followed.
 */
function ordered<T extends { id: string }>(items: readonly T[], order: readonly string[]): T[] {
  const byId = new Map(items.map((x) => [x.id, x]));
  const out: T[] = [];
  const named = new Set(order);
  for (const id of order) {
    const item = byId.get(id);
    if (item) out.push(item);
  }
  // The ones not named, each after the one before it in the old order.
  items.forEach((item, index) => {
    if (named.has(item.id)) return;
    let at = 0;
    for (let i = index - 1; i >= 0; i--) {
      const found = out.indexOf(items[i]);
      if (found >= 0) {
        at = found + 1;
        break;
      }
    }
    out.splice(at, 0, item);
  });
  return out;
}

export interface ApplyOptions {
  /** Keys (`changeKey`) of what is left as it is: what this person changed and has not yet been told back. */
  keep?: ReadonlySet<string>;
}

/** Changes made on a workspace: a new workspace, the pages and blocks they do not touch the same objects. */
export function applyWorkspaceChanges(ws: Workspace, changes: readonly WorkspaceChange[], options: ApplyOptions = {}): Workspace {
  const keep = options.keep;
  let pages = ws.pages.slice();
  const index = () => new Map(pages.map((p, i) => [p.id, i]));
  let at = index();
  const edit = (id: string, fn: (page: Page) => Page) => {
    const i = at.get(id);
    if (i === undefined) return;
    pages[i] = fn(pages[i]);
  };
  for (const change of changes) {
    const key = changeKey(change);
    if (key && keep?.has(key)) continue;
    switch (change.op) {
      case 'workspace':
        pages = change.workspace.pages.slice();
        at = index();
        break;
      case 'page': {
        const i = at.get(change.page.id);
        if (i === undefined) {
          pages.push({ ...change.page, blocks: [] });
          at.set(change.page.id, pages.length - 1);
        } else {
          const { blocks } = pages[i];
          const next: Page = { ...change.page, blocks };
          pages[i] = next;
        }
        break;
      }
      case 'removePage': {
        if (!at.has(change.id)) break;
        pages = pages.filter((p) => p.id !== change.id);
        at = index();
        break;
      }
      case 'pages':
        pages = ordered(pages, change.order);
        at = index();
        break;
      case 'block':
        edit(change.page, (page) => {
          const i = page.blocks.findIndex((b) => b.id === change.block.id);
          const blocks = page.blocks.slice();
          if (i < 0) blocks.push(change.block);
          else blocks[i] = change.block;
          return { ...page, blocks };
        });
        break;
      case 'removeBlock':
        edit(change.page, (page) => (page.blocks.some((b) => b.id === change.id) ? { ...page, blocks: page.blocks.filter((b) => b.id !== change.id) } : page));
        break;
      case 'blocks':
        edit(change.page, (page) => {
          const blocks = ordered(page.blocks, change.order);
          return sameOrder(blocks, page.blocks) ? page : { ...page, blocks };
        });
        break;
    }
  }
  return { ...ws, pages };
}

/** Changes as JSON, and back. */
export const encodeChanges = (value: unknown): string => JSON.stringify(value);
export const decodeChanges = <T = unknown>(text: string): T => JSON.parse(text) as T;
