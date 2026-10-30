// The notes as an application: the side with the tree of pages, and the page
// in view under a bar with the path to it, edited in place. Every change goes
// into one history for the whole workspace (⌘Z goes back across pages, to
// the page it was made on), is kept in the browser when `storageKey` is
// given, and is told to `onChange`. Pages open by their id, which the
// application can keep in the address (`onNavigate`).

import {
  addPage,
  applyWorkspaceChanges,
  childrenOf,
  createPage,
  createWorkspace,
  descendantsOf,
  diffWorkspaces,
  movePage,
  newPage,
  type Page,
  pageById,
  pageToMarkdown,
  pathTo,
  removePage,
  renamePage,
  updatePage,
  type Workspace,
  type WorkspaceChange,
  workspaceFromFiles,
  workspaceFromZip,
  workspaceToZip,
} from '@rebonotes/core';
import type { EmbedFormat } from './embed';
import { type Appearance, createFileMenu } from './filemenu';
import { type Strings, say, stringsFor } from './i18n';
import { icon } from './icons';
import { openMenu } from './menu';
import { type Focus, PageView } from './page';
import { openPicker } from './picker';
import { createSidebar, type Sidebar } from './sidebar';
import { installStyles } from './styles';

export interface NotesOptions {
  /** The workspace to start with; the one kept under `storageKey`, or one empty page, when left out. */
  workspace?: Workspace;
  /** `en` or `es`; English by default. */
  locale?: string;
  /** Where the workspace is kept in the browser's storage, and read from at the start. */
  storageKey?: string;
  /** The page to open first; the first page when left out. */
  page?: string;
  /** Told the workspace after every change. */
  onChange?: (workspace: Workspace) => void;
  /** Told the page opened. */
  onNavigate?: (id: string) => void;
  /** Shows the choice of language in the menu, and is told the one chosen. */
  onLocale?: (locale: string) => void;
  /** Told the appearance chosen in the menu. */
  onTheme?: (appearance: Appearance) => void;
  /** The menu of the workspace (☰); `false` leaves it out. */
  menu?: boolean;
  /** The name of the workspace: its files are saved by it. */
  name?: string;
  /** The address of the logo beside the name in the side. */
  logo?: string;
  /** The address an image file is kept at; a data: address when left out. */
  uploadImage?: (file: File) => Promise<string>;
  /** The address any other file put in a page is kept at; a data: address when left out. */
  uploadFile?: (file: File) => Promise<string>;
  /** The kinds of file shown in a page beyond what the browser shows: `sheetsFormat`, `slidesFormat` and `docsFormat` of the suite. */
  formats?: EmbedFormat[];
  /** The side and the bar over the page; `false` leaves only the page, for an interface of one's own around it. */
  chrome?: boolean;
}

/** Someone else in the workspace: where they are, as the collaboration server says. */
export interface NotesPeer {
  client: string;
  name: string;
  color: string;
  page?: string;
  block?: string;
}

/** Where this person is: the page in view and the block the caret is in. */
export interface NotesPresence {
  page?: string;
  block?: string;
}

/** `change`: a change made here; `update`: any change, others' too; `presence`: where this person is; `navigate`: the page opened. */
export type NotesEvent = 'change' | 'update' | 'presence' | 'navigate';

interface Step {
  before: Workspace;
  after: Workspace;
  pageBefore?: string;
  pageAfter?: string;
  focusBefore?: Focus;
  focusAfter?: Focus;
  group?: string;
  time: number;
}

const download = (doc: Document, name: string, data: BlobPart, type: string) => {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, ' ').trim() || 'notes';

export class Notes {
  readonly root: HTMLElement;
  readonly strings: Strings;
  private ws: Workspace;
  private current?: string;
  private view?: PageView;
  private readonly options: NotesOptions;
  private readonly doc: Document;
  private readonly sidebar: Sidebar;
  private readonly main: HTMLElement;
  private readonly crumbs: HTMLElement;
  private readonly edited: HTMLElement;
  private readonly scroller: HTMLElement;
  private readonly showSide: HTMLButtonElement;
  private readonly fileMenu?: ReturnType<typeof createFileMenu>;
  private undoStack: Step[] = [];
  private readonly listeners = new Map<NotesEvent, Set<() => void>>();
  private peers: NotesPeer[] = [];
  private readonly peersEl: HTMLElement;
  private lastPresence = '';
  /** Whether the workspace is being changed by others: what changes then is not this person's. */
  remote = false;
  private redoStack: Step[] = [];
  private saveTimer?: ReturnType<typeof setTimeout>;
  private clock?: ReturnType<typeof setInterval>;
  private readonly onKey = (e: KeyboardEvent) => this.globalKey(e);

