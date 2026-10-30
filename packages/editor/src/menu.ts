// A menu that floats by what opened it: items in sections, each with an icon,
// a name, a line about it and its shortcut, narrowed as a query is typed.
// Driven by the keys of the text it was opened from (the slash menu: the
// caret stays in the block) or by its own (a menu opened by a button).

import { icon, shortcut } from './icons';

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  icon?: string;
  /** An emoji in place of the icon. */
  emoji?: string;
  keys?: string;
  section?: string;
  /** Other words it is found by. */
  words?: string;
  danger?: boolean;
  run(): void;
}

export interface Menu {
  readonly element: HTMLElement;
  /** Narrows the items to those the query is in; says whether any is left. */
  filter(query: string): boolean;
  move(by: number): void;
  choose(): void;
  close(): void;
  readonly open: boolean;
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * A menu put in `root`, under the box `anchor` (above it when there is no
 * room). With `ownKeys`, it takes the arrows, Enter and Escape itself.
 */
export function openMenu(root: HTMLElement, anchor: DOMRect, items: MenuItem[], options: { ownKeys?: boolean; empty?: string; className?: string; onClose?: () => void } = {}): Menu {
  const doc = root.ownerDocument;
  const box = doc.createElement('div');
  box.className = `rn-menu ${options.className ?? ''}`.trim();
  box.setAttribute('role', 'menu');
  box.addEventListener('pointerdown', (e) => e.preventDefault());
  let shown = items;
  let active = 0;
  let isOpen = true;

  const draw = () => {
    box.replaceChildren();
    let section: string | undefined;
    if (!shown.length) {
      const none = doc.createElement('div');
      none.className = 'rn-menu-empty';
      none.textContent = options.empty ?? '';
      box.append(none);
    }
    shown.forEach((item, index) => {
      if (item.section && item.section !== section) {
        section = item.section;
        const head = doc.createElement('div');
        head.className = 'rn-menu-section';
        head.textContent = section;
        box.append(head);
      }
      const row = doc.createElement('button');
      row.type = 'button';
      row.className = 'rn-menu-item';
      row.setAttribute('role', 'menuitem');
      if (item.danger) row.classList.add('rn-danger');
      if (index === active) row.classList.add('rn-active');
      if (item.emoji || item.icon) {
        const mark = doc.createElement('span');
        mark.className = item.hint ? 'rn-menu-icon rn-menu-icon-big' : 'rn-menu-icon';
        if (item.emoji) mark.textContent = item.emoji;
        else mark.append(icon(doc, item.icon!, item.hint ? 22 : 18));
        row.append(mark);
      }
      const words = doc.createElement('span');
      words.className = 'rn-menu-words';
      const label = doc.createElement('span');
      label.textContent = item.label;
      words.append(label);
      if (item.hint) {
        const hint = doc.createElement('small');
        hint.textContent = item.hint;
        words.append(hint);
      }
      row.append(words);
      if (item.keys) {
        const keys = doc.createElement('kbd');
        keys.textContent = shortcut(item.keys);
        row.append(keys);
      }
      row.addEventListener('pointermove', () => {
        if (active === index) return;
        active = index;
        for (const [i, el] of [...box.querySelectorAll('.rn-menu-item')].entries()) el.classList.toggle('rn-active', i === index);
      });
      row.addEventListener('click', () => {
        close();
        item.run();
      });
      box.append(row);
    });
  };

  const place = () => {
    const view = doc.defaultView!;
    const own = box.getBoundingClientRect();
    const below = anchor.bottom + 6;
    const top = below + own.height > view.innerHeight - 8 && anchor.top - own.height - 6 > 8 ? anchor.top - own.height - 6 : Math.min(below, view.innerHeight - own.height - 8);
    box.style.left = `${Math.max(8, Math.min(anchor.left, view.innerWidth - own.width - 8))}px`;
    box.style.top = `${Math.max(8, top)}px`;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      menu.move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      menu.choose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };
  const onOutside = (e: PointerEvent) => {
    if (!box.contains(e.target as Node)) close();
  };

  function close() {
    if (!isOpen) return;
    isOpen = false;
    box.remove();
    if (options.ownKeys) doc.removeEventListener('keydown', onKey, true);
    doc.removeEventListener('pointerdown', onOutside, true);
    options.onClose?.();
  }

  const menu: Menu = {
    element: box,
    get open() {
      return isOpen;
    },
    filter(query) {
      const q = fold(query.trim());
      shown = q ? items.filter((item) => fold(`${item.label} ${item.words ?? ''}`).includes(q)) : items;
      active = 0;
      draw();
      place();
      return shown.length > 0;
    },
    move(by) {
      if (!shown.length) return;
      active = (active + by + shown.length) % shown.length;
      const rows = box.querySelectorAll('.rn-menu-item');
      rows.forEach((el, i) => el.classList.toggle('rn-active', i === active));
      rows[active]?.scrollIntoView({ block: 'nearest' });
    },
    choose() {
      const item = shown[active];
      close();
      item?.run();
    },
    close,
  };

  draw();
  root.append(box);
  place();
  if (options.ownKeys) doc.addEventListener('keydown', onKey, true);
  // Not the click that opened it.
  setTimeout(() => isOpen && doc.addEventListener('pointerdown', onOutside, true));
  return menu;
}
