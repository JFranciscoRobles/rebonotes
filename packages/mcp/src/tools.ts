// What an assistant can do to a workspace of notes, as tools: each has a
// name, a description, the shape of its arguments, and a function that reads
// the workspace or makes a new one, and says what it did. They use nothing of
// Node or the browser: the server runs them on folders of Markdown and on
// rooms, and a page could run them on the notes open in it.
//
// Pages go by their id, their title, or their path of titles ("Projects /
// Launch"); blocks by their number in the page, from 1, as read_page shows
// them. What is written is Markdown.

import {
  backlinksOf,
  blocksToMarkdown,
  childrenOf,
  createBlock,
  createPage,
  descendantsOf,
  insertBlocks,
  markdownToBlocks,
  movePage,
  newPage,
  type Page,
  pageById,
  pathTo,
  removeBlocks,
  removePage,
  renamePage,
  searchPages,
  subtreeEnd,
  updateBlock,
  updatePage,
  type Workspace,
} from '@rebonotes/core';

export type Args = Record<string, unknown>;

export interface Tool {
  name: string;
  title: string;
  description: string;
  properties: Record<string, unknown>;
  required?: string[];
  /** Whether it changes the workspace. */
  writes: boolean;
  run(ws: Workspace, args: Args): { text: string; workspace?: Workspace };
}

/** What the assistant asked wrong: said to it as the result, for it to put right. */
export class ToolError extends Error {}

export const fail = (message: string): never => {
  throw new ToolError(message);
};

const PAGE = { type: 'string', description: 'The page: its id, its title, or its path of titles as "Projects / Launch".' };
const MARKDOWN = (what: string) => ({
  type: 'string',
  description: `${what}, as Markdown: "# ", "## ", "### " headings, "- " and "1. " lists (two spaces further in for each level), "- [ ] " tasks, "> " quotes, "> [!NOTE]" callouts, \`\`\` code, "---" dividers, **bold**, *italic*, \`code\`, [links](https://…), and [a page](page:<id>) for a link to a page.`,
});

const titleOf = (page: Page) => page.title || 'Untitled';
const pathName = (ws: Workspace, page: Page) => pathTo(ws, page.id).map(titleOf).join(' / ');

