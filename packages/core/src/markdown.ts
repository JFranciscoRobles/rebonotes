// Pages as Markdown, and Markdown as pages: the format a page is kept in, so
// that it is read by any editor, kept in git, and taken anywhere. What the
// page is (its id, its icon, when it was made) goes in front matter; its
// title is the first heading. Blocks are written as Markdown writes them; a
// callout as GitHub writes one (`> [!NOTE]`), a toggle as `<details>`, a line
// break inside a block as `<br>`, underline as `<u>`. A link to a page is
// `[text](page:id)`, or the address `pageHref` gives when the pages are files.

import { type Block, type BlockType, createBlock, LIST_TYPES, type Mark, type Page, type Span } from './model';
import { readTable, startsTable, tableToMarkdown } from './database';
import { normalizeSpans } from './spans';

export interface MarkdownOptions {
  /** The address a link to a page is written with; `page:id` when left out. */
  pageHref?: (id: string) => string;
  /** The page an address goes to, when it is one; `page:id` is always read. */
  pageOf?: (href: string) => string | undefined;
}

// ——— The text of a block ———

const DELIMITERS: [Mark, string, string][] = [
  ['bold', '**', '**'],
  ['italic', '*', '*'],
  ['strike', '~~', '~~'],
  ['underline', '<u>', '</u>'],
];

