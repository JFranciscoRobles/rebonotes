// Databases: a table in a page, with columns of a kind each (text, a number,
// a choice, a tick, a date, a formula) and rows, shown as a table or as a
// board of cards. What is done to them gives a new table. Formulas are worked
// out by Rebosheets' engine, as a spreadsheet works them out: each row a row
// of a sheet, each column a column, `[Price]` the cell of the column Price in
// the same row, so that every function of a spreadsheet can be used.
//
// As Markdown a database is a table, as GitHub writes one, with what its
// columns are in a comment before it, so that it reads as a table anywhere.

import { cellName, createWorkbook, displayText, getCell, isError, recalculate, setInput } from '@rebosheets/core';
import { type CellValue, type Column, type ColumnType, newId, type Row, type Table } from './model';

/** A column put in, at the end or at an index. */
export function addColumn(table: Table, column: Omit<Column, 'id'> & { id?: string }, at = table.columns.length): Table {
  const columns = table.columns.slice();
  columns.splice(at, 0, { ...column, id: column.id ?? newId() });
  return { ...table, columns };
}

/** A column changed: its name, kind, choices or formula. The cells of a column that changes kind are read again as the new kind. */
export function updateColumn(table: Table, id: string, patch: Partial<Omit<Column, 'id'>>): Table {
  const old = table.columns.find((c) => c.id === id);
  if (!old) return table;
  const column = { ...old, ...patch };
  for (const key of Object.keys(column) as (keyof Column)[]) if (column[key] === undefined) delete column[key];
  let rows = table.rows;
  if (patch.type && patch.type !== old.type) {
    rows = rows.map((row) => (id in row.cells ? { ...row, cells: withCell(row.cells, id, convert(row.cells[id], patch.type!)) } : row));
    if (patch.type === 'select' && !column.options) column.options = [...new Set(rows.map((r) => r.cells[id]).filter((v): v is string => typeof v === 'string' && !!v))];
  }
  return { ...table, columns: table.columns.map((c) => (c.id === id ? column : c)), rows };
}

/** A column taken out, with its cells. */
export function removeColumn(table: Table, id: string): Table {
  const out: Table = { ...table, columns: table.columns.filter((c) => c.id !== id), rows: table.rows.map((r) => (id in r.cells ? { ...r, cells: withCell(r.cells, id, undefined) } : r)) };
  if (out.groupBy === id) delete out.groupBy;
  if (out.sort?.column === id) delete out.sort;
  return out;
}

/** A column moved to another place. */
export function moveColumn(table: Table, id: string, to: number): Table {
  const column = table.columns.find((c) => c.id === id);
  if (!column) return table;
  const columns = table.columns.filter((c) => c.id !== id);
  columns.splice(Math.max(0, Math.min(to, columns.length)), 0, column);
  return { ...table, columns };
}

/** A row put in, at the end or at an index, with cells already filled when given. */
export function addRow(table: Table, cells: Record<string, CellValue> = {}, at = table.rows.length): { table: Table; row: Row } {
  const row: Row = { id: newId(), cells };
  const rows = table.rows.slice();
  rows.splice(at, 0, row);
  return { table: { ...table, rows }, row };
}

/** A row taken out. */
export const removeRow = (table: Table, id: string): Table => ({ ...table, rows: table.rows.filter((r) => r.id !== id) });

/** A row moved to before another (to the end with none). */
export function moveRow(table: Table, id: string, before?: string): Table {
  const row = table.rows.find((r) => r.id === id);
  if (!row || id === before) return table;
  const rows = table.rows.filter((r) => r.id !== id);
  const at = before ? rows.findIndex((r) => r.id === before) : -1;
  rows.splice(at < 0 ? rows.length : at, 0, row);
  return { ...table, rows };
}

const withCell = (cells: Record<string, CellValue>, column: string, value: CellValue | undefined): Record<string, CellValue> => {
  const next = { ...cells };
  if (value === undefined || value === '') delete next[column];
  else next[column] = value;
  return next;
};

/** A cell set: read as the kind of its column (a number from "1,200", a tick from "yes"); empty takes it away. */
export function setCell(table: Table, row: string, column: string, value: CellValue | undefined): Table {
  const col = table.columns.find((c) => c.id === column);
  if (!col || col.type === 'formula') return table;
  const typed = value === undefined ? undefined : convert(value, col.type);
  let columns = table.columns;
  // A choice not there yet is added to the column's choices.
  if (col.type === 'select' && typeof typed === 'string' && typed && !col.options?.includes(typed))
    columns = table.columns.map((c) => (c.id === column ? { ...c, options: [...(c.options ?? []), typed] } : c));
  return { ...table, columns, rows: table.rows.map((r) => (r.id === row ? { ...r, cells: withCell(r.cells, column, typed) } : r)) };
}

