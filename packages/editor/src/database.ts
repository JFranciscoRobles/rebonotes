// A database drawn in a page: its rows as a table, each cell edited in place
// as the kind of its column (text, a number, a choice, a tick, a date) and
// what formulas give beside them; or as a board, a column of cards for each
// choice of a select column, cards dragged from one to another. Each change
// gives a new table to the page, which draws the database again and gives the
// focus back to the cell it was in.

import {
  addColumn,
  addRow,
  cellText,
  type Column,
  type ColumnType,
  computeFormulas,
  moveColumn,
  removeColumn,
  removeRow,
  type Row,
  setCell,
  setView,
  sortedRows,
  type Table,
  updateColumn,
} from '@rebonotes/core';
import type { Strings } from './i18n';
import { icon } from './icons';
import { type MenuItem, openMenu } from './menu';

export interface DatabaseHost {
  readonly root: HTMLElement;
  readonly strings: Strings;
  /** The table changed; `focus` is the cell (`row:column`) or the control to give the focus back to. */
  change(table: Table, focus?: string): void;
}

const KINDS: { type: ColumnType; icon: string; label: keyof Strings }[] = [
  { type: 'text', icon: 'text', label: 'colText' },
  { type: 'number', icon: 'number', label: 'colNumber' },
  { type: 'select', icon: 'select', label: 'colSelect' },
  { type: 'checkbox', icon: 'todo', label: 'colCheckbox' },
  { type: 'date', icon: 'calendar', label: 'colDate' },
  { type: 'formula', icon: 'formula', label: 'colFormula' },
];

/** The colours choices are shown in, by their place among the choices. */
const TAGS = ['#f1e9e5', '#fde9d6', '#fbf3c6', '#e3f2e1', '#e1edfa', '#ece5fa', '#fae3ee', '#e9e7e3'];
const TAG_TEXT = ['#6b4f43', '#8a4d17', '#7a6211', '#2f6a35', '#245a8f', '#5b3d99', '#99335f', '#5f5b55'];

/** The card of the board whose title is typed in once it is drawn: a row just made. */
let editing: string | undefined;