/** An address as it goes in `(…)`: its brackets and spaces written as %xx. */
const hrefOut = (href: string): string => href.replace(/[()\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);

const escapeText = (text: string): string => text.replace(/[\\`*_~[\]<]/g, '\\$&').replace(/\n/g, '<br>');

function codeText(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** Spans as the Markdown of one line: marks opened and closed as they change, around the spaces. */
export function spansToMarkdown(spans: readonly Span[], options: MarkdownOptions = {}): string {
  let out = '';
  const open: Mark[] = [];
  let spaces = '';
  const ws = (text: string) => text.replace(/\n/g, '<br>');
  const close = (keep: Mark[]) => {
    // A mark under one that is closed is closed too, and opened again after.
    const i = open.findIndex((m) => !keep.includes(m));
    if (i < 0) return;
    while (open.length > i) {
      const mark = open.pop()!;
      out += DELIMITERS.find(([m]) => m === mark)![2];
    }
  };
  const openAll = (marks: Mark[]) => {
    for (const [mark, start] of DELIMITERS) {
      if (marks.includes(mark) && !open.includes(mark)) {
        out += start;
        open.push(mark);
      }
    }
  };
  for (const span of normalizeSpans(spans)) {
    const lead = span.text.match(/^\s*/)![0];
    const trail = span.text.slice(lead.length).match(/\s*$/)![0];
    const core = span.text.slice(lead.length, span.text.length - trail.length);
    if (!core) {
      spaces += span.text;
      continue;
    }
    const marks: Mark[] = (span.marks ?? []).filter((m) => m !== 'code');
    const href = span.page ? (options.pageHref?.(span.page) ?? `page:${span.page}`) : span.link;
    if (href) {
      // A link is whole: the marks of its text inside its brackets.
      close([]);
      out += ws(spaces + lead);
      let inner = '';
      for (const [mark, start] of DELIMITERS) if (marks.includes(mark)) inner += start;
      inner += span.marks?.includes('code') ? codeText(core) : escapeText(core);
      for (const [mark, , end] of [...DELIMITERS].reverse()) if (marks.includes(mark)) inner += end;
      out += `[${inner}](${hrefOut(href)})`;
    } else {
      close(marks);
      out += ws(spaces + lead);
      openAll(marks);
      out += span.marks?.includes('code') ? codeText(core) : escapeText(core);
    }
    spaces = trail;
  }
  close([]);
  return out + ws(spaces);
}

const isWord = (ch: string | undefined): boolean => !!ch && /[\p{L}\p{N}]/u.test(ch);

/** The Markdown of a line as spans: marks, code, links, line breaks and escapes. */
export function markdownToSpans(text: string, options: MarkdownOptions = {}): Span[] {
  const out: Span[] = [];
  const marks = new Set<Mark>();
  let buffer = '';
  const flush = (extra: Partial<Span> = {}) => {
    if (buffer) out.push({ text: buffer, ...(marks.size ? { marks: [...marks] } : {}), ...extra });
    buffer = '';
  };
  const toggle = (mark: Mark, closing: boolean) => {
    flush();
    if (closing) marks.delete(mark);
    else marks.add(mark);
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const rest = text.slice(i);
    if (ch === '\\' && i + 1 < text.length && /[!-/:-@[-`{-~]/.test(text[i + 1])) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') {
      const fence = rest.match(/^`+/)![0];
      const end = text.indexOf(fence, i + fence.length);
      if (end > 0) {
        flush();
        let code = text.slice(i + fence.length, end);
        if (code.startsWith(' ') && code.endsWith(' ') && code.trim()) code = code.slice(1, -1);
        out.push({ text: code, marks: [...marks, 'code'] });
        i = end + fence.length;
        continue;
      }
    }
    const br = rest.match(/^<br\s*\/?>/i);
    if (br) {
      buffer += '\n';
      i += br[0].length;
      continue;
    }
    if (/^<u>/i.test(rest) || /^<\/u>/i.test(rest)) {
      const closing = rest[1] === '/';
      toggle('underline', closing);
      i += closing ? 4 : 3;
      continue;
    }
    if (ch === '[') {
      const link = matchLink(text, i);
      if (link) {
        flush();
        const inner = markdownToSpans(link.label, options);
        const page = link.href.startsWith('page:') ? link.href.slice(5) : options.pageOf?.(link.href);
        for (const span of inner) {
          const all = new Set([...marks, ...(span.marks ?? [])]);
          out.push({ text: span.text, ...(all.size ? { marks: [...all] } : {}), ...(page ? { page } : { link: link.href }) });
        }
        i = link.end;
        continue;
      }
    }
    if (rest.startsWith('~~')) {
      const closing = marks.has('strike');
      if (closing || text.indexOf('~~', i + 2) > 0) {
        toggle('strike', closing);
        i += 2;
        continue;
      }
    }
    if (ch === '*' || ch === '_') {
      const run = rest.match(ch === '*' ? /^\*+/ : /^_+/)![0];
      const before = text[i - 1];
      const after = text[i + run.length];
      // An underscore inside a word is a letter, as in snake_case.
      const inWord = ch === '_' && isWord(before) && isWord(after);
      if (!inWord) {
        let n = run.length;
        let used = 0;
        const step = (mark: Mark, size: number) => {
          const closing = marks.has(mark);
          if (closing ? !/\s/.test(before ?? ' ') : text.indexOf(ch.repeat(size), i + run.length) > 0 && after !== undefined && !/\s/.test(after)) {
            toggle(mark, closing);
            n -= size;
            used += size;
          }
        };
        // `***` is both; `****` after bold and italic closes them, and what is left opens again.
        if (n >= 2) step('bold', 2);
        if (n >= 1) step('italic', 1);
        if (n >= 2) step('bold', 2);
        if (n >= 1) step('italic', 1);
        if (used) {
          buffer += ch.repeat(run.length - used);
          i += run.length;
          continue;
        }
      }
      buffer += run;
      i += run.length;
      continue;
    }
    buffer += ch;
    i += 1;
  }
  flush();
  return normalizeSpans(out);
}

/** `[label](href)` starting at an offset: its parts, and where it ends. */
function matchLink(text: string, start: number): { label: string; href: string; end: number } | undefined {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) {
      if (text[i + 1] !== '(') return undefined;
      const close = text.indexOf(')', i + 2);
      if (close < 0) return undefined;
      const href =
        text
          .slice(i + 2, close)
          .trim()
          .split(/\s+/)[0] ?? '';
      let decoded = href;
      try {
        decoded = decodeURIComponent(href);
      } catch {
        // As written.
      }
      return { label: text.slice(start + 1, i), href: decoded.replace(/^<|>$/g, ''), end: close + 1 };
    }
  }
  return undefined;
}

// ——— Pages ———

const CALLOUTS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];
const CALLOUT_ICONS: Record<string, string> = { NOTE: 'ℹ️', TIP: '💡', IMPORTANT: '❗', WARNING: '⚠️', CAUTION: '🛑' };
const EMOJI_START = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s+/u;

/** A line break written in a line, not one written as text (`\\<br>`). */
const BR = /(?<!\\)<br>/;

/** A line of text that would be read as something else at the start of a block, made plain. */
const guardStart = (line: string): string => (/^(#{1,6}\s|>|[-+]\s|\d+[.)]\s|-{3,}\s*$|={3,}\s*$|!\[|<details|<\/details|<summary)/.test(line) ? `\\${line}` : line);

/** A page as Markdown, with what it is in front matter and its title as the first heading. */
export function pageToMarkdown(page: Page, options: MarkdownOptions & { frontMatter?: Record<string, string | number | undefined> } = {}): string {
  const meta: Record<string, string | number | undefined> = {
    id: page.id,
    icon: page.icon,
    created: new Date(page.created).toISOString(),
    updated: new Date(page.updated).toISOString(),
    ...options.frontMatter,
  };
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) if (value !== undefined && value !== '') lines.push(`${key}: ${JSON.stringify(value)}`);
  lines.push('---', '');
  if (page.title) lines.push(`# ${escapeText(page.title)}`, '');
  lines.push(blocksToMarkdown(page.blocks, options));
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Blocks as Markdown, an empty line between each. */
export function blocksToMarkdown(blocks: readonly Block[], options: MarkdownOptions = {}): string {
  const out: string[] = [];
  const numbers: number[] = [];
  const toggles: number[] = [];
  for (const [index, block] of blocks.entries()) {
    const indent = block.indent ?? 0;
    // A toggle ends where a block comes that is not further in than it.
    while (toggles.length && indent <= toggles[toggles.length - 1]) out.push('', `${'  '.repeat(toggles.pop()!)}</details>`);
    const pad = '  '.repeat(indent);
    numbers.length = indent + 1;
    const previous = blocks[index - 1];
    if (block.type === 'numbered') numbers[indent] = previous && (previous.indent ?? 0) >= indent && numbers[indent] ? numbers[indent] + 1 : 1;
    else numbers[indent] = 0;
    const text = spansToMarkdown(block.text, options);
    // The items of a list go one under another, without an empty line.
    const tight = previous && LIST_TYPES.has(block.type) && LIST_TYPES.has(previous.type);
    if (out.length && !tight) out.push('');
    switch (block.type) {
      case 'heading1':
        out.push(`${pad}# ${text}`);
        break;
      case 'heading2':
        out.push(`${pad}## ${text}`);
        break;
      case 'heading3':
        out.push(`${pad}### ${text}`);
        break;
      case 'bulleted':
        out.push(`${pad}- ${text}`);
        break;
      case 'numbered':
        out.push(`${pad}${numbers[indent]}. ${text}`);
        break;
      case 'todo':
        out.push(`${pad}- [${block.checked ? 'x' : ' '}] ${text}`);
        break;
      case 'quote':
        out.push(...text.split(BR).map((line) => `${pad}> ${line}`.trimEnd()));
        break;
      case 'callout': {
        const kind = Object.entries(CALLOUT_ICONS).find(([, icon]) => icon === block.icon)?.[0] ?? 'NOTE';
        const icon = block.icon && CALLOUT_ICONS[kind] !== block.icon ? `${block.icon} ` : '';
        out.push(`${pad}> [!${kind}]`, ...`${icon}${text}`.split(BR).map((line) => `${pad}> ${line}`.trimEnd()));
        break;
      }
      case 'code': {
        const code = block.text.map((s) => s.text).join('');
        const longest = Math.max(2, ...(code.match(/`{3,}/g) ?? []).map((run) => run.length));
        const fence = '`'.repeat(longest + 1);
        out.push(`${pad}${fence}${block.language ?? ''}`, ...code.split('\n').map((line) => (line ? pad + line : '')), `${pad}${fence}`);
        break;
      }
      case 'toggle':
        out.push(`${pad}<details${block.folded ? '' : ' open'}>`, `${pad}<summary>${text}</summary>`, '');
        toggles.push(indent);
        break;
      case 'divider':
        out.push(`${pad}---`);
        break;
      case 'image':
        // Its width after its words, as Obsidian writes a size: ![a cat|60%](cat.png).
        out.push(`${pad}![${text}${block.width ? `|${block.width}%` : ''}](${hrefOut(block.src ?? '')})`);
        break;
      case 'page':
        out.push(`${pad}[${text || 'page'}](${block.page ? (options.pageHref?.(block.page) ?? `page:${block.page}`) : ''})`);
        break;
      case 'embed': {
        // As Obsidian writes a file put in a page: ![[address|name]].
        const name = block.text.map((s) => s.text).join('');
        const size = block.width || block.height ? `|${block.width ?? 100}%${block.height ? `x${block.height}` : ''}` : '';
        out.push(`${pad}![[${(block.src ?? '').replace(/[|\]\n]/g, encodeURIComponent)}${name || size ? `|${name.replace(/[|\]\n]/g, ' ')}` : ''}${size}]]`);
        break;
      }
      case 'database':
        out.push(block.table ? tableToMarkdown(block.table, pad) : '');
        break;
      default:
        out.push(pad + guardStart(text));
    }
  }
  while (toggles.length) {
    out.push('', `${'  '.repeat(toggles.pop()!)}</details>`);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** The front matter of a Markdown file, and what comes after it. */
export function readFrontMatter(markdown: string): { meta: Record<string, string>; body: string } {
  const match = markdown.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: markdown };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) continue;
    let value = pair[2].trim();
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    } else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    meta[pair[1]] = value;
  }
  return { meta, body: markdown.slice(match[0].length) };
}

const time = (value: string | undefined, fallback: number): number => {
  const t = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(t) ? fallback : t;
};

/** A Markdown file as a page: front matter, the first heading as its title, and its blocks. */
export function markdownToPage(markdown: string, options: MarkdownOptions & { title?: string; now?: number } = {}): Page {
  const { meta, body } = readFrontMatter(markdown);
  const now = options.now ?? Date.now();
  const blocks = markdownToBlocks(body, options);
  let title = meta.title ?? '';
  // The first heading is the title, when the front matter does not say another.
  if (blocks[0]?.type === 'heading1' && !blocks[0].indent && (!title || title === blocks[0].text.map((s) => s.text).join(''))) {
    title = blocks[0].text.map((s) => s.text).join('');
    blocks.shift();
  }
  if (!title) title = options.title ?? '';
  return {
    id: meta.id || createBlock().id,
    title,
    ...(meta.icon ? { icon: meta.icon } : {}),
    blocks: blocks.length ? blocks : [createBlock()],
    created: time(meta.created, now),
    updated: time(meta.updated, now),
  };
}

/** Markdown as blocks. */
export function markdownToBlocks(markdown: string, options: MarkdownOptions = {}): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const toggles: number[] = [];
  const add = (type: BlockType, text: string | Span[], indent: number, extra: Partial<Block> = {}) => {
    blocks.push(createBlock(type, typeof text === 'string' ? markdownToSpans(text, options) : text, { ...(indent ? { indent } : {}), ...extra }));
  };
  const levelOf = (space: string) => Math.floor(space.replace(/\t/g, '  ').length / 2);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const space = line.match(/^\s*/)![0];
    // Inside a toggle, a block is under it however far in it is written.
    const indent = Math.max(levelOf(space), toggles.length ? toggles[toggles.length - 1] + 1 : 0);
    const body = line.slice(space.length);
    i++;
    if (!body) continue;
    let m: RegExpMatchArray | null;
    if ((m = body.match(/^(`{3,}|~{3,})\s*([\w+#.-]*)/))) {
      const fence = m[1];
      const code: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        code.push(lines[i].startsWith(space) ? lines[i].slice(space.length) : lines[i].trimStart());
        i++;
      }
      i++;
      add('code', code.join('\n') ? [{ text: code.join('\n') }] : [], indent, m[2] ? { language: m[2] } : {});
      continue;
    }
    if (/^<details(\s+open)?\s*>/i.test(body)) {
      let summary = body.match(/<summary>([\s\S]*?)<\/summary>/i)?.[1];
      if (summary === undefined && i < lines.length) {
        summary = lines[i].trim().match(/^<summary>([\s\S]*?)<\/summary>/i)?.[1];
        if (summary !== undefined) i++;
      }
      add('toggle', summary ?? '', indent, /open/i.test(body) ? {} : { folded: true });
      toggles.push(indent);
      continue;
    }
    if (/^<\/details>/i.test(body)) {
      toggles.pop();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(body.replace(/\s/g, ''))) {
      add('divider', '', indent);
      continue;
    }
    if ((m = body.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) {
      add(m[1].length === 1 ? 'heading1' : m[1].length === 2 ? 'heading2' : 'heading3', m[2], indent);
      continue;
    }
    if ((m = body.match(/^[-*+]\s+\[([ xX])\]\s?(.*)$/))) {
      add('todo', m[2], indent, m[1] === ' ' ? {} : { checked: true });
      continue;
    }
    if ((m = body.match(/^[-*+]\s+(.*)$/))) {
      add('bulleted', m[1], indent);
      continue;
    }
    if ((m = body.match(/^\d+[.)]\s+(.*)$/))) {
      add('numbered', m[1], indent);
      continue;
    }
    if (body.startsWith('>')) {
      const quoted = [body.replace(/^>\s?/, '')];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) quoted.push(lines[i++].trimStart().replace(/^>\s?/, ''));
      const alert = quoted[0].match(/^\[!(\w+)\]\s*(.*)$/);
      if (alert && CALLOUTS.includes(alert[1].toUpperCase())) {
        let text = [alert[2], ...quoted.slice(1)].filter((part, n) => n > 0 || part).join('<br>');
        let icon = CALLOUT_ICONS[alert[1].toUpperCase()];
        const emoji = text.match(EMOJI_START);
        if (emoji) {
          icon = emoji[1];
          text = text.slice(emoji[0].length);
        }
        add('callout', text, indent, { icon });
      } else add('quote', quoted.join('<br>'), indent);
      continue;
    }
    if ((m = body.match(/^!\[\[([^|\]]+)(?:\|([^\]|]*))?(?:\|(\d+)%(?:x(\d+))?)?\]\]\s*$/))) {
      let src = m[1].trim();
      try {
        src = decodeURIComponent(src);
      } catch {
        // As written.
      }
      add('embed', m[2]?.trim() ? [{ text: m[2].trim() }] : [{ text: src.split('/').pop()!.split('?')[0] }].filter(() => !src.startsWith('data:')), indent, {
        src,
        ...(m[3] && Number(m[3]) < 100 ? { width: Number(m[3]) } : {}),
        ...(m[4] ? { height: Number(m[4]) } : {}),
      });
      continue;
    }
    if (startsTable(body)) {
      const read = readTable(lines, i - 1);
      if (read) {
        add('database', [], indent, { table: read.table });
        i = read.end;
        continue;
      }
    }
    if ((m = body.match(/^!\[([^\]]*)\]\(([^)\s]*)[^)]*\)\s*$/))) {
      let src = m[2];
      try {
        src = decodeURIComponent(src);
      } catch {
        // As written.
      }
      const sized = m[1].match(/^(.*?)\|(\d+)%$/);
      add('image', sized ? sized[1] : m[1], indent, { src, ...(sized && Number(sized[2]) < 100 ? { width: Number(sized[2]) } : {}) });
      continue;
    }
    const whole = body.match(/^\[([^\]]+)\]\(([^)\s]+)\)\s*$/);
    if (whole) {
      let href = whole[2];
      try {
        href = decodeURIComponent(href);
      } catch {
        // As written.
      }
      const page = href.startsWith('page:') ? href.slice(5) : options.pageOf?.(href);
      if (page) {
        add('page', whole[1].replace(/\\(.)/g, '$1'), indent, { page });
        continue;
      }
    }
    // A paragraph: the lines after it until an empty one or another block, joined.
    const parts = [body];
    while (i < lines.length && lines[i].trim() && !/^\s*([-*+]\s|\d+[.)]\s|#{1,6}\s|>|`{3}|~{3}|<\/?details|!\[|<!-- rebonotes:|\|)/.test(lines[i])) parts.push(lines[i++].trim());
    add('paragraph', parts.join(' '), indent);
  }
  return blocks;
}