/** The page an argument names. */
export function pageOf(ws: Workspace, given: unknown, key = 'page'): Page {
  if (typeof given !== 'string' || !given.trim()) return fail(`"${key}" must be a page: its id, its title or its path.`);
  const text = given.trim();
  const byId = pageById(ws, text);
  if (byId) return byId;
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  const parts = text.split('/').map(fold).filter(Boolean);
  const matches = ws.pages.filter((p) => {
    const path = pathTo(ws, p.id).map((x) => fold(titleOf(x)));
    return path.length >= parts.length && parts.every((part, i) => path[path.length - parts.length + i] === part);
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return fail(`More than one page is called "${text}": ${matches.map((p) => `"${pathName(ws, p)}" (id ${p.id})`).join(', ')}. Give its id or its path.`);
  return fail(`There is no page "${text}". list_pages shows them.`);
}

/** A block number of a page (from 1) as an index. */
function blockAt(page: Page, given: unknown, key: string, allowEnd = false): number {
  const n = Number(given);
  const most = page.blocks.length + (allowEnd ? 1 : 0);
  if (!Number.isInteger(n) || n < 1 || n > most) return fail(`"${key}" must be the number of a block of "${titleOf(page)}", from 1 to ${most}. read_page shows them.`);
  return n - 1;
}

const textArg = (args: Args, key: string): string => {
  const value = args[key];
  if (typeof value !== 'string') return fail(`"${key}" must be text.`);
  return value;
};

/** A page's blocks, each with its number, as Markdown. */
export function numbered(page: Page): string {
  return page.blocks
    .map((block, i) => {
      const indent = block.indent ?? 0;
      const md = blocksToMarkdown([{ ...block, indent: undefined }]) || (block.type === 'paragraph' ? '(empty)' : '');
      return md
        .split('\n')
        .map((line, j) => `${j ? '     ' : `[${i + 1}]`.padEnd(5)}${'  '.repeat(indent)}${line}`)
        .join('\n');
    })
    .join('\n');
}

const read = (ws: Workspace, page: Page): string => {
  const kids = childrenOf(ws, page.id);
  const head = [
    `Page "${titleOf(page)}" (id ${page.id})${page.icon ? ` ${page.icon}` : ''}`,
    `Path: ${pathName(ws, page)}`,
    kids.length ? `Pages inside: ${kids.map((k) => `"${titleOf(k)}" (${k.id})`).join(', ')}` : '',
  ].filter(Boolean);
  return `${head.join('\n')}\n\n${numbered(page)}`;
};

/** Blocks from Markdown, set in as far as `indent` says; never none. */
const blocksOf = (markdown: string, indent = 0) => {
  const blocks = markdownToBlocks(markdown);
  return indent ? blocks.map((b) => ({ ...b, indent: (b.indent ?? 0) + indent })) : blocks;
};

const changedPage = (ws: Workspace, page: Page, fn: (page: Page) => Page) => updatePage(ws, page.id, fn);

export const TOOLS: Tool[] = [
  {
    name: 'list_pages',
    title: 'List the pages',
    description: 'The pages of the workspace as a tree: each with its id, its title and how many blocks it has. Start here.',
    properties: {},
    writes: false,
    run(ws) {
      if (!ws.pages.length) return { text: 'The workspace has no pages.' };
      const lines: string[] = [];
      const walk = (parent: string | undefined, depth: number) => {
        for (const page of childrenOf(ws, parent)) {
          lines.push(`${'  '.repeat(depth)}- ${page.icon ? `${page.icon} ` : ''}${titleOf(page)} (id ${page.id}, ${page.blocks.length} blocks)`);
          walk(page.id, depth + 1);
        }
      };
      walk(undefined, 0);
      return { text: `${ws.pages.length} pages:\n${lines.join('\n')}` };
    },
  },
  {
    name: 'read_page',
    title: 'Read a page',
    description: 'A page as Markdown, each block with its number ([1], [2]…), which the tools that change blocks take. Says the path to it and the pages inside it.',
    properties: { page: PAGE },
    required: ['page'],
    writes: false,
    run(ws, args) {
      return { text: read(ws, pageOf(ws, args.page)) };
    },
  },
  {
    name: 'search_pages',
    title: 'Search the pages',
    description: 'The pages with every word of a query in their title or text, without minding case or accents: each with the line where it was found.',
    properties: { query: { type: 'string', description: 'The words to find.' } },
    required: ['query'],
    writes: false,
    run(ws, args) {
      const results = searchPages(ws, textArg(args, 'query'), 30);
      if (!results.length) return { text: 'Nothing found.' };
      return {
        text: results
          .map((r) => {
            const where = r.block ? ` block [${r.page.blocks.indexOf(r.block) + 1}]: ${r.snippet.join('')}` : ' (in the title)';
            return `- "${pathName(ws, r.page)}" (id ${r.page.id})${where}`;
          })
          .join('\n'),
      };
    },
  },
  {
    name: 'get_backlinks',
    title: 'Pages that link to a page',
    description: 'The pages whose text or page links go to a page.',
    properties: { page: PAGE },
    required: ['page'],
    writes: false,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const from = backlinksOf(ws, page.id);
      return { text: from.length ? from.map((p) => `- "${pathName(ws, p)}" (id ${p.id})`).join('\n') : `No page links to "${titleOf(page)}".` };
    },
  },
  {
    name: 'create_page',
    title: 'Create a page',
    description: 'A new page, at the top or inside another, with its title, an emoji for its icon and what it says. Gives its id.',
    properties: {
      title: { type: 'string', description: 'Its title.' },
      parent: { ...PAGE, description: 'The page it goes inside. At the top when left out.' },
      icon: { type: 'string', description: 'An emoji.' },
      markdown: MARKDOWN('What the page says'),
    },
    required: ['title'],
    writes: true,
    run(ws, args) {
      const parent = args.parent ? pageOf(ws, args.parent, 'parent') : undefined;
      const blocks = typeof args.markdown === 'string' && args.markdown.trim() ? blocksOf(args.markdown) : undefined;
      const page = createPage(textArg(args, 'title'), {
        ...(parent ? { parent: parent.id } : {}),
        ...(typeof args.icon === 'string' && args.icon ? { icon: args.icon } : {}),
        ...(blocks?.length ? { blocks } : {}),
      });
      const made = newPage(ws, '', parent?.id);
      const workspace = { pages: made.workspace.pages.map((p) => (p.id === made.page.id ? page : p)) };
      return { workspace, text: `Created "${pathName(workspace, page)}" (id ${page.id}) with ${page.blocks.length} blocks.` };
    },
  },
  {
    name: 'write_page',
    title: 'Write a page',
    description: 'Everything a page says replaced by new Markdown. To change part of it, use replace_blocks or insert_blocks.',
    properties: { page: PAGE, markdown: MARKDOWN('What the page says now') },
    required: ['page', 'markdown'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const blocks = blocksOf(textArg(args, 'markdown'));
      const workspace = changedPage(ws, page, (p) => ({ ...p, blocks: blocks.length ? blocks : [createBlock()], updated: Date.now() }));
      return { workspace, text: `Wrote "${titleOf(page)}": ${pageById(workspace, page.id)!.blocks.length} blocks.` };
    },
  },
  {
    name: 'insert_blocks',
    title: 'Insert blocks',
    description: 'Markdown put into a page after a block (and what is inside it), at the start with "after": 0, at the end when left out. Set further in, under the block before it, with "indent".',
    properties: {
      page: PAGE,
      markdown: MARKDOWN('What to put in'),
      after: { type: 'integer', description: 'The number of the block it goes after; 0 for the start. The end when left out.' },
      indent: { type: 'integer', description: 'How many levels further in than the block it goes after. 0 when left out.' },
    },
    required: ['page', 'markdown'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      let at = page.blocks.length;
      let base = 0;
      if (args.after !== undefined && Number(args.after) !== 0) {
        const i = blockAt(page, args.after, 'after');
        at = subtreeEnd(page.blocks, i);
        base = page.blocks[i].indent ?? 0;
      } else if (Number(args.after) === 0) at = 0;
      const blocks = blocksOf(textArg(args, 'markdown'), base + Math.max(0, Number(args.indent ?? 0) || 0));
      if (!blocks.length) fail('"markdown" has nothing in it.');
      const empty = page.blocks.length === 1 && page.blocks[0].type === 'paragraph' && !page.blocks[0].text.length;
      const workspace = changedPage(ws, page, (p) => (empty ? { ...p, blocks, updated: Date.now() } : insertBlocks(p, at, blocks)));
      return { workspace, text: `Put ${blocks.length} block(s) into "${titleOf(page)}"${empty ? '' : ` as [${at + 1}]${blocks.length > 1 ? `–[${at + blocks.length}]` : ''}`}.` };
    },
  },
  {
    name: 'replace_blocks',
    title: 'Replace blocks',
    description: 'The blocks from one number to another (just one when "to" is left out) replaced by Markdown, at the same level.',
    properties: {
      page: PAGE,
      from: { type: 'integer', description: 'The number of the first block.' },
      to: { type: 'integer', description: 'The number of the last block. "from" when left out.' },
      markdown: MARKDOWN('What goes in their place'),
    },
    required: ['page', 'from', 'markdown'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const from = blockAt(page, args.from, 'from');
      const to = args.to === undefined ? from : blockAt(page, args.to, 'to');
      if (to < from) fail('"to" must not be before "from".');
      const blocks = blocksOf(textArg(args, 'markdown'), page.blocks[from].indent ?? 0);
      // A single block that stays a single block keeps its id: those editing it see it change in place.
      if (from === to && blocks.length === 1) {
        const { id: _id, ...rest } = blocks[0];
        const workspace = changedPage(ws, page, (p) =>
          updateBlock(p, p.blocks[from].id, { checked: undefined, language: undefined, icon: undefined, src: undefined, page: undefined, folded: undefined, ...rest }),
        );
        return { workspace, text: `Replaced block [${from + 1}] of "${titleOf(page)}".` };
      }
      const gone = page.blocks.slice(from, to + 1).map((b) => b.id);
      const workspace = changedPage(ws, page, (p) => insertBlocks(removeBlocks(p, gone), from, blocks));
      return { workspace, text: `Replaced blocks [${from + 1}]–[${to + 1}] of "${titleOf(page)}" with ${blocks.length} block(s).` };
    },
  },
  {
    name: 'delete_blocks',
    title: 'Delete blocks',
    description: 'The blocks from one number to another (just one when "to" is left out) taken out of a page.',
    properties: {
      page: PAGE,
      from: { type: 'integer', description: 'The number of the first block.' },
      to: { type: 'integer', description: 'The number of the last block. "from" when left out.' },
    },
    required: ['page', 'from'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const from = blockAt(page, args.from, 'from');
      const to = args.to === undefined ? from : blockAt(page, args.to, 'to');
      if (to < from) fail('"to" must not be before "from".');
      const workspace = changedPage(ws, page, (p) =>
        removeBlocks(
          p,
          p.blocks.slice(from, to + 1).map((b) => b.id),
        ),
      );
      return { workspace, text: `Deleted ${to - from + 1} block(s) of "${titleOf(page)}".` };
    },
  },
  {
    name: 'set_task',
    title: 'Tick a task',
    description: 'A to-do block ticked as done, or not.',
    properties: { page: PAGE, block: { type: 'integer', description: 'The number of the to-do block.' }, done: { type: 'boolean', description: 'Done or not. True when left out.' } },
    required: ['page', 'block'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const i = blockAt(page, args.block, 'block');
      if (page.blocks[i].type !== 'todo') fail(`Block [${i + 1}] is not a to-do: it is ${page.blocks[i].type}.`);
      const done = args.done !== false;
      const workspace = changedPage(ws, page, (p) => updateBlock(p, p.blocks[i].id, { checked: done || undefined }));
      return { workspace, text: `Block [${i + 1}] is ${done ? 'done' : 'not done'}.` };
    },
  },
  {
    name: 'rename_page',
    title: 'Rename a page',
    description: 'A page given a new title, a new icon (an emoji), or both; "icon": "" takes the icon away.',
    properties: { page: PAGE, title: { type: 'string', description: 'The new title.' }, icon: { type: 'string', description: 'An emoji, or "" for none.' } },
    required: ['page'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      if (args.title === undefined && args.icon === undefined) fail('Give a "title", an "icon", or both.');
      const workspace = renamePage(ws, page.id, { ...(typeof args.title === 'string' ? { title: args.title } : {}), ...(typeof args.icon === 'string' ? { icon: args.icon || null } : {}) });
      return { workspace, text: `The page is now "${titleOf(pageById(workspace, page.id)!)}".` };
    },
  },
  {
    name: 'move_page',
    title: 'Move a page',
    description: 'A page moved inside another (to the top when "parent" is left out), before one of its pages or last.',
    properties: {
      page: PAGE,
      parent: { ...PAGE, description: 'The page it goes inside. The top when left out.' },
      before: { ...PAGE, description: 'The page it goes before, among those inside its parent. Last when left out.' },
    },
    required: ['page'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const parent = args.parent ? pageOf(ws, args.parent, 'parent') : undefined;
      const before = args.before ? pageOf(ws, args.before, 'before') : undefined;
      if (parent && descendantsOf(ws, page.id).includes(parent.id)) fail('A page cannot go inside itself or a page inside it.');
      const workspace = movePage(ws, page.id, parent?.id, before?.id);
      return { workspace, text: `Moved "${titleOf(page)}" to "${pathName(workspace, pageById(workspace, page.id)!)}".` };
    },
  },
  {
    name: 'delete_page',
    title: 'Delete a page',
    description: 'A page taken out of the workspace, with every page inside it.',
    properties: { page: PAGE },
    required: ['page'],
    writes: true,
    run(ws, args) {
      const page = pageOf(ws, args.page);
      const count = descendantsOf(ws, page.id).length;
      return { workspace: removePage(ws, page.id), text: `Deleted "${titleOf(page)}"${count > 1 ? ` and the ${count - 1} page(s) inside it` : ''}.` };
    },
  },
];

export const findTool = (name: string): Tool | undefined => TOOLS.find((t) => t.name === name);
