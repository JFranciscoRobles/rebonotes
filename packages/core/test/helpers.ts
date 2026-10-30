// Blocks get new ids each time Markdown is read, and so do the rows and
// columns of a database: what is compared is the rest, the cells by the names
// of their columns.

import type { Table } from '../src';

function byNames(table: Table) {
  const name = (id?: string) => table.columns.find((c) => c.id === id)?.name;
  return {
    ...table,
    columns: table.columns.map(({ id: _id, ...c }) => c),
    rows: table.rows.map((r) => Object.fromEntries(Object.entries(r.cells).map(([k, v]) => [name(k), v]))),
    groupBy: name(table.groupBy),
    sort: table.sort && { ...table.sort, column: name(table.sort.column) },
  };
}

export function withoutIds<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, v) => {
      if (key === 'table' && v && Array.isArray(v.columns)) return byNames(v);
      return key === 'id' && typeof v === 'string' && v.length === 10 ? undefined : v;
    }),
  );
}
