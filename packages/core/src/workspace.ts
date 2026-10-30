// The pages of a workspace, as a tree: put one in under another, change one,
// take one out with those under it, move one to another place, the path from
// the top to a page, the pages that link to one, and search through all of
// them. And the workspace as files, a Markdown file for each page in folders
// as the tree has them, so that it can be kept in git or a folder of one's
// own, and as a .zip of those files.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { markdownToPage, pageToMarkdown, readFrontMatter } from './markdown';
import { type Block, createPage, type Page, plainText, type Workspace } from './model';

/** An empty workspace. */
export const createWorkspace = (): Workspace => ({ pages: [] });

/** A page by its id. */
export const pageById = (ws: Workspace, id: string | undefined): Page | undefined => (id ? ws.pages.find((p) => p.id === id) : undefined);

/** The pages under a page (or at the top), in their order. */
export const childrenOf = (ws: Workspace, parent: string | undefined): Page[] => ws.pages.filter((p) => (p.parent ?? undefined) === (parent ?? undefined));

/** A page and every page under it, at any depth. */
export function descendantsOf(ws: Workspace, id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) for (const child of childrenOf(ws, out[i])) out.push(child.id);
  return out;
}

/** The pages from the top down to a page, itself last. */
export function pathTo(ws: Workspace, id: string): Page[] {
  const path: Page[] = [];
  const seen = new Set<string>();
  let page = pageById(ws, id);
  while (page && !seen.has(page.id)) {
    seen.add(page.id);
    path.unshift(page);
    page = pageById(ws, page.parent);
  }
  return path;
}

/** A page put in, under `parent`, after the page `after` among its siblings (last with none). */
export function addPage(ws: Workspace, page: Page, after?: string): Workspace {
  const pages = ws.pages.slice();
  const anchor = after ? pages.findIndex((p) => p.id === after) : -1;
  if (anchor >= 0) {
    // After the anchor and every page under it.
    const under = new Set(descendantsOf(ws, after!));
    let at = anchor + 1;
    while (at < pages.length && under.has(pages[at].id)) at++;
    pages.splice(at, 0, page);
  } else pages.push(page);
  return { ...ws, pages };
}

/** A new page made and put in: under `parent`, with a title. */
export function newPage(ws: Workspace, title = '', parent?: string): { workspace: Workspace; page: Page } {
  const page = createPage(title, parent ? { parent } : {});
  return { workspace: addPage(ws, page), page };
}

/** A page replaced by what `change` makes of it. */
export function updatePage(ws: Workspace, id: string, change: (page: Page) => Page): Workspace {
  let changed = false;
  const pages = ws.pages.map((p) => {
    if (p.id !== id) return p;
    const next = change(p);
    changed = next !== p;
    return next;
  });
  return changed ? { ...ws, pages } : ws;
}

/** A page's title or icon changed. */
export function renamePage(ws: Workspace, id: string, patch: { title?: string; icon?: string | null }): Workspace {
  return updatePage(ws, id, (p) => {
    const next: Page = { ...p, updated: Date.now() };
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.icon === null || patch.icon === '') delete next.icon;
    else if (patch.icon !== undefined) next.icon = patch.icon;
    return next;
  });
}

/** A page taken out, with every page under it. */
export function removePage(ws: Workspace, id: string): Workspace {
  const gone = new Set(descendantsOf(ws, id));
  return { ...ws, pages: ws.pages.filter((p) => !gone.has(p.id)) };
}

/**
 * A page moved under another (to the top with none), before the sibling
 * `before` (last with none). A page cannot go under itself or a page under it.
 */
export function movePage(ws: Workspace, id: string, parent: string | undefined, before?: string): Workspace {
  if (parent && descendantsOf(ws, id).includes(parent)) return ws;
  const page = pageById(ws, id);
  if (!page) return ws;
  const moved: Page = { ...page };
  if (parent) moved.parent = parent;
  else delete moved.parent;
  const pages = ws.pages.filter((p) => p.id !== id);
  const at = before ? pages.findIndex((p) => p.id === before) : -1;
  if (at >= 0) pages.splice(at, 0, moved);
  else pages.push(moved);
  return { ...ws, pages };
}

/** The pages a page links to, in its text or by its page blocks. */
export function linksOf(page: Page): Set<string> {
  const out = new Set<string>();
  for (const block of page.blocks) {
    if (block.page) out.add(block.page);
    for (const span of block.text) if (span.page) out.add(span.page);
  }
  return out;
}

/** The pages that link to a page; not the pages under it by being under it. */
export const backlinksOf = (ws: Workspace, id: string): Page[] => ws.pages.filter((p) => p.id !== id && linksOf(p).has(id));

/** Text to compare in search: lower case, and without the accents. */
const fold = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export interface SearchResult {
  page: Page;
  /** The block where the words were found; none when they are in the title. */
  block?: Block;
  /** Around what was found: the text before it, it, and the text after it. */
  snippet: [string, string, string];
}