  constructor(host: HTMLElement, options: NotesOptions = {}) {
    this.options = options;
    this.doc = host.ownerDocument;
    this.strings = stringsFor(options.locale);
    installStyles(this.doc);
    this.ws = options.workspace ?? this.restore() ?? createWorkspace();
    if (!this.ws.pages.length) this.ws = addPage(this.ws, createPage(''));

    this.root = this.doc.createElement('div');
    this.root.className = 'rn-root';
    this.root.lang = (options.locale ?? 'en').split('-')[0];
    const t = this.strings;
    this.sidebar = createSidebar(
      this.doc,
      {
        strings: t,
        workspace: () => this.ws,
        current: () => this.current,
        navigate: (id) => this.open(id),
        newPage: (parent) => this.addPage(parent),
        pageMenu: (id, anchor) => this.pageMenu(id, anchor),
        movePage: (id, parent, before) => this.record(movePage(this.ws, id, parent, before)),
        search: () => this.search(),
        openMenu: options.menu === false ? undefined : () => this.fileMenu?.open(),
        hide: () => this.toggleSidebar(false),
      },
      options.logo,
    );
    this.main = this.doc.createElement('main');
    this.main.className = 'rn-main';
    const bar = this.doc.createElement('div');
    bar.className = 'rn-topbar';
    this.showSide = this.doc.createElement('button');
    this.showSide.type = 'button';
    this.showSide.className = 'rn-icon-button';
    this.showSide.title = t.showSidebar;
    this.showSide.setAttribute('aria-label', t.showSidebar);
    this.showSide.append(icon(this.doc, 'sidebar', 18));
    this.showSide.hidden = true;
    this.showSide.addEventListener('click', () => this.toggleSidebar(true));
    this.crumbs = this.doc.createElement('nav');
    this.crumbs.className = 'rn-crumbs';
    this.edited = this.doc.createElement('span');
    this.edited.className = 'rn-edited';
    const more = this.doc.createElement('button');
    more.type = 'button';
    more.className = 'rn-icon-button';
    more.title = t.pageOptions;
    more.setAttribute('aria-label', t.pageOptions);
    more.append(icon(this.doc, 'more', 18));
    more.addEventListener('click', () => this.current && this.pageMenu(this.current, more.getBoundingClientRect()));
    this.peersEl = this.doc.createElement('div');
    this.peersEl.className = 'rn-peers';
    bar.append(this.showSide, this.crumbs, this.peersEl, this.edited, more);
    this.scroller = this.doc.createElement('div');
    this.scroller.className = 'rn-scroll';
    this.main.append(bar, this.scroller);
    this.root.append(this.sidebar.element, this.main);
    if (options.chrome === false) this.root.classList.add('rn-bare');
    host.replaceChildren(this.root);
    if (this.doc.defaultView && this.doc.defaultView.innerWidth < 760) this.toggleSidebar(false);

    if (options.menu !== false) {
      this.fileMenu = createFileMenu(this.root, {
        strings: t,
        pageCount: () => this.ws.pages.length,
        name: () => options.name ?? t.workspace,
        open: () => this.pickFiles(),
        saveZip: () => download(this.doc, `${safeName(options.name ?? t.workspace)}.zip`, this.toZip() as BlobPart, 'application/zip'),
        saveMarkdown: () => this.current && this.exportPage(this.current),
        reset: () => this.reset(),
        focus: () => this.view?.focusStart(),
        appearance: () => this.appearance(),
        setTheme: (appearance) => {
          this.setTheme(appearance);
          options.onTheme?.(appearance);
        },
        onLocale: options.onLocale,
        locale: options.locale,
      });
    }

    this.doc.addEventListener('keydown', this.onKey);
    this.doc.addEventListener('selectionchange', this.onSelection);
    // What has not been kept yet goes to storage when the page is closed or reloaded.
    this.doc.defaultView?.addEventListener('pagehide', this.onLeave);
    this.clock = setInterval(() => this.drawEdited(), 30_000);
    this.open(pageById(this.ws, options.page)?.id ?? childrenOf(this.ws, undefined)[0]?.id ?? this.ws.pages[0].id);
  }

