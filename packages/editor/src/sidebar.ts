// The side of the notes: the menu, search, a new page, and the tree of pages,
// each with its icon and title, opened and closed by its arrow, with a page
// put inside it by its + and its options by its ⋯. A page is dragged onto
// another to go inside it, or between two to go there.

import { childrenOf, descendantsOf, type Page, pathTo, type Workspace } from '@rebonotes/core';
import type { Strings } from './i18n';
import { icon, shortcut } from './icons';

export interface SidebarHost {
  readonly strings: Strings;
  workspace(): Workspace;
  current(): string | undefined;
  navigate(id: string): void;
  newPage(parent?: string): void;
  pageMenu(id: string, anchor: DOMRect): void;
  movePage(id: string, parent: string | undefined, before: string | undefined): void;
  search(): void;
  openMenu?(): void;
  hide(): void;
}

export interface Sidebar {
  readonly element: HTMLElement;
  draw(): void;
  /** The pages above a page opened, so that it is seen. */
  reveal(id: string): void;
  destroy(): void;
}

export function createSidebar(doc: Document, host: SidebarHost, logo?: string): Sidebar {
  const t = host.strings;
  const open = new Set<string>();
  const aside = doc.createElement('aside');
  aside.className = 'rn-sidebar';
  aside.setAttribute('aria-label', t.pages);

  const button = (className: string, label: string, ...content: (Node | string)[]) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = className;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.append(...content);
    return b;
  };

  const top = doc.createElement('div');
  top.className = 'rn-nav-top';
  if (host.openMenu) {
    const menu = button('rn-icon-button', t.menu, icon(doc, 'menu', 18));
    menu.addEventListener('click', () => host.openMenu?.());
    top.append(menu);
  }
  const brand = doc.createElement('span');
  brand.className = 'rn-brand';
  if (logo) {
    const img = doc.createElement('img');
    img.src = logo;
    img.alt = '';
    img.width = 22;
    img.height = 22;
    brand.append(img);
  }
  brand.append(t.workspace);
  const hide = button('rn-icon-button', t.hideSidebar, icon(doc, 'sidebar', 18));
  hide.addEventListener('click', () => host.hide());
  top.append(brand, hide);

  const action = (iconName: string, label: string, keys: string, run: () => void) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'rn-nav-action';
    b.append(icon(doc, iconName, 18), doc.createTextNode(label));
    if (keys) {
      const k = doc.createElement('kbd');
      k.textContent = shortcut(keys);
      b.append(k);
    }
    b.addEventListener('click', run);
    return b;
  };
  const label = doc.createElement('div');
  label.className = 'rn-nav-label';
  const add = button('rn-icon-button rn-icon-small', t.newPage, icon(doc, 'plus', 16));
  add.addEventListener('click', () => host.newPage());
  label.append(t.pages, add);
  const tree = doc.createElement('div');
  tree.className = 'rn-tree';
  tree.setAttribute('role', 'tree');
  aside.append(
    top,
    action('search', t.search, 'Mod+K', () => host.search()),
    action('plus', t.newPage, '', () => host.newPage()),
    label,
    tree,
  );

  const row = (page: Page, depth: number, ws: Workspace): HTMLElement => {
    const kids = childrenOf(ws, page.id);
    const item = doc.createElement('div');
    item.className = 'rn-tree-row';
    item.setAttribute('role', 'treeitem');
    item.dataset.id = page.id;
    item.style.setProperty('--depth', String(depth));
    if (page.id === host.current()) {
      item.classList.add('rn-current');
      item.setAttribute('aria-current', 'page');
    }
    const expanded = open.has(page.id);
    if (kids.length) item.setAttribute('aria-expanded', String(expanded));
    const toggle = button('rn-tree-toggle', '', icon(doc, 'chevronRight', 14));
    toggle.removeAttribute('title');
    toggle.setAttribute('aria-label', page.title || t.untitled);
    if (!kids.length) toggle.classList.add('rn-leaf');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (open.has(page.id)) open.delete(page.id);
      else open.add(page.id);
      draw();
    });
    const mark = doc.createElement('span');
    mark.className = 'rn-tree-icon';
    if (page.icon) mark.textContent = page.icon;
    else mark.append(icon(doc, 'page', 16));
    const title = doc.createElement('span');
    title.className = 'rn-tree-title';
    title.textContent = page.title || t.untitled;
    if (!page.title) title.classList.add('rn-untitled');
    const actions = doc.createElement('span');
    actions.className = 'rn-tree-actions';
    const more = button('rn-tree-act', t.pageOptions, icon(doc, 'more', 16));
    more.addEventListener('click', (e) => {
      e.stopPropagation();
      host.pageMenu(page.id, more.getBoundingClientRect());
    });
    const inside = button('rn-tree-act', t.newSubpage, icon(doc, 'plus', 16));
    inside.addEventListener('click', (e) => {
      e.stopPropagation();
      open.add(page.id);
      host.newPage(page.id);
    });
    actions.append(more, inside);
    item.append(toggle, mark, title, actions);
    item.addEventListener('click', () => host.navigate(page.id));
    item.addEventListener('pointerdown', (e) => startDrag(e, page.id, item));
    return item;
  };

  function draw(): void {
    const ws = host.workspace();
    const rows: HTMLElement[] = [];
    const walk = (parent: string | undefined, depth: number) => {
      for (const page of childrenOf(ws, parent)) {
        rows.push(row(page, depth, ws));
        if (open.has(page.id)) walk(page.id, depth + 1);
      }
    };
    walk(undefined, 0);
    tree.replaceChildren(...rows);
  }

  // ——— Dragging a page ———

  let drag: { id: string; x: number; y: number; moved: boolean; target?: { row: HTMLElement; zone: 'before' | 'after' | 'inside' } } | undefined;
  function startDrag(e: PointerEvent, id: string, item: HTMLElement) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    drag = { id, x: e.clientX, y: e.clientY, moved: false };
    const move = (ev: PointerEvent) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 5) return;
      drag.moved = true;
      item.classList.add('rn-tree-dragged');
      clearMarks();
      const over = doc.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.rn-tree-row');
      if (!over || !tree.contains(over) || descendantsOf(host.workspace(), id).includes(over.dataset.id!)) {
        drag.target = undefined;
        return;
      }
      const box = over.getBoundingClientRect();
      const y = (ev.clientY - box.top) / box.height;
      const zone = y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside';
      drag.target = { row: over, zone };
      over.classList.add(`rn-drop-${zone}`);
    };
    const up = () => {
      doc.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerup', up);
      item.classList.remove('rn-tree-dragged');
      clearMarks();
      const done = drag;
      drag = undefined;
      if (!done?.moved || !done.target) return;
      // The click that ends a drag does not open the page.
      item.addEventListener('click', (ev) => ev.stopImmediatePropagation(), { once: true, capture: true });
      const ws = host.workspace();
      const target = ws.pages.find((p) => p.id === done.target!.row.dataset.id)!;
      if (done.target.zone === 'inside') {
        open.add(target.id);
        host.movePage(done.id, target.id, undefined);
      } else if (done.target.zone === 'before') host.movePage(done.id, target.parent, target.id);
      else {
        const siblings = childrenOf(ws, target.parent).filter((p) => p.id !== done.id);
        host.movePage(done.id, target.parent, siblings[siblings.indexOf(target) + 1]?.id);
      }
    };
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up);
  }
  const clearMarks = () => {
    for (const el of tree.querySelectorAll('.rn-drop-before, .rn-drop-after, .rn-drop-inside')) el.classList.remove('rn-drop-before', 'rn-drop-after', 'rn-drop-inside');
  };

  return {
    element: aside,
    draw,
    reveal(id) {
      for (const page of pathTo(host.workspace(), id).slice(0, -1)) open.add(page.id);
      draw();
      // Scrolled within the tree only: not the page the notes are in.
      const row = tree.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
      if (row) {
        const top = row.offsetTop - tree.offsetTop;
        if (top < tree.scrollTop) tree.scrollTop = top;
        else if (top + row.offsetHeight > tree.scrollTop + tree.clientHeight) tree.scrollTop = top + row.offsetHeight - tree.clientHeight;
      }
    },
    destroy() {
      aside.remove();
    },
  };
}