/** A value read as a kind of column. */
export function convert(value: CellValue | undefined, type: ColumnType): CellValue | undefined {
  if (value === undefined || value === '') return undefined;
  switch (type) {
    case 'number': {
      if (typeof value === 'number') return value;
      if (typeof value === 'boolean') return value ? 1 : 0;
      const n = Number(value.replace(/[,\s$€%]/g, ''));
      return Number.isFinite(n) ? n : undefined;
    }
    case 'checkbox':
      return typeof value === 'boolean' ? value : typeof value === 'number' ? value !== 0 : /^(x|yes|sí|si|true|1|✓|✔)$/i.test(value.trim()) || undefined;
    case 'date': {
      const text = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      const day = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (day) return `${day[3]}-${day[2].padStart(2, '0')}-${day[1].padStart(2, '0')}`;
      const t = Date.parse(text);
      return Number.isNaN(t) ? undefined : new Date(t).toISOString().slice(0, 10);
    }
    default:
      return typeof value === 'boolean' ? (value ? 'Yes' : '') || undefined : String(value);
  }
}

/** How a table is shown: grouped by a column, sorted by one, as a table or a board. */
export function setView(table: Table, patch: Partial<Pick<Table, 'view' | 'groupBy' | 'sort'>>): Table {
  const next = { ...table, ...patch };
  for (const key of ['view', 'groupBy', 'sort'] as const) if (next[key] === undefined) delete next[key];
  return next;
}

/**
 * What the formula columns give, row by row, worked out by Rebosheets'
 * engine: the value and the text as a spreadsheet would show it, or the
 * error ("#NAME?", "#REF!" for a column that is not there).
 */
export function computeFormulas(table: Table): Map<string, Map<string, { value: CellValue; text: string }>> {
  const out = new Map<string, Map<string, { value: CellValue; text: string }>>();
  const formulas = table.columns.filter((c) => c.type === 'formula' && c.formula);
  if (!formulas.length || !table.rows.length) return out;
  const book = createWorkbook(['Table']);
  const index = new Map(table.columns.map((c, i) => [c.name.toLowerCase(), i]));
  table.rows.forEach((row, r) => {
    table.columns.forEach((column, c) => {
      if (column.type === 'formula') {
        if (!column.formula) return;
        // [Column] is the cell of that column in this row; a column that is not there is an error.
        const text = column.formula
          .trim()
          .replace(/^=?/, '=')
          .replace(/\[([^\]]+)\]/g, (_m, name: string) => {
            const at = index.get(name.trim().toLowerCase());
            return at === undefined ? '#REF!' : cellName(r, at);
          });
        setInput(book, 0, r, c, text);
        return;
      }
      const value = row.cells[column.id];
      if (value === undefined) return;
      setInput(
        book,
        0,
        r,
        c,
        typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : typeof value === 'number' ? String(value) : column.type === 'text' || column.type === 'select' ? `'${value}` : value,
      );
    });
  });
  recalculate(book);
  table.rows.forEach((row, r) => {
    const cells = new Map<string, { value: CellValue; text: string }>();
    for (const column of formulas) {
      const c = table.columns.indexOf(column);
      const cell = getCell(book.sheets[0], r, c);
      const raw = cell?.value;
      const value: CellValue = isError(raw) ? raw.code : (raw ?? '');
      cells.set(column.id, { value, text: displayText(book, cell) });
    }
    out.set(row.id, cells);
  });
  return out;
}

/** The rows in the order shown: sorted by the column the table says, empty cells last. */
export function sortedRows(table: Table, formulas = computeFormulas(table)): Row[] {
  const sort = table.sort;
  if (!sort) return table.rows;
  const column = table.columns.find((c) => c.id === sort.column);
  if (!column) return table.rows;
  const sortValue = (row: Row): CellValue | undefined => (column.type === 'formula' ? formulas.get(row.id)?.get(column.id)?.value : row.cells[column.id]);
  return table.rows
    .map((row, i) => ({ row, i, v: sortValue(row) }))
    .sort((a, b) => {
      if (a.v === undefined || a.v === '') return b.v === undefined || b.v === '' ? a.i - b.i : 1;
      if (b.v === undefined || b.v === '') return -1;
      const order = typeof a.v === 'number' && typeof b.v === 'number' ? a.v - b.v : String(a.v).localeCompare(String(b.v), undefined, { numeric: true, sensitivity: 'base' });
      return (sort.descending ? -order : order) || a.i - b.i;
    })
    .map((x) => x.row);
}

