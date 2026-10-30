import { describe, expect, it } from 'vitest';
import {
  addColumn,
  addRow,
  blocksToMarkdown,
  cellText,
  computeFormulas,
  createBlock,
  createTable,
  markdownToBlocks,
  removeColumn,
  setCell,
  setView,
  sortedRows,
  type Table,
  updateColumn,
} from '../src';

function budget(): Table {
  let t = createTable('Item');
  t = { ...t, rows: [] };
  t = addColumn(t, { name: 'Price', type: 'number' });
  t = addColumn(t, { name: 'Units', type: 'number' });
  t = addColumn(t, { name: 'Total', type: 'formula', formula: '=[Price]*[Units]' });
  t = addColumn(t, { name: 'Paid', type: 'checkbox' });
  t = addColumn(t, { name: 'State', type: 'select', options: ['Open', 'Done'] });
  const [item, price, units, , paid, state] = t.columns;
  for (const [name, p, u, done, s] of [
    ['Paper', '12.5', '4', true, 'Done'],
    ['Ink', '30', '2', false, 'Open'],
    ['Pens', '1,200', '1', false, 'Waiting'],
  ] as const) {
    const made = addRow(t);
    t = made.table;
    t = setCell(t, made.row.id, item.id, name);
    t = setCell(t, made.row.id, price.id, p);
    t = setCell(t, made.row.id, units.id, u);
    t = setCell(t, made.row.id, paid.id, done);
    t = setCell(t, made.row.id, state.id, s);
  }
  return t;
}

describe('databases', () => {
  it('read cells as the kind of their column', () => {
    const t = budget();
    const [, price, , , paid, state] = t.columns;
    expect(t.rows.map((r) => r.cells[price.id])).toEqual([12.5, 30, 1200]);
    expect(t.rows.map((r) => r.cells[paid.id] ?? false)).toEqual([true, false, false]);
    // A choice not there yet is added.
    expect(t.columns.find((c) => c.id === state.id)?.options).toEqual(['Open', 'Done', 'Waiting']);
  });

  it('work out formulas with the spreadsheet engine', () => {
    const t = budget();
    const total = t.columns[3];
    const formulas = computeFormulas(t);
    expect(t.rows.map((r) => formulas.get(r.id)?.get(total.id)?.value)).toEqual([50, 60, 1200]);
    const fancy = updateColumn(t, total.id, { formula: '=IF([Paid], "paid", TEXT([Price]*[Units], "0.00"))' });
    expect(fancy.rows.map((r) => cellText(fancy, r, fancy.columns[3]))).toEqual(['paid', '60.00', '1200.00']);
    const broken = updateColumn(t, total.id, { formula: '=[Nope]+1' });
    expect(cellText(broken, broken.rows[0], broken.columns[3])).toBe('#REF!');
  });

  it('sort rows, empty last', () => {
    let t = budget();
    const made = addRow(t);
    t = made.table;
    t = setView(t, { sort: { column: t.columns[3].id, descending: true } });
    expect(sortedRows(t).map((r) => cellText(t, r, t.columns[0]))).toEqual(['Pens', 'Ink', 'Paper', '']);
  });

  it('change a column of kind, and take one out', () => {
    let t = budget();
    t = updateColumn(t, t.columns[1].id, { type: 'text' });
    expect(t.rows[0].cells[t.columns[1].id]).toBe('12.5');
    const gone = t.columns[5].id;
    t = setView(t, { view: 'board', groupBy: gone });
    t = removeColumn(t, gone);
    expect(t.groupBy).toBeUndefined();
    expect(t.rows.every((r) => !(gone in r.cells))).toBe(true);
  });

  it('go to Markdown as a table and come back', () => {
    const t = setView(budget(), { view: 'board', groupBy: budget().columns[5].id });
    const md = blocksToMarkdown([createBlock('paragraph', 'Before'), createBlock('database', [], { table: { ...t, groupBy: t.columns[5].id } }), createBlock('paragraph', 'After')]);
    expect(md).toContain('| Item | Price | Units | Total | Paid | State |');
    expect(md).toContain('| Paper | 12.5 | 4 | 50 | [x] | Done |');
    const blocks = markdownToBlocks(md);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'database', 'paragraph']);
    const back = blocks[1].table!;
    expect(back.columns.map((c) => [c.name, c.type])).toEqual(t.columns.map((c) => [c.name, c.type]));
    expect(back.columns[3].formula).toBe('=[Price]*[Units]');
    expect(back.view).toBe('board');
    expect(back.groupBy).toBe(back.columns[5].id);
    expect(computeFormulas(back).get(back.rows[1].id)?.get(back.columns[3].id)?.value).toBe(60);
  });

  it('reads a plain Markdown table from elsewhere', () => {
    const [block] = markdownToBlocks('| Name | Age |\n|---|---|\n| Ana | 31 |\n| Ben \\| Jr | 4 |');
    expect(block.type).toBe('database');
    expect(block.table!.rows.map((r) => Object.values(r.cells))).toEqual([
      ['Ana', '31'],
      ['Ben | Jr', '4'],
    ]);
  });

  it('writes files put in a page as Obsidian does', () => {
    const md = blocksToMarkdown([createBlock('embed', 'Budget.xlsx', { src: 'files/Budget 2026.xlsx' })]);
    expect(md).toBe('![[files/Budget 2026.xlsx|Budget.xlsx]]');
    expect(markdownToBlocks(md)[0]).toMatchObject({ type: 'embed', src: 'files/Budget 2026.xlsx', text: [{ text: 'Budget.xlsx' }] });
    expect(markdownToBlocks('![[deck.reboslides]]')[0]).toMatchObject({ type: 'embed', src: 'deck.reboslides', text: [{ text: 'deck.reboslides' }] });
  });
});

describe('sizes of images and files', () => {
  it('are kept in Markdown', () => {
    const md = blocksToMarkdown([createBlock('image', 'a cat', { src: 'cat.png', width: 60 }), createBlock('embed', 'Budget.xlsx', { src: 'b.xlsx', width: 80, height: 520 })]);
    expect(md).toBe('![a cat|60%](cat.png)\n\n![[b.xlsx|Budget.xlsx|80%x520]]');
    const [image, file] = markdownToBlocks(md);
    expect(image).toMatchObject({ type: 'image', src: 'cat.png', width: 60, text: [{ text: 'a cat' }] });
    expect(file).toMatchObject({ type: 'embed', src: 'b.xlsx', width: 80, height: 520, text: [{ text: 'Budget.xlsx' }] });
    expect(markdownToBlocks('![[deck.reboslides||100%x600]]')[0]).toMatchObject({ height: 600, text: [{ text: 'deck.reboslides' }] });
  });
});
