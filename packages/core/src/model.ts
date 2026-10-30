// What a workspace is: pages, each with its title, its icon, the page it sits
// under, and its blocks one after another. A block is a paragraph, a heading,
// an item of a list, a task, a quote, a callout, code, a line, an image, a
// toggle, or a link to a page under it. The blocks of a page are a flat list:
// what is under an item or a toggle is the blocks after it set further in
// (`indent`), as Markdown writes them. Everything is immutable: a change gives
// a new page, with the blocks it did not touch the same objects as before.

/** The ways a piece of text can be marked. */
export type Mark = 'bold' | 'italic' | 'underline' | 'strike' | 'code';

/** A piece of text with the same marks throughout. */
export interface Span {
  text: string;
  marks?: Mark[];
  /** An address the text goes to. */
  link?: string;
  /** The id of a page the text goes to. */
  page?: string;
}

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulleted'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'callout'
  | 'code'
  | 'toggle'
  | 'divider'
  | 'image'
  | 'page'
  | 'embed'
  | 'database';

export interface Block {
  id: string;
  type: BlockType;
  /** The text; empty for a line, an image and a page. */
  text: Span[];
  /** How far in it is set: what is under an item or a toggle. */
  indent?: number;
  /** A task that is done. */
  checked?: boolean;
  /** The language of code. */
  language?: string;
  /** The emoji of a callout. */
  icon?: string;
  /** The address of an image. */
  src?: string;
  /** The page a page block goes to. */
  page?: string;
  /** A toggle that is closed: what is under it is not shown. */
  folded?: boolean;
  /** The rows and columns of a database. */
  table?: Table;
  /** How wide an image or a file is shown, as a percentage of the page; the whole width when left out. */
  width?: number;
  /** How tall a file is shown, in pixels; as its viewer comes when left out. */
  height?: number;
}

/** The kinds of column a database has. */
export type ColumnType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'formula';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  /** The choices of a select column. */
  options?: string[];
  /** What a formula column works out, as a spreadsheet writes it, the other columns by their names in brackets: "=[Price]*[Units]". */
  formula?: string;
}

/** A cell: text, a number, a tick, or a date as "2026-10-28". */
export type CellValue = string | number | boolean;

export interface Row {
  id: string;
  cells: Record<string, CellValue>;
}

export interface Table {
  columns: Column[];
  rows: Row[];
  /** How it is shown: a table, or a board of cards in columns, one for each choice of `groupBy`. */
  view?: 'table' | 'board';
  groupBy?: string;
  /** The column the rows are sorted by, and which way. */
  sort?: { column: string; descending?: boolean };
}

export interface Page {
  id: string;
  title: string;
  /** An emoji. */
  icon?: string;
  /** The page it is under; none for a page at the top. */
  parent?: string;
  blocks: Block[];
  /** When it was made and last changed, as milliseconds since 1970. */
  created: number;
  updated: number;
}

export interface Workspace {
  /** Every page, in the order they are shown among their siblings. */
  pages: Page[];
}

/** A new table: a column of names and two empty rows. */
export function createTable(name = 'Name'): Table {
  return { columns: [{ id: newId(), name, type: 'text' }], rows: [0, 1].map(() => ({ id: newId(), cells: {} })), view: 'table' };
}

/** The types whose text is edited as text. */
export const TEXT_TYPES: ReadonlySet<BlockType> = new Set(['paragraph', 'heading1', 'heading2', 'heading3', 'bulleted', 'numbered', 'todo', 'quote', 'callout', 'code', 'toggle']);

/** The types that keep their type on the line after them when Enter is pressed. */
export const LIST_TYPES: ReadonlySet<BlockType> = new Set(['bulleted', 'numbered', 'todo']);

/** What has blocks under it, set further in. */
export const PARENT_TYPES: ReadonlySet<BlockType> = new Set(['bulleted', 'numbered', 'todo', 'toggle']);

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** A new id, short and unlikely to be the same as another. */
export function newId(): string {
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  let id = '';
  for (const b of bytes) id += ALPHABET[b % 36];
  return id;
}

/** A block of a type, with its text. */
export function createBlock(type: BlockType = 'paragraph', text: string | Span[] = '', extra: Partial<Block> = {}): Block {
  return { id: newId(), type, text: typeof text === 'string' ? (text ? [{ text }] : []) : text, ...extra };
}

/** A page with a title, and one empty paragraph when no blocks are given. */
export function createPage(title = '', extra: Partial<Page> = {}, now = Date.now()): Page {
  return { id: newId(), title, blocks: [createBlock()], created: now, updated: now, ...extra };
}

/** The plain text of some spans. */
export const plainText = (spans: readonly Span[]): string => spans.map((s) => s.text).join('');
