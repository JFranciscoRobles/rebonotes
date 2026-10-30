// The menu of the workspace, as Rebodocs has the menu of its document: a
// screen of its own over the notes, with its parts down one side (the
// workspace, export, the language, the appearance) and the one chosen beside
// them. The language is only asked for: the application that gives
// `onLocale` decides.

import { type Strings, say } from './i18n';
import { icon } from './icons';

export type Appearance = 'light' | 'dark' | 'system';

export interface FileMenuHost {
  readonly strings: Strings;
  pageCount(): number;
  /** The name of the workspace, given to the files it is saved as. */
  name(): string;
  open(): void;
  saveZip(): void;
  saveMarkdown(): void;
  reset(): void;
  focus(): void;
  /** Told the appearance chosen. */
  setTheme(appearance: Appearance): void;
  appearance(): Appearance;
  onLocale?: (locale: string) => void;
  locale?: string;
}

const LANGUAGES: [string, string][] = [
  ['en', 'English'],
  ['es', 'Español'],
];

export function createFileMenu(root: HTMLElement, host: FileMenuHost): { open(): void; close(): void; destroy(): void } {
  const doc = root.ownerDocument;
  const t = host.strings;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (className: string, ...content: (Node | string)[]) => {
    const b = el('button', className);
    b.type = 'button';
    b.append(...content);
    return b;
  };
  const updates: (() => void)[] = [];

  const screen = el('div', 'rn-side');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-label', t.menu);
  screen.hidden = true;
  const nav = el('nav', 'rn-side-nav');
  nav.setAttribute('aria-label', t.menu);
  const back = button('rn-side-back', icon(doc, 'back', 18), el('span', '', t.menuBack));
  back.addEventListener('click', () => close());
  const list = el('div', 'rn-side-list');
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  const main = el('div', 'rn-side-main');
  const x = button('rn-side-x', icon(doc, 'close', 18));
  x.setAttribute('aria-label', t.menuClose);
  x.addEventListener('click', () => close());

  const tabs: HTMLButtonElement[] = [];
  const panes: HTMLElement[] = [];
  const show = (index: number) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panes.forEach((pane, i) => {
      pane.hidden = i !== index;
    });
  };
  const pane = (id: string, iconName: string, label: string, intro: string, ...content: HTMLElement[]) => {
    const index = tabs.length;
    const tab = button('rn-side-tab', icon(doc, iconName, 18), label);
    tab.id = `rn-side-tab-${id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `rn-side-pane-${id}`);
    tab.addEventListener('click', () => show(index));
    list.append(tab);
    tabs.push(tab);
    const node = el('section', 'rn-side-pane');
    node.id = `rn-side-pane-${id}`;
    node.setAttribute('role', 'tabpanel');
    node.setAttribute('aria-labelledby', tab.id);
    node.append(el('h2', '', label));
    if (intro) node.append(el('p', '', intro));
    node.append(...content);
    main.append(node);
    panes.push(node);
  };

  /** The workspace: its icon, its name and how many pages. */
  const card = (withIcon: boolean) => {
    const box = el('div', 'rn-side-doc');
    if (withIcon) {
      const mark = el('span', 'rn-side-icon');
      mark.append(icon(doc, 'notes', 20));
      box.append(mark);
    }
    const text = el('div', '');
    const name = el('b', '');
    const count = el('small', '');
    text.append(name, count);
    box.append(text);
    updates.push(() => {
      name.textContent = host.name();
      const n = host.pageCount();
      count.textContent = n === 1 ? t.menuPage : say(t.menuPages, { n: String(n) });
    });
    return box;
  };

  const tile = (iconName: string, label: string, run: () => void) => {
    const b = button('rn-side-tile', icon(doc, iconName, 20), el('span', '', label));
    b.addEventListener('click', () => {
      close();
      run();
    });
    return b;
  };
  const tiles = el('div', 'rn-side-tiles');
  tiles.append(tile('open', t.menuOpen, host.open), tile('save', t.menuSave, host.saveZip), tile('plus', t.menuNew, host.reset));

  const format = (iconName: string, label: string, text: string, run: () => void) => {
    const b = button('rn-side-format');
    const mark = el('span', 'rn-side-icon');
    mark.append(icon(doc, iconName, 20));
    const words = el('span', '');
    words.append(el('b', '', label), el('small', '', text));
    b.append(mark, words);
    b.addEventListener('click', () => {
      close();
      run();
    });
    return b;
  };
  const formats = el('div', 'rn-side-formats');
  formats.append(format('download', t.menuZip, t.menuZipText, host.saveZip), format('markdown', t.menuMarkdown, t.menuMarkdownText, host.saveMarkdown));

  const choices = (items: [string, string][], current: () => string, choose: (value: string) => void) => {
    const box = el('div', 'rn-side-choices');
    box.setAttribute('role', 'radiogroup');
    const buttons = items.map(([value, label]) => {
      const b = button('rn-side-choice', el('span', 'rn-side-dot'), label);
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => {
        choose(value);
        refresh();
      });
      box.append(b);
      return [value, b] as const;
    });
    updates.push(() => {
      for (const [value, b] of buttons) b.setAttribute('aria-checked', String(value === current()));
    });
    return box;
  };

  pane('workspace', 'notes', t.menuWorkspace, t.menuOpenText, card(true), tiles);
  pane('export', 'download', t.menuExport, '', formats);
  if (host.onLocale) {
    const onLocale = host.onLocale;
    const now = (host.locale ?? 'en').toLowerCase().split('-')[0];
    pane(
      'language',
      'globe',
      t.menuLanguage,
      t.menuLanguageText,
      choices(
        LANGUAGES,
        () => now,
        (value) => value !== now && onLocale(value),
      ),
    );
  }
  pane(
    'appearance',
    'contrast',
    t.menuAppearance,
    t.menuAppearanceText,
    choices(
      [
        ['light', t.menuLight],
        ['dark', t.menuDark],
        ['system', t.menuSystem],
      ],
      host.appearance,
      (value) => host.setTheme(value as Appearance),
    ),
  );

  nav.append(back, list, card(false));
  main.append(x);
  screen.append(nav, main);
  root.append(screen);

  const refresh = () => {
    for (const update of updates) update();
  };
  const onKey = (e: KeyboardEvent) => {
    if (screen.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tabs.includes(doc.activeElement as HTMLButtonElement)) {
      e.preventDefault();
      const at = tabs.indexOf(doc.activeElement as HTMLButtonElement);
      const next = (at + (e.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length;
      show(next);
      tabs[next].focus();
    }
  };
  doc.addEventListener('keydown', onKey, true);

  function open(): void {
    refresh();
    show(0);
    screen.hidden = false;
    requestAnimationFrame(() => tabs[0]?.focus());
  }
  function close(): void {
    if (screen.hidden) return;
    screen.hidden = true;
    host.focus();
  }
  return {
    open,
    close,
    destroy() {
      doc.removeEventListener('keydown', onKey, true);
      screen.remove();
    },
  };
}