/** The pages with every word of a query, the title before the text, the most recent first among equals. */
export function searchPages(ws: Workspace, query: string, limit = 50): SearchResult[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const results: (SearchResult & { score: number })[] = [];
  for (const page of ws.pages) {
    const title = fold(page.title);
    const texts = page.blocks.map((b) => plainText(b.text));
    const all = `${title}\n${texts.map(fold).join('\n')}`;
    if (!words.every((w) => all.includes(w))) continue;
    if (words.every((w) => title.includes(w))) {
      results.push({ page, snippet: snippet(page.title, words[0]), score: title.startsWith(words[0]) ? 3 : 2 });
      continue;
    }
    const index = texts.findIndex((t) => fold(t).includes(words[0]));
    const at = index >= 0 ? index : texts.findIndex((t) => words.some((w) => fold(t).includes(w)));
    results.push({ page, block: page.blocks[at], snippet: snippet(texts[at] ?? '', words.find((w) => fold(texts[at] ?? '').includes(w)) ?? words[0]), score: 1 });
  }
  return results
    .sort((a, b) => b.score - a.score || b.page.updated - a.page.updated)
    .slice(0, limit)
    .map(({ score: _score, ...r }) => r);
}

function snippet(text: string, word: string): [string, string, string] {
  // Folding keeps the length of most text, so the place found is the place in the text.
  const at = fold(text).indexOf(word);
  if (at < 0) return [text.slice(0, 80), '', ''];
  const start = Math.max(0, at - 40);
  return [(start > 0 ? '…' : '') + text.slice(start, at), text.slice(at, at + word.length), text.slice(at + word.length, at + word.length + 80)];
}

// ——— As files ———

/** A name a file can have: without the characters systems refuse, and not too long. */
const fileName = (title: string): string =>
  [...title]
    .map((ch) => (ch < ' ' || '\\/:*?"<>|#^[]'.includes(ch) ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Untitled';

/** The path of a file as seen from another: `../Other/Page.md`. */
function relative(from: string, to: string): string {
  const a = from.split('/').slice(0, -1);
  const b = to.split('/');
  let same = 0;
  while (same < a.length && same < b.length - 1 && a[same] === b[same]) same++;
  return [...a.slice(same).map(() => '..'), ...b.slice(same)].join('/').replace(/^(?!\.\.\/)/, './');
}

/** Where each page's file goes: `Title.md`, and the pages under it in a folder `Title/`. */
export function pagePaths(ws: Workspace): Map<string, string> {
  const paths = new Map<string, string>();
  const place = (parent: string | undefined, folder: string) => {
    const used = new Set<string>();
    for (const page of childrenOf(ws, parent)) {
      let name = fileName(page.title);
      for (let n = 2; used.has(name.toLowerCase()); n++) name = `${fileName(page.title)} ${n}`;
      used.add(name.toLowerCase());
      paths.set(page.id, `${folder}${name}.md`);
      place(page.id, `${folder}${name}/`);
    }
  };
  place(undefined, '');
  // A page whose parent is not there goes at the top.
  for (const page of ws.pages) if (!paths.has(page.id)) paths.set(page.id, `${fileName(page.title)} ${page.id}.md`);
  return paths;
}

/** The workspace as Markdown files by their paths, the links between pages as relative paths. */
export function workspaceToFiles(ws: Workspace): Record<string, string> {
  const paths = pagePaths(ws);
  const files: Record<string, string> = {};
  for (const page of ws.pages) {
    const path = paths.get(page.id)!;
    const siblings = childrenOf(ws, page.parent);
    files[path] = pageToMarkdown(page, {
      pageHref: (id) => (paths.has(id) ? encodeURI(relative(path, paths.get(id)!)) : `page:${id}`),
      frontMatter: { order: siblings.indexOf(page) },
    });
  }
  return files;
}

/** Markdown files by their paths as a workspace: the folders as the tree, the relative links as links between pages. */
export function workspaceFromFiles(files: Record<string, string>): Workspace {
  const entries = Object.entries(files)
    .filter(([path]) => /\.md$/i.test(path))
    .map(([path, text]) => [path.replace(/\\/g, '/').replace(/^\.?\//, ''), text] as const);
  // The id of every file first, for the links between them.
  const idOf = new Map<string, string>();
  for (const [path, text] of entries) idOf.set(path, readFrontMatter(text).meta.id || createPage().id);
  const pages: (Page & { order: number })[] = [];
  for (const [path, text] of entries) {
    const resolve = (href: string): string | undefined => {
      if (/^[a-z]+:/i.test(href) || href.startsWith('#')) return undefined;
      const parts = path.split('/').slice(0, -1);
      let target = href;
      try {
        target = decodeURI(href);
      } catch {
        // As written.
      }
      for (const part of target.split('#')[0].split('/')) {
        if (part === '..') parts.pop();
        else if (part && part !== '.') parts.push(part);
      }
      return idOf.get(parts.join('/'));
    };
    const name = path.split('/').pop()!.replace(/\.md$/i, '');
    const page = markdownToPage(text, { pageOf: resolve, title: name });
    page.id = idOf.get(path)!;
    const folder = path.split('/').slice(0, -1).join('/');
    const parent = folder ? idOf.get(`${folder}.md`) : undefined;
    if (parent) page.parent = parent;
    const order = Number(readFrontMatter(text).meta.order);
    pages.push({ ...page, order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER });
  }
  pages.sort((a, b) => a.order - b.order);
  return { pages: pages.map(({ order: _order, ...p }) => p) };
}

/** The workspace as a .zip of Markdown files. */
export function workspaceToZip(ws: Workspace): Uint8Array {
  const files = workspaceToFiles(ws);
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
}

/** A .zip of Markdown files as a workspace. */
export function workspaceFromZip(bytes: Uint8Array): Workspace {
  const files: Record<string, string> = {};
  for (const [path, data] of Object.entries(unzipSync(bytes))) if (/\.md$/i.test(path) && !path.startsWith('__MACOSX/')) files[path] = strFromU8(data);
  return workspaceFromFiles(files);
}
