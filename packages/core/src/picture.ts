// A page drawn as a picture, as the editor shows it in light: its icon, its
// title, and its blocks one under another until the sheet is full, for a
// thumbnail of it (a drive's grid, a preview). Drawn on any 2D context and
// nothing else of the DOM: a browser's canvas, or a server's (as
// `@napi-rs/canvas` gives one), so a server can make it too. The pictures of
// the page go in it when the one drawing has them already; a box where they
// go when not.

import { type Block, type Page, plainText, type Span, type Workspace } from './model';

/** What of a 2D context the drawing uses: a browser's `CanvasRenderingContext2D` has it, and a server's canvas does. */
export interface PictureContext {
  font: string;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  textBaseline: string;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  save(): void;
  restore(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
  // biome-ignore lint/suspicious/noExplicitAny: a picture of whatever kind the context draws: an image, a canvas, a bitmap.
  drawImage(image: any, x: number, y: number, w: number, h: number): void;
}

/** A picture already loaded, as the context draws it, with its size. */
export interface Loaded {
  image: unknown;
  width: number;
  height: number;
}

export interface PictureOptions {
  /** The pages of the workspace, for the titles of the pages a page links to. */
  workspace?: Workspace;
  /** The pictures of the page already loaded, by their address; a box is drawn for one not given. */
  images?: (src: string) => Loaded | undefined;
  /** What a page without a title is called: "Untitled" unless said. */
  untitled?: string;
}

/** The size of the sheet a page is drawn on, in the editor's pixels: a page of letter, upright. */
export const PICTURE_SIZE = { width: 816, height: 1056 } as const;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const INK = { text: '#2f2e2b', muted: '#6b6964', faint: '#a9a59d', accent: '#c2255c', line: '#e6e3dc', code: '#f6f4ef', codeText: '#b02a55', callout: '#f7f5f0', bg: '#ffffff' };
const MARGIN = 72;
const INDENT = 26;

/** How a kind of text is set: its size, weight and line, as the editor's styles. */
const SETS = {
  paragraph: { size: 16, weight: 400, line: 1.6, before: 0 },
  heading1: { size: 30, weight: 700, line: 1.3, before: 22 },
  heading2: { size: 24, weight: 650, line: 1.3, before: 16 },
  heading3: { size: 19, weight: 650, line: 1.35, before: 10 },
  quote: { size: 17, weight: 400, line: 1.6, before: 4 },
  code: { size: 13.5, weight: 400, line: 1.6, before: 6 },
} as const;

/** A word or the space after it, with the marks of the span it is in. */
interface Piece {
  text: string;
  span: Span;
}

const fontOf = (span: Span | undefined, size: number, weight: number, family = FONT) => {
  const marks = span?.marks ?? [];
  const mono = marks.includes('code');
  return `${marks.includes('italic') ? 'italic ' : ''}${marks.includes('bold') ? 700 : weight} ${mono ? size * 0.9 : size}px ${mono ? MONO : family}`;
};

/**
 * The lines of some spans set in `width` pixels: each a list of pieces at their places. A word too long for a line
 * is cut where it reaches its end.
 */
function setLines(ctx: PictureContext, spans: readonly Span[], width: number, size: number, weight: number) {
  const pieces: Piece[] = spans.flatMap((span) => (span.text.match(/\s+|\S+/g) ?? []).map((text) => ({ text, span })));
  const lines: { piece: Piece; x: number }[][] = [[]];
  let x = 0;
  const measure = (p: Piece) => {
    ctx.font = fontOf(p.span, size, weight);
    return ctx.measureText(p.text).width;
  };
  for (const piece of pieces) {
    if (piece.text.includes('\n')) {
      lines.push([]);
      x = 0;
      continue;
    }
    const space = /^\s+$/.test(piece.text);
    let w = measure(piece);
    if (x + w > width && x > 0) {
      if (space) continue;
      lines.push([]);
      x = 0;
    }
    if (space && x === 0) continue;
    // A word longer than the line, cut where it reaches its end.
    let rest = piece;
    while (w > width && rest.text.length > 1) {
      let fit = rest.text.length - 1;
      while (fit > 1 && measure({ ...rest, text: rest.text.slice(0, fit) }) > width - x) fit--;
      lines[lines.length - 1].push({ piece: { ...rest, text: rest.text.slice(0, fit) }, x });
      lines.push([]);
      x = 0;
      rest = { ...rest, text: rest.text.slice(fit) };
      w = measure(rest);
    }
    lines[lines.length - 1].push({ piece: rest, x });
    x += w;
  }
  return lines;
}

/** A box with round corners, filled or drawn round, as the path is made. */
function roundBox(ctx: PictureContext, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * A page drawn on a sheet of `PICTURE_SIZE` from its top left, white, in the editor's look in light; what does not fit
 * on it is left out. Scale the context first for a picture of another size.
 */
export function drawPage(ctx: PictureContext, page: Page, options: PictureOptions = {}): void {
  const { width, height } = PICTURE_SIZE;
  const right = width - MARGIN;
  const bottom = height - 40;
  const titles = new Map(options.workspace?.pages.map((p) => [p.id, p]));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  ctx.fillStyle = INK.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'alphabetic';
  let y = 64;

  /** Text set from `x` to the right margin; where it ends. Its colour unless a span says (a link). */
  const write = (spans: readonly Span[], x: number, kind: keyof typeof SETS, color = INK.text, done = false) => {
    const set = SETS[kind];
    const lineHeight = set.size * set.line;
    const family = kind === 'code' ? MONO : FONT;
    for (const line of setLines(ctx, spans, right - x, set.size, set.weight)) {
      if (y + lineHeight > bottom) return (y = bottom);
      const base = y + lineHeight / 2 + set.size * 0.36;
      for (const [index, { piece, x: at }] of line.entries()) {
        const { span } = piece;
        const marks = span.marks ?? [];
        ctx.font = fontOf(span, set.size, set.weight, family);
        const w = ctx.measureText(piece.text).width;
        if (marks.includes('code') && kind !== 'code' && piece.text.trim()) {
          ctx.fillStyle = INK.code;
          roundBox(ctx, x + at - 2, base - set.size * 0.9, w + 4, set.size * 1.25, 4);
          ctx.fill();
        }
        const ink = done ? INK.muted : span.link || span.page ? INK.accent : marks.includes('code') && kind !== 'code' ? INK.codeText : color;
        ctx.fillStyle = ink;
        ctx.fillText(piece.text, x + at, base);
        // A space is marked too between two words of the same span: a link is one line under it, not one a word.
        const marked = piece.text.trim() || line[index + 1]?.piece.span === span;
        const under = (span.link || span.page || marks.includes('underline')) && marked;
        const through = (done || marks.includes('strike')) && marked;
        if (under || through) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const at2 = under ? base + 3 : base - set.size * 0.3;
          ctx.moveTo(x + at, at2);
          ctx.lineTo(x + at + w, at2);
          ctx.stroke();
        }
      }
      y += lineHeight;
    }
    return y;
  };

  // The icon, and the title: its placeholder when it has none, as the editor shows it.
  if (page.icon) {
    ctx.font = `64px ${FONT}`;
    ctx.fillStyle = INK.text;
    ctx.fillText(page.icon, MARGIN - 4, y + 60);
    y += 82;
  }
  ctx.font = `700 40px ${FONT}`;
  const untitled = options.untitled ?? 'Untitled';
  const title: Span[] = [{ text: page.title || untitled, marks: ['bold'] }];
  for (const line of setLines(ctx, title, right - MARGIN, 40, 700)) {
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = page.title ? INK.text : INK.faint;
    ctx.fillText(line.map((l) => l.piece.text).join(''), MARGIN, y + 40);
    y += 48;
  }
  y += 18;

  // What is under a folded toggle is not shown; a numbered list counts at its own indent.
  let hiddenUnder: number | null = null;
  const counts: number[] = [];
  for (const b of page.blocks) {
    if (y >= bottom) break;
    const indent = b.indent ?? 0;
    if (hiddenUnder !== null) {
      if (indent > hiddenUnder) continue;
      hiddenUnder = null;
    }
    counts.length = indent + 1;
    if (b.type !== 'numbered') counts[indent] = 0;
    if (b.type === 'toggle' && b.folded) hiddenUnder = indent;
    drawBlock(b, MARGIN + indent * INDENT);
  }
  ctx.restore();

  function drawBlock(b: Block, x: number) {
    const set = b.type in SETS ? SETS[b.type as keyof typeof SETS] : SETS.paragraph;
    const mark = (draw: () => void, room = 24) => {
      draw();
      return x + room;
    };
    y += set.before + 2;
    switch (b.type) {
      case 'paragraph':
      case 'heading1':
      case 'heading2':
      case 'heading3':
        write(b.text, x, b.type);
        break;
      case 'bulleted':
      case 'numbered':
      case 'todo':
      case 'toggle': {
        const lineHeight = SETS.paragraph.size * SETS.paragraph.line;
        const middle = y + lineHeight / 2;
        const indent = b.indent ?? 0;
        const at = mark(() => {
          ctx.fillStyle = INK.text;
          if (b.type === 'bulleted') {
            ctx.font = `16px ${FONT}`;
            ctx.fillText('•', x + 6, middle + 6);
          } else if (b.type === 'numbered') {
            counts[indent] = (counts[indent] ?? 0) + 1;
            ctx.font = `16px ${FONT}`;
            ctx.fillText(`${counts[indent]}.`, x + 2, middle + 6);
          } else if (b.type === 'todo') {
            if (b.checked) {
              ctx.fillStyle = INK.accent;
              roundBox(ctx, x + 2, middle - 8, 16, 16, 3);
              ctx.fill();
              ctx.strokeStyle = INK.bg;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + 6, middle);
              ctx.lineTo(x + 9, middle + 3);
              ctx.lineTo(x + 14, middle - 4);
              ctx.stroke();
            } else {
              ctx.strokeStyle = INK.muted;
              ctx.lineWidth = 1.5;
              roundBox(ctx, x + 2, middle - 8, 16, 16, 3);
              ctx.stroke();
            }
          } else {
            ctx.beginPath();
            if (b.folded) {
              ctx.moveTo(x + 6, middle - 5);
              ctx.lineTo(x + 12, middle);
              ctx.lineTo(x + 6, middle + 5);
            } else {
              ctx.moveTo(x + 4, middle - 3);
              ctx.lineTo(x + 14, middle - 3);
              ctx.lineTo(x + 9, middle + 3);
            }
            ctx.closePath();
            ctx.fill();
          }
        }, 26);
        write(b.text, at, 'paragraph', INK.text, b.type === 'todo' && !!b.checked);
        break;
      }
      case 'quote': {
        const top = y;
        write(b.text, x + 17, 'quote');
        ctx.fillStyle = INK.text;
        ctx.fillRect(x, top + 2, 3, y - top - 4);
        y += 4;
        break;
      }
      case 'callout': {
        const top = y + 4;
        const icon = b.icon ? 30 : 0;
        // Set first out of sight, to know how tall its box is.
        const lines = setLines(ctx, b.text, right - x - 32 - icon, 16, 400).length || 1;
        const h = Math.min(lines * 25.6 + 24, bottom - top);
        ctx.fillStyle = INK.callout;
        roundBox(ctx, x, top, right - x, h, 10);
        ctx.fill();
        if (b.icon) {
          ctx.font = `18px ${FONT}`;
          ctx.fillText(b.icon, x + 12, top + 32);
        }
        y = top + 12;
        write(b.text, x + 16 + icon, 'paragraph');
        y = top + h + 4;
        break;
      }
      case 'code': {
        const lines = plainText(b.text).split('\n');
        const lineHeight = SETS.code.size * SETS.code.line;
        const h = Math.min(lines.length * lineHeight + 28, bottom - y);
        ctx.fillStyle = INK.code;
        roundBox(ctx, x, y, right - x, h, 10);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 16, y, right - x - 32, h);
        ctx.clip();
        ctx.font = `${SETS.code.size}px ${MONO}`;
        ctx.fillStyle = INK.text;
        lines.forEach((line, i) => ctx.fillText(line, x + 16, y + 14 + i * lineHeight + SETS.code.size * 1.1));
        ctx.restore();
        y += h + 6;
        break;
      }
      case 'divider':
        ctx.fillStyle = INK.line;
        ctx.fillRect(x, y + 12, right - x, 1);
        y += 24;
        break;
      case 'image': {
        const room = (right - x) * ((b.width ?? 100) / 100);
        const loaded = b.src ? options.images?.(b.src) : undefined;
        const h = Math.min(loaded ? (room * loaded.height) / loaded.width : room * 0.5, bottom - y);
        const left = x + (right - x - room) / 2;
        if (loaded) {
          ctx.save();
          roundBox(ctx, left, y, room, h, 6);
          ctx.clip();
          ctx.drawImage(loaded.image, left, y, room, (room * loaded.height) / loaded.width);
          ctx.restore();
        } else {
          ctx.fillStyle = INK.callout;
          roundBox(ctx, left, y, room, h, 6);
          ctx.fill();
        }
        y += h + 8;
        break;
      }
      case 'page': {
        const to = b.page ? titles.get(b.page) : undefined;
        write([{ text: `${to?.icon ?? '📄'} ` }, { text: to?.title || untitled, marks: ['underline'] }], x, 'paragraph');
        break;
      }
      case 'embed':
      case 'database': {
        // A file or a database: a box with its name, as much as fits.
        const h = Math.min(b.type === 'database' ? 36 + Math.min(b.table?.rows.length ?? 0, 5) * 32 : 64, bottom - y);
        ctx.strokeStyle = INK.line;
        ctx.lineWidth = 1;
        roundBox(ctx, x, y + 4, right - x, h, 8);
        ctx.stroke();
        if (b.type === 'database' && b.table) {
          const columns = b.table.columns.slice(0, 4);
          const each = (right - x) / Math.max(columns.length, 1);
          ctx.font = `600 13px ${FONT}`;
          ctx.fillStyle = INK.muted;
          columns.forEach((c, i) => ctx.fillText(c.name, x + 12 + i * each, y + 27));
          ctx.font = `14px ${FONT}`;
          ctx.fillStyle = INK.text;
          b.table.rows.slice(0, 5).forEach((row, r) => {
            const top = y + 4 + 36 + r * 32;
            if (top + 32 > y + 4 + h) return;
            ctx.fillStyle = INK.line;
            ctx.fillRect(x, top, right - x, 1);
            ctx.fillStyle = INK.text;
            columns.forEach((c, i) => ctx.fillText(String(row.cells[c.id] ?? '').slice(0, 30), x + 12 + i * each, top + 21));
          });
        } else {
          ctx.font = `14px ${FONT}`;
          ctx.fillStyle = INK.muted;
          ctx.fillText((plainText(b.text) || b.src || '').slice(0, 80), x + 16, y + 40);
        }
        y += h + 10;
        break;
      }
    }
  }
}