/** The text a cell shows. */
export function cellText(table: Table, row: Row, column: Column, formulas?: ReturnType<typeof computeFormulas>): string {
  if (column.type === 'formula') return (formulas ?? computeFormulas(table)).get(row.id)?.get(column.id)?.text ?? '';
  const value = row.cells[column.id];
  if (value === undefined) return '';
  if (column.type === 'checkbox') return value ? '✓' : '';
  return String(value);
}

// ——— As Markdown ———

const MARKER = 'rebonotes:database';
const escapeCell = (text: string) => text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

/** A table as Markdown: what its columns are in a comment, and the table as GitHub writes one. */
export function tableToMarkdown(table: Table, pad = ''): string {
  const meta = {
    columns: table.columns.map(({ id: _id, ...c }) => c),
    ...(table.view && table.view !== 'table' ? { view: table.view } : {}),
    ...(table.groupBy ? { groupBy: table.columns.find((c) => c.id === table.groupBy)?.name } : {}),
    ...(table.sort ? { sort: { column: table.columns.find((c) => c.id === table.sort!.column)?.name, ...(table.sort.descending ? { descending: true } : {}) } } : {}),
  };
  const formulas = computeFormulas(table);
  const lines = [`<!-- ${MARKER} ${JSON.stringify(meta).replace(/--/g, '\\u002d\\u002d')} -->`];
  lines.push(`| ${table.columns.map((c) => escapeCell(c.name) || ' ').join(' | ')} |`);
  lines.push(`| ${table.columns.map((c) => (c.type === 'number' || c.type === 'formula' ? '---:' : '---')).join(' | ')} |`);
  for (const row of table.rows) {
    lines.push(`| ${table.columns.map((c) => (c.type === 'checkbox' ? (row.cells[c.id] ? '[x]' : '[ ]') : escapeCell(cellText(table, row, c, formulas)))).join(' | ')} |`);
  }
  return lines.map((line) => pad + line).join('\n');
}

/** The cells of a line of a Markdown table. */
function cellsOf(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out: string[] = [];
  let cell = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && i + 1 < body.length) {
      cell += body[++i];
      continue;
    }
    if (body[i] === '|') {
      out.push(cell.trim());
      cell = '';
    } else cell += body[i];
  }
  out.push(cell.trim());
  return out.map((c) => c.replace(/<br\s*\/?>/gi, '\n'));
}

/** Whether a line starts a database: the comment, or a Markdown table. */
export const startsTable = (line: string): boolean => line.trim().startsWith(`<!-- ${MARKER}`) || /^\s*\|.*\|\s*$/.test(line);

/**
 * A database read from Markdown lines, from `start`: the comment (when there
 * is one) and the table. Gives the table and the line after it, or nothing
 * when there is no table there.
 */
export function readTable(lines: string[], start: number): { table: Table; end: number } | undefined {
  let i = start;
  let meta: { columns?: Omit<Column, 'id'>[]; view?: Table['view']; groupBy?: string; sort?: { column?: string; descending?: boolean } } = {};
  const comment = lines[i]?.trim().match(new RegExp(`^<!-- ${MARKER} (.*) -->$`));
  if (comment) {
    try {
      meta = JSON.parse(comment[1]);
    } catch {
      // A table without what its columns are: all text.
    }
    i++;
  }
  if (!/^\s*\|.*\|\s*$/.test(lines[i] ?? '') || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) return undefined;
  const names = cellsOf(lines[i]);
  i += 2;
  const columns: Column[] = names.map((name, n) => {
    const known = meta.columns?.[n];
    return { id: newId(), name, type: known?.type ?? 'text', ...(known?.options ? { options: known.options } : {}), ...(known?.formula ? { formula: known.formula } : {}) };
  });
  const rows: Row[] = [];
  while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
    const cells = cellsOf(lines[i]);
    const row: Row = { id: newId(), cells: {} };
    columns.forEach((column, n) => {
      if (column.type === 'formula') return;
      const text = cells[n] ?? '';
      const value = column.type === 'checkbox' ? /^\[[xX]\]$/.test(text) || convert(text, 'checkbox') : convert(text, column.type);
      if (value !== undefined && value !== false) row.cells[column.id] = value;
    });
    rows.push(row);
    i++;
  }
  const byName = (name?: string) => columns.find((c) => c.name === name)?.id;
  const table: Table = { columns, rows, view: meta.view ?? 'table' };
  const group = byName(meta.groupBy);
  if (group) table.groupBy = group;
  const sort = byName(meta.sort?.column);
  if (sort) table.sort = { column: sort, ...(meta.sort?.descending ? { descending: true } : {}) };
  return { table, end: i };
}