export function renderDatabase(doc: Document, table: Table, host: DatabaseHost): HTMLElement {
  const t = host.strings;
  const box = doc.createElement('div');
  box.className = 'rn-db';
  if (editing) box.dataset.editing = editing;
  editing = undefined;
  box.contentEditable = 'false';
  const formulas = computeFormulas(table);
  const view = table.view ?? 'table';
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (className: string, label: string, ...content: (Node | string)[]) => {
    const b = el('button', className);
    b.type = 'button';
    b.title = label;
    b.setAttribute('aria-label', label);
    b.append(...content);
    return b;
  };
  const selects = table.columns.filter((c) => c.type === 'select');
  const groupBy = table.columns.find((c) => c.id === table.groupBy && c.type === 'select') ?? selects[0];

  // The bar: the views, the column the board goes by, and a new row.
  const bar = el('div', 'rn-db-bar');
  const tabs = el('div', 'rn-db-views');
  for (const [id, label, iconName] of [
    ['table', t.viewTable, 'table'],
    ['board', t.viewBoard, 'board'],
  ] as const) {
    const tab = button('rn-db-view', label, icon(doc, iconName, 16), label);
    tab.setAttribute('aria-pressed', String(view === id));
    tab.dataset.focus = `view:${id}`;
    tab.addEventListener('click', () => {
      if (id === 'board' && !groupBy) {
        // A board goes by a choice: a column of choices is made for it.
        const made = addColumn(table, { name: t.colStatus, type: 'select', options: [t.statusTodo, t.statusDoing, t.statusDone] });
        host.change(setView(made, { view: 'board', groupBy: made.columns[made.columns.length - 1].id }), `view:${id}`);
      } else host.change(setView(table, { view: id, ...(id === 'board' && groupBy ? { groupBy: groupBy.id } : {}) }), `view:${id}`);
    });
    tabs.append(tab);
  }
  bar.append(tabs);
  if (view === 'board' && selects.length > 1) {
    const pick = el('select', 'rn-db-group');
    pick.setAttribute('aria-label', t.groupBy);
    for (const column of selects) {
      const option = el('option', '', column.name);
      option.value = column.id;
      pick.append(option);
    }
    pick.value = groupBy?.id ?? '';
    pick.addEventListener('change', () => host.change(setView(table, { groupBy: pick.value })));
    bar.append(pick);
  }
  const add = button('rn-db-new', t.newRow, icon(doc, 'plus', 16), t.newRow);
  add.dataset.focus = 'new';
  add.addEventListener('click', () => {
    const made = addRow(table, view === 'board' && groupBy?.options?.[0] ? { [groupBy.id]: groupBy.options[0] } : {});
    if (view === 'board') editing = made.row.id;
    host.change(made.table, `${made.row.id}:${table.columns[0]?.id}`);
  });
  bar.append(add);
  box.append(bar);

  const tag = (column: Column, value: string) => {
    const at = Math.max(0, column.options?.indexOf(value) ?? 0) % TAGS.length;
    const span = el('span', 'rn-tag', value);
    span.style.setProperty('--tag', TAGS[at]);
    span.style.setProperty('--tag-text', TAG_TEXT[at]);
    return span;
  };

  /** A cell edited as the kind of its column. */
  const cell = (row: Row, column: Column): HTMLElement => {
    const key = `${row.id}:${column.id}`;
    const value = row.cells[column.id];
    const set = (next: string | boolean | undefined, focus = key) => host.change(setCell(table, row.id, column.id, next), focus);
    switch (column.type) {
      case 'checkbox': {
        const input = el('input', 'rn-db-check');
        input.type = 'checkbox';
        input.checked = !!value;
        input.dataset.focus = key;
        input.setAttribute('aria-label', column.name);
        input.addEventListener('change', () => set(input.checked || undefined));
        return input;
      }
      case 'select': {
        const pick = el('button', 'rn-db-select');
        pick.type = 'button';
        pick.dataset.focus = key;
        if (typeof value === 'string' && value) pick.append(tag(column, value));
        pick.addEventListener('click', () => {
          const items: MenuItem[] = (column.options ?? []).map((option) => ({ id: option, label: option, run: () => set(option) }));
          items.push({
            id: '+',
            label: t.newOption,
            icon: 'plus',
            run: () => {
              const name = doc.defaultView?.prompt(t.newOption)?.trim();
              if (name) set(name);
            },
          });
          if (value) items.push({ id: '-', label: t.clearCell, icon: 'close', run: () => set(undefined) });
          openMenu(host.root, pick.getBoundingClientRect(), items, { ownKeys: true, className: 'rn-block-menu' });
        });
        return pick;
      }
      case 'formula': {
        const out = el('span', 'rn-db-formula', formulas.get(row.id)?.get(column.id)?.text ?? '');
        if (out.textContent?.startsWith('#')) out.classList.add('rn-db-error');
        return out;
      }
      default: {
        const input = el('input', `rn-db-input rn-db-${column.type}`);
        input.type = column.type === 'date' ? 'date' : 'text';
        input.value = value === undefined ? '' : String(value);
        input.dataset.focus = key;
        input.setAttribute('aria-label', column.name);
        if (column.type === 'number') input.inputMode = 'decimal';
        let done = false;
        const commit = (focus?: string) => {
          const next = input.value;
          if (done || next === (value === undefined ? '' : String(value))) return false;
          done = true;
          set(next || undefined, focus);
          return true;
        };
        // Kept as the focus leaves the cell, and the focus then goes where it was going (Tab, a click).
        input.addEventListener('focusout', (e) => commit((e.relatedTarget as HTMLElement | null)?.dataset?.focus ?? ''));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && view === 'board') {
            e.preventDefault();
            if (!commit()) input.blur();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            // Down a row, as in a spreadsheet; a new row after the last.
            const shown = sortedRows(table, formulas);
            const below = shown[shown.indexOf(row) + 1];
            if (below) {
              if (!commit(`${below.id}:${column.id}`)) box.querySelector<HTMLElement>(`[data-focus="${below.id}:${column.id}"]`)?.focus();
            } else {
              commit();
              const made = addRow(setCell(table, row.id, column.id, input.value || undefined));
              host.change(made.table, `${made.row.id}:${column.id}`);
            }
          } else if (e.key === 'Escape') {
            input.value = value === undefined ? '' : String(value);
            input.blur();
          }
        });
        return input;
      }
    }
  };

  const columnMenu = (column: Column, anchor: DOMRect) => {
    const items: MenuItem[] = KINDS.map((kind) => ({
      id: kind.type,
      label: t[kind.label],
      icon: kind.icon,
      section: t.colKind,
      run: () => {
        if (kind.type === column.type) return;
        const formula = kind.type === 'formula' ? (doc.defaultView?.prompt(t.formulaPrompt, column.formula ?? '=')?.trim() ?? '') : undefined;
        host.change(updateColumn(table, column.id, { type: kind.type, ...(formula !== undefined ? { formula } : {}) }));
      },
    }));
    if (column.type === 'formula') {
      items.push({
        id: 'formula',
        label: t.editFormula,
        icon: 'formula',
        run: () => {
          const formula = doc.defaultView?.prompt(t.formulaPrompt, column.formula ?? '=');
          if (formula !== null && formula !== undefined) host.change(updateColumn(table, column.id, { formula: formula.trim() }));
        },
      });
    }
    const at = table.columns.indexOf(column);
    items.push(
      { id: 'asc', label: t.sortAsc, icon: 'sortAsc', section: t.colActions, run: () => host.change(setView(table, { sort: { column: column.id } })) },
      { id: 'desc', label: t.sortDesc, icon: 'sortDesc', section: t.colActions, run: () => host.change(setView(table, { sort: { column: column.id, descending: true } })) },
    );
    if (table.sort?.column === column.id) items.push({ id: 'nosort', label: t.sortNone, icon: 'close', section: t.colActions, run: () => host.change(setView(table, { sort: undefined })) });
    if (at > 0) items.push({ id: 'left', label: t.moveLeft, icon: 'back', section: t.colActions, run: () => host.change(moveColumn(table, column.id, at - 1)) });
    if (at < table.columns.length - 1) items.push({ id: 'right', label: t.moveRight, icon: 'chevronRight', section: t.colActions, run: () => host.change(moveColumn(table, column.id, at + 1)) });
    if (table.columns.length > 1) items.push({ id: 'delete', label: t.deleteColumn, icon: 'trash', danger: true, section: t.colActions, run: () => host.change(removeColumn(table, column.id)) });
    openMenu(host.root, anchor, items, { ownKeys: true, className: 'rn-block-menu' });
  };

  if (view === 'table') {
    const scroll = el('div', 'rn-db-scroll');
    const grid = el('table', 'rn-db-table');
    const head = el('tr');
    for (const column of table.columns) {
      const th = el('th');
      th.dataset.type = column.type;
      const kind = KINDS.find((k) => k.type === column.type)!;
      const name = el('input', 'rn-db-name');
      name.value = column.name;
      name.dataset.focus = `col:${column.id}`;
      name.setAttribute('aria-label', t.colName);
      name.addEventListener('change', () => name.value.trim() && host.change(updateColumn(table, column.id, { name: name.value.trim() })));
      name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
      const more = button('rn-db-col', t.colOptions, icon(doc, kind.icon, 14));
      if (table.sort?.column === column.id) more.append(icon(doc, table.sort.descending ? 'sortDesc' : 'sortAsc', 14));
      more.addEventListener('click', () => columnMenu(column, more.getBoundingClientRect()));
      th.append(more, name);
      head.append(th);
    }
    const addCol = el('th', 'rn-db-addcol');
    const plus = button('rn-db-col', t.newColumn, icon(doc, 'plus', 16));
    plus.dataset.focus = 'newcol';
    plus.addEventListener('click', () => {
      const made = addColumn(table, { name: `${t.colText} ${table.columns.length + 1}`, type: 'text' });
      host.change(made, `col:${made.columns[made.columns.length - 1].id}`);
    });
    addCol.append(plus);
    head.append(addCol);
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    for (const row of sortedRows(table, formulas)) {
      const tr = el('tr');
      for (const column of table.columns) {
        const td = el('td');
        td.dataset.type = column.type;
        td.append(cell(row, column));
        tr.append(td);
      }
      const end = el('td', 'rn-db-rowend');
      const remove = button('rn-db-remove', t.deleteRow, icon(doc, 'trash', 14));
      remove.addEventListener('click', () => host.change(removeRow(table, row.id), 'new'));
      end.append(remove);
      tr.append(end);
      tbody.append(tr);
    }
    grid.append(thead, tbody);
    scroll.append(grid);
    box.append(scroll);
    return box;
  }

  // The board: a column for each choice, and one for the rows without.
  const board = el('div', 'rn-db-board');
  const titleCol = table.columns.find((c) => c.type === 'text') ?? table.columns[0];
  const lanes: (string | undefined)[] = [...(groupBy?.options ?? []), undefined];
  const rows = sortedRows(table, formulas);
  for (const lane of lanes) {
    const inLane = rows.filter((r) => (r.cells[groupBy!.id] ?? undefined) === lane || (lane === undefined && !groupBy!.options?.includes(String(r.cells[groupBy!.id] ?? ''))));
    if (lane === undefined && !inLane.length) continue;
    const col = el('div', 'rn-db-lane');
    const head = el('div', 'rn-db-lane-head');
    head.append(lane ? tag(groupBy!, lane) : el('span', 'rn-db-none', t.noValue), el('small', '', String(inLane.length)));
    col.append(head);
    col.dataset.lane = lane ?? '';
    for (const row of inLane) {
      const card = el('div', 'rn-db-card');
      card.dataset.row = row.id;
      // The title is text, typed in once it is clicked.
      const title = el('div', 'rn-db-card-title', cellText(table, row, titleCol, formulas) || t.untitled);
      if (!cellText(table, row, titleCol, formulas)) title.classList.add('rn-db-empty');
      title.dataset.focus = `${row.id}:${titleCol.id}`;
      title.tabIndex = 0;
      const edit = () => {
        const input = cell(row, titleCol);
        input.classList.add('rn-db-card-title');
        title.replaceWith(input);
        input.focus();
      };
      title.addEventListener('click', edit);
      title.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), edit()));
      title.addEventListener('focus', () => {
        // Given the focus back after a change: typed in at once.
        if (box.dataset.editing === row.id) edit();
      });
      card.append(title);
      for (const column of table.columns) {
        if (column === titleCol || column === groupBy) continue;
        const text = cellText(table, row, column, formulas);
        if (!text) continue;
        const prop = el('div', 'rn-db-prop');
        prop.append(el('span', '', column.name), column.type === 'select' ? tag(column, text) : el('b', '', text));
        card.append(prop);
      }
      const remove = button('rn-db-remove', t.deleteRow, icon(doc, 'trash', 14));
      remove.addEventListener('click', () => host.change(removeRow(table, row.id)));
      card.append(remove);
      card.addEventListener('pointerdown', (e) => dragCard(e, card, row));
      col.append(card);
    }
    const more = button('rn-db-lane-add', t.newRow, icon(doc, 'plus', 14), t.newRow);
    more.addEventListener('click', () => {
      const made = addRow(table, lane ? { [groupBy!.id]: lane } : {});
      editing = made.row.id;
      host.change(made.table, `${made.row.id}:${titleCol.id}`);
    });
    col.append(more);
    board.append(col);
  }
  box.append(board);

  /** A card dragged by the pointer to another column: its choice becomes that column's. */
  function dragCard(e: PointerEvent, card: HTMLElement, row: Row): void {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moving = false;
    let over: HTMLElement | undefined;
    const move = (ev: PointerEvent) => {
      if (!moving && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
      if (!moving) {
        moving = true;
        card.classList.add('rn-db-dragging');
        card.style.pointerEvents = 'none';
      }
      card.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px) rotate(1.5deg)`;
      const lane = doc.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.rn-db-lane');
      if (lane !== over) {
        over?.classList.remove('rn-db-over');
        over = lane && board.contains(lane) ? lane : undefined;
        over?.classList.add('rn-db-over');
      }
    };
    const up = () => {
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', up);
      over?.classList.remove('rn-db-over');
      card.classList.remove('rn-db-dragging');
      card.style.transform = '';
      card.style.pointerEvents = '';
      if (!moving || !over || !groupBy) return;
      // The click that ends a drag does not open the title.
      card.addEventListener('click', (ev) => ev.stopPropagation(), { once: true, capture: true });
      const lane = over.dataset.lane || undefined;
      if ((row.cells[groupBy.id] ?? undefined) !== lane) host.change(setCell(table, row.id, groupBy.id, lane));
    };
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up);
  }
  return box;
}
