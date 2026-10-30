// Finding a page: the quick search over the whole screen (⌘K), with the pages
// edited last before anything is typed and where the words were found in
// each; and the same, small, by the caret, to link a page (`[[`, ⌘K on a
// selection), which also takes an address or makes a new page of the words.

import { pathTo, searchPages, type Workspace } from '@rebonotes/core';
import { type Strings, say } from './i18n';
import { icon } from './icons';

export type Picked = { page: string } | { url: string } | { create: string };

export interface PickerOptions {
  workspace: Workspace;
  strings: Strings;
  /** Over the whole screen; by `anchor` otherwise. */
  centered?: boolean;
  anchor?: DOMRect;
  placeholder?: string;
  /** An address typed is a choice. */
  allowUrl?: boolean;
  /** The words typed can be made a new page. */
  allowNew?: boolean;
  /** What is typed to start with. */
  query?: string;
  /** Pages not offered. */
  exclude?: string[];
}

const looksLikeUrl = (text: string) => /^(https?:\/\/|mailto:|www\.)\S+$/i.test(text) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text);

/** The picker, put in `root`; the choice made, or nothing when it is closed. */
export function openPicker(root: HTMLElement, options: PickerOptions): Promise<Picked | undefined> {
  const doc = root.ownerDocument;
  const t = options.strings;
  return new Promise((resolve) => {
    const overlay = doc.createElement('div');
    overlay.className = options.centered ? 'rn-finder-overlay' : 'rn-finder-float';
    const box = doc.createElement('div');
    box.className = options.centered ? 'rn-finder' : 'rn-finder rn-finder-small';
    box.setAttribute('role', 'dialog');
    const field = doc.createElement('label');
    field.className = 'rn-finder-field';
    const input = doc.createElement('input');
    input.type = 'text';
    input.placeholder = options.placeholder ?? t.searchPlaceholder;
    input.value = options.query ?? '';
    input.setAttribute('aria-label', input.placeholder);
    field.append(icon(doc, 'search', 18), input);
    const list = doc.createElement('div');
    list.className = 'rn-finder-list';
    list.setAttribute('role', 'listbox');
    box.append(field, list);
    overlay.append(box);
    root.append(overlay);

    type Row = { choice: Picked; title: string; icon?: string; emoji?: string; path?: string; snippet?: [string, string, string] };
    let rows: Row[] = [];
    let active = 0;
    const exclude = new Set(options.exclude ?? []);

    const draw = () => {
      const query = input.value.trim();
      rows = [];
      if (options.allowUrl && looksLikeUrl(query)) rows.push({ choice: { url: /^[a-z]+:/i.test(query) ? query : `https://${query}` }, title: query, icon: 'link' });
      const pathOf = (id: string) =>
        pathTo(options.workspace, id)
          .slice(0, -1)
          .map((p) => p.title || t.untitled)
          .join(' / ');
      if (query) {
        for (const result of searchPages(options.workspace, query, 30)) {
          if (exclude.has(result.page.id)) continue;
          rows.push({
            choice: { page: result.page.id },
            title: result.page.title || t.untitled,
            emoji: result.page.icon,
            icon: 'page',
            path: pathOf(result.page.id),
            snippet: result.block ? result.snippet : undefined,
          });
        }
        if (options.allowNew && !looksLikeUrl(query)) rows.push({ choice: { create: query }, title: say(t.linkNew, { title: query }), icon: 'plus' });
      } else {
        const recent = options.workspace.pages
          .filter((p) => !exclude.has(p.id))
          .slice()
          .sort((a, b) => b.updated - a.updated)
          .slice(0, 8);
        for (const page of recent) rows.push({ choice: { page: page.id }, title: page.title || t.untitled, emoji: page.icon, icon: 'page', path: pathOf(page.id) });
      }
      active = 0;
      list.replaceChildren();
      if (!query && rows.length) {
        const head = doc.createElement('div');
        head.className = 'rn-menu-section';
        head.textContent = t.recent;
        list.append(head);
      }
      if (!rows.length) {
        const none = doc.createElement('div');
        none.className = 'rn-menu-empty';
        none.textContent = t.noResults;
        list.append(none);
      }
      rows.forEach((row, index) => {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = 'rn-finder-row';
        b.setAttribute('role', 'option');
        if (index === active) b.classList.add('rn-active');
        const mark = doc.createElement('span');
        mark.className = 'rn-finder-icon';
        if (row.emoji) mark.textContent = row.emoji;
        else mark.append(icon(doc, row.icon ?? 'page', 18));
        const words = doc.createElement('span');
        words.className = 'rn-finder-words';
        const title = doc.createElement('b');
        title.textContent = row.title;
        words.append(title);
        if (row.path) {
          const path = doc.createElement('small');
          path.textContent = row.path;
          words.append(path);
        }
        if (row.snippet) {
          const snip = doc.createElement('small');
          snip.className = 'rn-finder-snippet';
          const hit = doc.createElement('mark');
          hit.textContent = row.snippet[1];
          snip.append(row.snippet[0], hit, row.snippet[2]);
          words.append(snip);
        }
        b.append(mark, words);
        b.addEventListener('pointermove', () => {
          if (active !== index) select(index);
        });
        b.addEventListener('click', () => finish(row.choice));
        list.append(b);
      });
    };
    const select = (index: number) => {
      active = index;
      const all = list.querySelectorAll('.rn-finder-row');
      all.forEach((el, i) => el.classList.toggle('rn-active', i === index));
      all[index]?.scrollIntoView({ block: 'nearest' });
    };

    const place = () => {
      if (options.centered || !options.anchor) return;
      const view = doc.defaultView!;
      const own = box.getBoundingClientRect();
      const a = options.anchor;
      box.style.left = `${Math.max(8, Math.min(a.left, view.innerWidth - own.width - 8))}px`;
      box.style.top = `${a.bottom + 6 + own.height > view.innerHeight - 8 ? Math.max(8, a.top - own.height - 6) : a.bottom + 6}px`;
    };

    let done = false;
    function finish(choice: Picked | undefined) {
      if (done) return;
      done = true;
      overlay.remove();
      doc.removeEventListener('pointerdown', onOutside, true);
      resolve(choice);
    }
    const onOutside = (e: PointerEvent) => !box.contains(e.target as Node) && finish(undefined);

    input.addEventListener('input', () => {
      draw();
      place();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (rows.length) select((active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[active]) finish(rows[active].choice);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(undefined);
      }
    });
    draw();
    place();
    setTimeout(() => doc.addEventListener('pointerdown', onOutside, true));
    input.focus();
    input.select();
  });
}
