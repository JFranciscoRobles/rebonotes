# Databases

A database is a table in a page: columns of a kind, and rows. Type `/database` for a table, or `/board` for a board of cards by status.

## Columns

| Kind | What a cell is |
| --- | --- |
| Text | Any text. |
| Number | A number: `1,200`, `$30` and `15%` are read as numbers. |
| Select | One of the column's choices, shown in colour; a new one is added to them. |
| Checkbox | Ticked or not. |
| Date | A day, as `2026-10-28`. |
| Formula | What a formula gives for the row. |

The menu of a column (its icon) changes its kind, sorts the rows by it, moves it, or deletes it. A cell is edited where it is: Enter goes down a row (and makes one after the last), Tab across.

## Formulas

Formulas are worked out by Rebosheets' engine, as a spreadsheet works them out: each row a row of a sheet, `[Price]` the cell of the column Price in the same row. Every function of a spreadsheet can be used.

```
=[Price]*[Units]
=IF([Paid], "paid", TEXT([Price]*[Units], "$#,##0.00"))
=DATEDIF([Start], [Due], "d")
```

A column that is not there gives `#REF!`.

## The board

A board shows the rows as cards in columns, one for each choice of a select column (Group by chooses which). Drag a card to another column to change its choice, or add one in a column.

## As Markdown

A database is written as a table, as GitHub writes one, with what its columns are in a comment before it. The values of formulas are written too, so that the table reads right anywhere.

```md
<!-- rebonotes:database {"columns":[{"name":"Item","type":"text"},{"name":"Price","type":"number"},{"name":"Units","type":"number"},{"name":"Total","type":"formula","formula":"=[Price]*[Units]"}]} -->
| Item | Price | Units | Total |
| --- | ---: | ---: | ---: |
| Paper | 12.5 | 4 | 50 |
```

## As code

```ts
import { addColumn, addRow, computeFormulas, createTable, setCell } from '@rebonotes/core';

let table = addColumn(createTable('Item'), { name: 'Price', type: 'number' });
const { table: next, row } = addRow(table);
table = setCell(next, row.id, table.columns[1].id, '12.5');
```

## Functions {#functions}

<!-- functions -->