  // ——— What the application asks ———

  /** The workspace as it is now. */
  get workspace(): Workspace {
    return this.ws;
  }

  /** The id of the page in view. */
  get page(): string | undefined {
    return this.current;
  }

  /** A page opened; the caret in its title when asked. */
  open(id: string, focus?: 'title'): void {
    const page = pageById(this.ws, id);
    if (!page) return;
    const changed = this.current !== id;
    this.current = id;
    const host = {
      root: this.root,
      strings: this.strings,
      workspace: () => this.ws,
      commit: (next: Page, before: Focus | undefined, after: Focus | undefined, group?: string) =>
        this.record(
          updatePage(this.ws, next.id, () => next),
          { group, focusBefore: before, focusAfter: after, quiet: true },
        ),
      rename: (patch: { title?: string; icon?: string | null }, group?: string) =>
        this.record(renamePage(this.ws, id, patch), { group, focusBefore: this.view?.focusNow(), focusAfter: this.view?.focusNow() }),
      navigate: (target: string, where?: 'title') => this.open(target, where),
      createPage: (parent: string, title?: string) => {
        const made = newPage(this.ws, title ?? '', parent);
        this.record(made.workspace);
        this.sidebar.reveal(made.page.id);
        return made.page;
      },
      undo: () => this.undo(),
      redo: () => this.redo(),
      search: () => this.search(),
      uploadImage: this.options.uploadImage,
      uploadFile: this.options.uploadFile,
      formats: this.options.formats,
      language: (this.options.locale ?? 'en').split('-')[0],
    };
    if (!this.view) this.view = new PageView(this.scroller, host, page);
    else if (changed) {
      this.view.destroy();
      this.view = new PageView(this.scroller, host, page);
    }
    if (changed) this.scroller.scrollTop = 0;
    this.sidebar.reveal(id);
    this.drawBar();
    if (focus === 'title' || !page.title) this.view.focusTitle();
    if (changed) {
      this.options.onNavigate?.(id);
      this.emit('navigate');
      this.emitPresence();
      this.view.markPeers(this.peers.filter((p) => p.page === id));
    }
  }

  /** Told when something happens: a change made here, where this person is, the page opened. Gives what stops it. */
  on(event: NotesEvent, fn: () => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn);
    return () => set.delete(fn);
  }

  private emit(event: NotesEvent): void {
    for (const fn of this.listeners.get(event) ?? []) fn();
  }

  /** Where this person is. */
  presence(): NotesPresence {
    const focus = this.view?.focusNow();
    return { page: this.current, ...(focus && 'block' in focus ? { block: focus.block } : {}) };
  }

  private readonly onSelection = () => this.emitPresence();
  private readonly onLeave = () => {
    clearTimeout(this.saveTimer);
    this.flush();
  };

  private emitPresence(): void {
    const now = JSON.stringify(this.presence());
    if (now === this.lastPresence) return;
    this.lastPresence = now;
    this.emit('presence');
  }

  /** The others in the workspace: shown over the page they are on, and by the block they are in. */
  setPeers(peers: NotesPeer[]): void {
    this.peers = peers;
    this.drawPeers();
    this.view?.markPeers(peers.filter((p) => p.page === this.current));
  }

  private drawPeers(): void {
    this.peersEl.replaceChildren();
    for (const peer of this.peers) {
      const dot = this.doc.createElement('button');
      dot.type = 'button';
      dot.className = 'rn-peer';
      dot.style.setProperty('--peer', `#${peer.color.replace(/^#/, '')}`);
      dot.textContent = (peer.name.trim()[0] ?? '?').toUpperCase();
      const where = pageById(this.ws, peer.page)?.title;
      dot.title = where ? `${peer.name} · ${where}` : peer.name;
      if (peer.page !== this.current) dot.classList.add('rn-peer-away');
      dot.addEventListener('click', () => peer.page && this.open(peer.page));
      this.peersEl.append(dot);
    }
  }

  /**
   * Changes made by others, on the workspace as it is: what is in `keep`
   * (what this person changed and the server has not told back) stays.
   * Not a step of this person's history.
   */
  applyRemote(changes: readonly WorkspaceChange[], keep?: ReadonlySet<string>): void {
    const next = applyWorkspaceChanges(this.ws, changes, { keep });
    if (next === this.ws) return;
    this.remote = true;
    try {
      this.show(next);
    } finally {
      this.remote = false;
    }
  }

  /** A workspace from elsewhere in place of this one, not as a step of the history: the room's, when it is joined. */
  replace(ws: Workspace): void {
    this.remote = true;
    try {
      this.undoStack = [];
      this.redoStack = [];
      this.show(ws.pages.length ? ws : addPage(ws, createPage('')));
    } finally {
      this.remote = false;
    }
  }

  /** A workspace drawn, the page in view kept (with the caret where it was) when it is still there. */
  private show(ws: Workspace): void {
    const titles = this.titlesChanged(ws);
    this.ws = ws;
    this.changed();
    if (titles) this.sidebar.draw();
    const page = pageById(ws, this.current);
    if (!page) {
      this.current = undefined;
      this.view?.destroy();
      this.view = undefined;
      this.open(childrenOf(ws, undefined)[0]?.id ?? ws.pages[0].id);
      return;
    }
    if (this.view && page !== this.view.page) {
      const focus = this.view.focusNow();
      this.view.update(page);
      if (focus) this.view.restore(focus);
    }
    this.view?.refresh();
    this.drawBar();
    this.drawPeers();
  }

  private titlesChanged(next: Workspace): boolean {
    return (
      this.ws.pages.length !== next.pages.length ||
      this.ws.pages.some((p, i) => p.title !== next.pages[i]?.title || p.icon !== next.pages[i]?.icon || p.parent !== next.pages[i]?.parent || p.id !== next.pages[i]?.id)
    );
  }

  /** A workspace in place of this one: a file opened, or one from elsewhere. */
  load(ws: Workspace, page?: string): void {
    this.record(ws.pages.length ? ws : addPage(ws, createPage('')));
    this.current = undefined;
    this.view?.destroy();
    this.view = undefined;
    this.open(pageById(this.ws, page)?.id ?? childrenOf(this.ws, undefined)[0]?.id ?? this.ws.pages[0].id);
  }

  /** A new page, under another or at the top, opened with the caret in its title. */
  addPage(parent?: string, title = ''): Page {
    const made = newPage(this.ws, title, parent);
    this.record(made.workspace);
    this.open(made.page.id, 'title');
    return made.page;
  }

  /** A page taken out with the pages under it, after asking; the page above it opened when it was in view. */
  deletePage(id: string, ask = true): void {
    const page = pageById(this.ws, id);
    if (!page) return;
    if (ask && !this.doc.defaultView?.confirm(say(this.strings.deletePageConfirm, { title: page.title || this.strings.untitled }))) return;
    const gone = descendantsOf(this.ws, id);
    let next = removePage(this.ws, id);
    if (!next.pages.length) next = addPage(next, createPage(''));
    this.record(next);
    if (this.current && gone.includes(this.current)) {
      const to = page.parent && pageById(this.ws, page.parent) ? page.parent : childrenOf(this.ws, undefined)[0]?.id;
      this.current = undefined;
      this.open(to ?? this.ws.pages[0].id);
    }
  }

  /** A copy of a page, beside it. */
  duplicatePage(id: string): void {
    const page = pageById(this.ws, id);
    if (!page) return;
    const copy = createPage(say(this.strings.copyOf, { title: page.title || this.strings.untitled }), {
      ...(page.parent ? { parent: page.parent } : {}),
      ...(page.icon ? { icon: page.icon } : {}),
      blocks: page.blocks.map((b) => ({ ...b, id: createPage().id })),
    });
    this.record(addPage(this.ws, copy, id));
    this.open(copy.id);
  }

  /** The last change made here taken back; what others changed since stays. */
  undo(): void {
    const step = this.undoStack.pop();
    if (!step) return;
    this.redoStack.push(step);
    this.apply(applyWorkspaceChanges(this.ws, diffWorkspaces(step.after, step.before)), step.pageBefore, step.focusBefore);
  }

  redo(): void {
    const step = this.redoStack.pop();
    if (!step) return;
    this.undoStack.push(step);
    this.apply(applyWorkspaceChanges(this.ws, diffWorkspaces(step.before, step.after)), step.pageAfter, step.focusAfter);
  }

  /** The quick search over the pages; the page chosen opened. */
  async search(): Promise<void> {
    const picked = await openPicker(this.root, { workspace: this.ws, strings: this.strings, centered: true });
    if (picked && 'page' in picked) this.open(picked.page);
  }

  /** The Markdown of a page (the one in view by default). */
  toMarkdown(id = this.current): string {
    const page = pageById(this.ws, id);
    return page ? pageToMarkdown(page) : '';
  }

  /** The workspace as a .zip of Markdown files. */
  toZip(): Uint8Array {
    return workspaceToZip(this.ws);
  }

  setTheme(appearance: Appearance): void {
    if (appearance === 'system') delete this.root.dataset.theme;
    else this.root.dataset.theme = appearance;
  }

  focus(): void {
    this.view?.focusStart();
  }

  destroy(): void {
    clearTimeout(this.saveTimer);
    clearInterval(this.clock);
    this.flush();
    this.doc.removeEventListener('keydown', this.onKey);
    this.doc.removeEventListener('selectionchange', this.onSelection);
    this.doc.defaultView?.removeEventListener('pagehide', this.onLeave);
    this.listeners.clear();
    this.view?.destroy();
    this.fileMenu?.destroy();
    this.root.remove();
  }

  // ——— Inside ———

  /**
   * A new workspace, as a step of the history. Typing in the same block (the
   * same `group`) within a moment is one step. `quiet` is for the page's own
   * changes: it has drawn them already.
   */
  private record(next: Workspace, meta: { group?: string; focusBefore?: Focus; focusAfter?: Focus; quiet?: boolean } = {}): void {
    if (next === this.ws) return;
    const now = Date.now();
    const top = this.undoStack[this.undoStack.length - 1];
    if (meta.group && top?.group === meta.group && now - top.time < 1200) {
      top.after = next;
      top.focusAfter = meta.focusAfter;
      top.time = now;
    } else {
      this.undoStack.push({
        before: this.ws,
        after: next,
        pageBefore: this.current,
        pageAfter: this.current,
        focusBefore: meta.focusBefore,
        focusAfter: meta.focusAfter,
        group: meta.group,
        time: now,
      });
      if (this.undoStack.length > 300) this.undoStack.shift();
    }
    this.redoStack = [];
    const titles = this.titlesChanged(next);
    this.ws = next;
    this.changed();
    if (titles) {
      this.sidebar.draw();
      this.view?.refresh();
    }
    this.drawBar();
    if (!meta.quiet && this.view && this.current) {
      const page = pageById(this.ws, this.current);
      if (page && page !== this.view.page) this.view.update(page);
    }
  }

  /** A workspace from the history put back, on the page the change was made on. */
  private apply(ws: Workspace, page: string | undefined, focus: Focus | undefined): void {
    this.ws = ws;
    this.changed();
    this.sidebar.draw();
    const target = page && pageById(ws, page) ? page : this.current && pageById(ws, this.current) ? this.current : childrenOf(ws, undefined)[0]?.id;
    if (!target) return;
    if (target !== this.current) {
      this.open(target);
      if (focus) this.view?.focus(focus);
    } else {
      this.view?.update(pageById(ws, target)!, focus);
      this.view?.refresh();
      this.drawBar();
    }
  }

  private changed(): void {
    this.options.onChange?.(this.ws);
    if (!this.remote) this.emit('change');
    this.emit('update');
    if (!this.options.storageKey) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 400);
  }

  private flush(): void {
    if (!this.options.storageKey) return;
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.ws));
    } catch {
      // Not kept: storage is full or not allowed.
    }
  }

  private restore(): Workspace | undefined {
    if (!this.options.storageKey) return undefined;
    try {
      const kept = localStorage.getItem(this.options.storageKey);
      const ws = kept ? (JSON.parse(kept) as Workspace) : undefined;
      return ws && Array.isArray(ws.pages) ? ws : undefined;
    } catch {
      return undefined;
    }
  }

  private drawBar(): void {
    const t = this.strings;
    const path = this.current ? pathTo(this.ws, this.current) : [];
    this.crumbs.replaceChildren();
    path.forEach((page, i) => {
      if (i) {
        const sep = this.doc.createElement('span');
        sep.className = 'rn-crumb-sep';
        sep.textContent = '/';
        this.crumbs.append(sep);
      }
      const b = this.doc.createElement('button');
      b.type = 'button';
      b.className = 'rn-crumb';
      const mark = this.doc.createElement('span');
      if (page.icon) mark.textContent = page.icon;
      const title = this.doc.createElement('span');
      title.textContent = page.title || t.untitled;
      if (page.icon) b.append(mark);
      b.append(title);
      b.addEventListener('click', () => this.open(page.id));
      this.crumbs.append(b);
    });
    this.drawEdited();
  }

  private drawEdited(): void {
    const page = pageById(this.ws, this.current);
    if (!page) return;
    const t = this.strings;
    const minutes = Math.floor((Date.now() - page.updated) / 60000);
    const time =
      minutes < 1
        ? t.justNow
        : minutes < 60
          ? say(t.minutesAgo, { n: String(minutes) })
          : minutes < 1440
            ? say(t.hoursAgo, { n: String(Math.floor(minutes / 60)) })
            : say(t.daysAgo, { n: String(Math.floor(minutes / 1440)) });
    this.edited.textContent = say(t.updated, { time });
  }

  private toggleSidebar(show: boolean): void {
    this.root.classList.toggle('rn-no-sidebar', !show);
    this.showSide.hidden = show;
  }

  private pageMenu(id: string, anchor: DOMRect): void {
    const t = this.strings;
    openMenu(
      this.root,
      anchor,
      [
        { id: 'sub', label: t.newSubpage, icon: 'plus', run: () => this.addPage(id) },
        { id: 'duplicate', label: t.duplicatePage, icon: 'duplicate', run: () => this.duplicatePage(id) },
        { id: 'export', label: t.exportPage, icon: 'markdown', run: () => this.exportPage(id) },
        { id: 'delete', label: t.deletePage, icon: 'trash', danger: true, run: () => this.deletePage(id) },
      ],
      { ownKeys: true, className: 'rn-block-menu' },
    );
  }

  private exportPage(id: string): void {
    const page = pageById(this.ws, id);
    if (page) download(this.doc, `${safeName(page.title || this.strings.untitled)}.md`, pageToMarkdown(page), 'text/markdown');
  }

  private pickFiles(): void {
    const input = this.doc.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.md,.markdown,text/markdown';
    input.multiple = true;
    input.addEventListener('change', async () => {
      const files = [...(input.files ?? [])];
      const zip = files.find((f) => /\.zip$/i.test(f.name));
      if (zip) {
        this.load(workspaceFromZip(new Uint8Array(await zip.arrayBuffer())));
        return;
      }
      // Markdown files are added to the workspace, at the top.
      const texts: Record<string, string> = {};
      for (const file of files) texts[file.webkitRelativePath || file.name] = await file.text();
      const added = workspaceFromFiles(texts);
      if (!added.pages.length) return;
      this.record({ pages: [...this.ws.pages, ...added.pages] });
      this.open(added.pages[0].id);
    });
    input.click();
  }

  private reset(): void {
    if (!this.doc.defaultView?.confirm(this.strings.menuNewConfirm)) return;
    this.load(createWorkspace());
  }

  private appearance(): Appearance {
    const theme = this.root.dataset.theme;
    return theme === 'light' || theme === 'dark' ? theme : 'system';
  }

  /** Keys pressed in the notes, or with nothing focused: not those of another part of the page. */
  private mine(target: HTMLElement | null): boolean {
    return !target || target === this.doc.body || this.root.contains(target);
  }

  private globalKey(e: KeyboardEvent): void {
    if (!this.root.isConnected) return;
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    const target = e.target as HTMLElement | null;
    const inField = !!target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    if (key === 'p' || (key === 'k' && !inField)) {
      e.preventDefault();
      void this.search();
    } else if (key === '\\') {
      e.preventDefault();
      this.toggleSidebar(this.root.classList.contains('rn-no-sidebar'));
    } else if (key === 'z' && !inField && !this.view?.hasFocus() && this.mine(target)) {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (key === 'y' && !inField && !this.view?.hasFocus() && this.mine(target)) {
      e.preventDefault();
      this.redo();
    }
  }
}

/** The notes put in an element, in place of what it had. */
export function mountNotes(host: HTMLElement, options: NotesOptions = {}): Notes {
  return new Notes(host, options);
}
