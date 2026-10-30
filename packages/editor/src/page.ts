// A page, edited in place: its icon and title, and its blocks, each an
// element of its own whose text the browser edits (so that typing, accents
// and the keyboards of every language work as they do everywhere), read back
// into the page after every change. What is not typing is the editor's:
// Enter cuts a block, Backspace at the start joins it to the one before,
// Tab sets it in, the arrows go from block to block, Markdown typed at the
// start of a line makes the block it writes, `/` opens the menu of blocks,
// `[[` links a page, the grip beside a block drags it or opens its menu, and
// Escape selects whole blocks to move, copy or delete them.

import {
  type Block,
  type BlockType,
  backlinksOf,
  blockIndex,
  blocksToMarkdown,
  createBlock,
  createTable,
  deleteText,
  duplicateBlock,
  hasMark,
  indentBlock,
  insertBlocks,
  insertText,
  joinBackward,
  joinSpans,
  LIST_TYPES,
  listNumber,
  type Mark,
  markdownToBlocks,
  maxIndent,
  moveBlocks,
  type Page,
  pageById,
  plainText,
  removeBlocks,
  setBlockType,
  setLink,
  sliceSpans,
  spansLength,
  splitBlock,
  subtreeEnd,
  TEXT_TYPES,
  toggleMark,
  updateBlock,
  visibleBlocks,
  type Workspace,
} from '@rebonotes/core';
import { BLOCK_KINDS, type BlockKind, kindOf, TURN_INTO } from './blocktypes';
import { caretBox, caretOnEdgeLine, offsetAtPoint, placeCaret, readSpans, renderSpans, selectionIn, spansHtml } from './dom';
import { renderDatabase } from './database';
import { type EmbedFormat, renderEmbed } from './embed';
import { openEmojiPicker } from './emoji';
import { type Strings, say } from './i18n';
import { icon } from './icons';
import { type Menu, type MenuItem, openMenu } from './menu';
import { openPicker, type Picked } from './picker';

/** Where the caret is: in a block (offsets of its text), or in the title. */
export type Focus = { block: string; start: number; end?: number } | { title: true; start: number; end?: number };

export interface PageHost {
  /** Where menus are put. */
  readonly root: HTMLElement;
  readonly strings: Strings;
  workspace(): Workspace;
  /** The page changed by the editor: where the caret was before and is after, and what to join it to in the history. */
  commit(page: Page, before: Focus | undefined, after: Focus | undefined, group?: string): void;
  /** The title or the icon of the page changed. */
  rename(patch: { title?: string; icon?: string | null }, group?: string): void;
  navigate(id: string, focus?: 'title'): void;
  /** A new page under another; the workspace has it when this returns. */
  createPage(parent: string, title?: string): Page;
  undo(): void;
  redo(): void;
  search(): void;
  /** The address an image file is kept at; a data: address when the application gives none. */
  uploadImage?(file: File): Promise<string>;
  /** The address a file put in a page is kept at; a data: address when the application gives none. */
  uploadFile?(file: File): Promise<string>;
  /** The kinds of file shown in a page beyond what the browser shows: the formats of the suite. */
  readonly formats?: readonly EmbedFormat[];
  /** The language of the interface, for the viewers of the formats. */
  readonly language?: string;
}

const MARKS: Mark[] = ['bold', 'italic', 'underline', 'strike', 'code'];
const INDENT = 26;
const isMod = (e: KeyboardEvent | MouseEvent) => e.metaKey || e.ctrlKey;
const sameFocus = (a: Focus | undefined, b: Focus | undefined) => JSON.stringify(a) === JSON.stringify(b);

const readFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export class PageView {
  page: Page;
  readonly element: HTMLElement;
  private readonly host: PageHost;
  private readonly doc: Document;
  private readonly t: Strings;
  private readonly header: HTMLElement;
  private readonly iconButton: HTMLButtonElement;
  private readonly addIcon: HTMLButtonElement;
  private readonly title: HTMLElement;
  private readonly blocksEl: HTMLElement;
  private readonly backlinks: HTMLElement;
  private readonly drop: HTMLElement;
  private readonly toolbar: HTMLElement;
  private readonly els = new Map<string, { el: HTMLElement; block: Block }>();
  /** What takes down the viewers of the files shown, by their element. */
  private readonly shown = new Map<HTMLElement, () => void>();
  /** Blocks selected whole. */
  private selected: string[] = [];
  private slash?: { block: string; start: number; menu: Menu };
  /** Marks for what is typed next at a point, after ⌘B with nothing selected or after `**x**`. */
  private pending?: { block: string; at: number; marks: Mark[] };
  /** Where the caret was before the change the browser is making. */
  private before?: Focus;
  private composing = false;
  /** Blocks copied whole, by the Markdown they were copied as. */
  private clip?: { markdown: string; blocks: Block[] };
  private drag?: { ids: string[]; startY: number; startX: number; moved: boolean; target?: { before?: string; indent: number } };
  private readonly listeners: [EventTarget, string, EventListener, boolean?][] = [];
  /** The others in the page, by the block they are in. */
  private peers: { name: string; color: string; block?: string }[] = [];

  constructor(scroller: HTMLElement, host: PageHost, page: Page) {
    this.host = host;
    this.page = page;
    this.doc = scroller.ownerDocument;
    this.t = host.strings;
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '') => {
      const node = this.doc.createElement(tag);
      if (className) node.className = className;
      return node;
    };
    this.element = el('div', 'rn-page');
    this.header = el('div', 'rn-header');
    const tools = el('div', 'rn-header-tools');
    this.addIcon = el('button', 'rn-ghost');
    this.addIcon.type = 'button';
    this.addIcon.append(icon(this.doc, 'smile', 16), this.t.addIcon);
    this.addIcon.addEventListener('click', () => this.pickIcon(this.addIcon.getBoundingClientRect()));
    tools.append(this.addIcon);
    this.iconButton = el('button', 'rn-page-icon');
    this.iconButton.type = 'button';
    this.iconButton.setAttribute('aria-label', this.t.changeIcon);
    this.iconButton.addEventListener('click', () => this.pickIcon(this.iconButton.getBoundingClientRect()));
    this.title = el('h1', 'rn-title');
    this.title.contentEditable = 'true';
    this.title.spellcheck = true;
    this.title.dataset.placeholder = this.t.titlePlaceholder;
    this.header.append(this.iconButton, tools, this.title);
    this.blocksEl = el('div', 'rn-blocks');
    this.drop = el('div', 'rn-drop');
    this.drop.hidden = true;
    this.backlinks = el('div', 'rn-backlinks');
    const tail = el('div', 'rn-tail');
    tail.addEventListener('click', () => this.clickBelow());
    this.element.append(this.header, this.blocksEl, this.drop, tail, this.backlinks);
    scroller.append(this.element);

    this.toolbar = this.makeToolbar();

    this.listen(this.title, 'input', () => this.onTitleInput());
    this.listen(this.title, 'keydown', (e) => this.onTitleKey(e as KeyboardEvent));
    this.listen(this.title, 'paste', (e) => {
      const event = e as ClipboardEvent;
      event.preventDefault();
      const text = (event.clipboardData?.getData('text/plain') ?? '').replace(/\s+/g, ' ');
      this.doc.execCommand('insertText', false, text);
    });
    this.listen(this.blocksEl, 'keydown', (e) => this.onKey(e as KeyboardEvent));
    this.listen(this.blocksEl, 'beforeinput', (e) => this.onBeforeInput(e as InputEvent));
    this.listen(this.blocksEl, 'input', (e) => this.onInput(e));
    this.listen(this.blocksEl, 'compositionstart', () => {
      this.composing = true;
    });
    this.listen(this.blocksEl, 'compositionend', (e) => {
      this.composing = false;
      this.onInput(e);
    });
    this.listen(this.blocksEl, 'paste', (e) => this.onPaste(e as ClipboardEvent));
    this.listen(this.blocksEl, 'click', (e) => this.onClick(e as MouseEvent));
    this.listen(this.blocksEl, 'focusin', () => {
      if (this.selected.length && this.doc.activeElement !== this.blocksEl) this.select([]);
    });
    this.listen(this.blocksEl, 'pointerdown', (e) => this.onPointerDown(e as PointerEvent));
    // Files dropped on the page go where they are dropped.
    this.listen(this.element, 'dragover', (e) => {
      const event = e as DragEvent;
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    });
    this.listen(this.element, 'drop', (e) => {
      const event = e as DragEvent;
      const files = [...(event.dataTransfer?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      const under = this.blockOf(this.doc.elementFromPoint(event.clientX, event.clientY));
      void this.putFiles(files, under?.id ?? this.page.blocks[this.page.blocks.length - 1].id);
    });
    this.listen(this.doc, 'selectionchange', () => this.onSelectionChange());
    this.listen(this.doc, 'copy', (e) => this.onCopy(e as ClipboardEvent, false));
    this.listen(this.doc, 'cut', (e) => this.onCopy(e as ClipboardEvent, true));
    this.show(page);
  }

  private listen(target: EventTarget, type: string, handler: EventListener, capture = false): void {
    target.addEventListener(type, handler, capture);
    this.listeners.push([target, type, handler, capture]);
  }

  destroy(): void {
    for (const [target, type, handler, capture] of this.listeners) target.removeEventListener(type, handler, capture);
    for (const takeDown of this.shown.values()) takeDown();
    this.shown.clear();
    this.slash?.menu.close();
    this.toolbar.remove();
    this.element.remove();
  }

  // ——— Drawing ———

  /** Another page, drawn afresh. */
  show(page: Page, focus?: Focus): void {
    this.page = page;
    this.select([]);
    this.slash?.menu.close();
    for (const { el } of this.els.values()) el.remove();
    this.els.clear();
    this.title.textContent = page.title;
    this.update(page, focus);
  }

  /** The page as it is now (after undo, or a change from elsewhere): only what changed drawn again. */
  update(page: Page, focus?: Focus): void {
    this.page = page;
    this.drawHeader();
    this.reconcile();
    this.drawBacklinks();
    if (focus) this.focus(focus);
  }

  /** The titles of linked pages and the backlinks, after the workspace changed. */
  refresh(): void {
    this.drawHeader();
    for (const { el, block } of this.els.values()) if (block.type === 'page') el.replaceWith(this.redraw(block));
    for (const a of this.blocksEl.querySelectorAll<HTMLElement>('a.rn-mention')) a.classList.toggle('rn-missing', !pageById(this.host.workspace(), a.dataset.page));
    this.drawBacklinks();
  }

  /** The viewer of a file shown in an element that goes, taken down. */
  private takeDown(el: HTMLElement): void {
    this.shown.get(el)?.();
    this.shown.delete(el);
  }

  private redraw(block: Block): HTMLElement {
    const fresh = this.renderBlock(block);
    this.els.set(block.id, { el: fresh, block });
    return fresh;
  }

  private drawHeader(): void {
    const { icon: emoji, title } = this.page;
    this.iconButton.hidden = !emoji;
    this.iconButton.textContent = emoji ?? '';
    // The row with "Add icon" is only there while the page has none.
    this.addIcon.parentElement!.hidden = !!emoji;
    if (this.doc.activeElement !== this.title && this.title.textContent !== title) this.title.textContent = title;
    this.title.classList.toggle('rn-empty', !title);
  }

  private drawBacklinks(): void {
    const from = backlinksOf(this.host.workspace(), this.page.id);
    this.backlinks.replaceChildren();
    this.backlinks.hidden = !from.length;
    if (!from.length) return;
    const head = this.doc.createElement('div');
    head.className = 'rn-backlinks-head';
    head.textContent = `${this.t.linkedFrom} · ${from.length}`;
    this.backlinks.append(head);
    for (const page of from) {
      const a = this.doc.createElement('a');
      a.href = `#${page.id}`;
      a.className = 'rn-backlink';
      const mark = this.doc.createElement('span');
      if (page.icon) mark.textContent = page.icon;
      else mark.append(icon(this.doc, 'page', 16));
      a.append(mark, page.title || this.t.untitled);
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.host.navigate(page.id);
      });
      this.backlinks.append(a);
    }
  }

  private reconcile(): void {
    const shown = visibleBlocks(this.page.blocks);
    const keep = new Set(shown.map((b) => b.id));
    for (const [id, entry] of this.els) {
      if (!keep.has(id)) {
        this.takeDown(entry.el);
        entry.el.remove();
        this.els.delete(id);
      }
    }
    let previous: Element | null = null;
    for (const block of shown) {
      let entry = this.els.get(block.id);
      if (!entry) {
        entry = { el: this.renderBlock(block), block };
        this.els.set(block.id, entry);
      } else if (entry.block !== block) {
        const fresh = this.renderBlock(block);
        this.takeDown(entry.el);
        entry.el.replaceWith(fresh);
        entry = { el: fresh, block };
        this.els.set(block.id, entry);
      }
      const expected: ChildNode | null = previous ? previous.nextSibling : this.blocksEl.firstChild;
      if (expected !== entry.el) this.blocksEl.insertBefore(entry.el, expected);
      previous = entry.el;
    }
    // What depends on the blocks around: numbers, toggles without blocks inside them, the empty page.
    const blocks = this.page.blocks;
    for (const [index, block] of blocks.entries()) {
      const entry = this.els.get(block.id);
      if (!entry) continue;
      if (block.type === 'numbered') {
        const number = entry.el.querySelector('.rn-number');
        if (number) number.textContent = `${listNumber(blocks, index)}.`;
      }
      if (block.type === 'toggle') entry.el.classList.toggle('rn-childless', subtreeEnd(blocks, index) === index + 1);
      entry.el.classList.toggle('rn-selected', this.selected.includes(block.id));
    }
    this.drawPeers();
    const lone = blocks.length === 1 && blocks[0].type === 'paragraph' && !blocks[0].text.length;
    this.element.classList.toggle('rn-page-empty', lone);
  }

  private renderBlock(block: Block): HTMLElement {
    const doc = this.doc;
    const t = this.t;
    const el = doc.createElement('div');
    el.className = 'rn-block';
    el.dataset.id = block.id;
    el.dataset.type = block.type;
    el.style.setProperty('--indent', String(block.indent ?? 0));
    const handle = doc.createElement('div');
    handle.className = 'rn-handle';
    handle.contentEditable = 'false';
    const add = doc.createElement('button');
    add.type = 'button';
    add.className = 'rn-add';
    add.title = t.addBlock;
    add.append(icon(doc, 'plus', 16));
    const grip = doc.createElement('button');
    grip.type = 'button';
    grip.className = 'rn-grip';
    grip.title = t.dragBlock;
    grip.append(icon(doc, 'grip', 16));
    handle.append(add, grip);
    el.append(handle);

    const row = doc.createElement('div');
    row.className = 'rn-row';
    const text = () => {
      const node = doc.createElement('div');
      node.className = 'rn-text';
      node.contentEditable = 'true';
      node.spellcheck = block.type !== 'code';
      node.dataset.placeholder = this.placeholderOf(block);
      renderSpans(node, block.text, (id) => pageById(this.host.workspace(), id)?.title);
      return node;
    };
    switch (block.type) {
      case 'bulleted': {
        const bullet = doc.createElement('span');
        bullet.className = 'rn-marker rn-bullet';
        bullet.contentEditable = 'false';
        bullet.textContent = ['•', '◦', '▪'][(block.indent ?? 0) % 3];
        row.append(bullet, text());
        break;
      }
      case 'numbered': {
        const number = doc.createElement('span');
        number.className = 'rn-marker rn-number';
        number.contentEditable = 'false';
        row.append(number, text());
        break;
      }
      case 'todo': {
        const check = doc.createElement('button');
        check.type = 'button';
        check.className = 'rn-marker rn-check';
        check.setAttribute('role', 'checkbox');
        check.setAttribute('aria-checked', String(!!block.checked));
        if (block.checked) check.append(icon(doc, 'todo', 14));
        el.classList.toggle('rn-done', !!block.checked);
        row.append(check, text());
        break;
      }
      case 'toggle': {
        const arrow = doc.createElement('button');
        arrow.type = 'button';
        arrow.className = 'rn-marker rn-arrow';
        arrow.setAttribute('aria-expanded', String(!block.folded));
        arrow.append(icon(doc, 'chevronRight', 16));
        row.append(arrow, text());
        el.append(row);
        const empty = doc.createElement('button');
        empty.type = 'button';
        empty.className = 'rn-toggle-empty';
        empty.textContent = t.emptyToggle;
        empty.hidden = !!block.folded;
        el.append(empty);
        return el;
      }
      case 'callout': {
        const emoji = doc.createElement('button');
        emoji.type = 'button';
        emoji.className = 'rn-marker rn-callout-icon';
        emoji.textContent = block.icon ?? '💡';
        row.append(emoji, text());
        break;
      }
      case 'code': {
        const lang = doc.createElement('input');
        lang.className = 'rn-code-lang';
        lang.value = block.language ?? '';
        lang.placeholder = 'text';
        lang.spellcheck = false;
        lang.setAttribute('aria-label', 'Language');
        lang.addEventListener('change', () => this.change(updateBlock(this.page, block.id, { language: lang.value.trim() || undefined })));
        lang.addEventListener('keydown', (e) => e.stopPropagation());
        row.append(lang, text());
        break;
      }
      case 'divider': {
        const line = doc.createElement('div');
        line.className = 'rn-divider';
        line.append(doc.createElement('hr'));
        row.append(line);
        break;
      }
      case 'image': {
        const figure = doc.createElement('figure');
        figure.className = 'rn-figure';
        if (block.src) {
          const img = doc.createElement('img');
          img.src = block.src;
          img.alt = plainText(block.text);
          img.draggable = false;
          figure.append(img);
          this.resizable(figure, block, false);
        } else {
          const empty = doc.createElement('div');
          empty.className = 'rn-image-empty';
          empty.contentEditable = 'false';
          const upload = doc.createElement('button');
          upload.type = 'button';
          upload.className = 'rn-image-upload';
          upload.append(icon(doc, 'image', 18), t.imageUpload);
          const address = doc.createElement('button');
          address.type = 'button';
          address.className = 'rn-image-address';
          address.append(icon(doc, 'link', 18), t.imageUrl);
          empty.append(upload, address);
          figure.append(empty);
        }
        const caption = text();
        caption.classList.add('rn-caption');
        caption.dataset.placeholder = t.placeholderCaption;
        figure.append(caption);
        row.append(figure);
        break;
      }
      case 'page': {
        const target = pageById(this.host.workspace(), block.page);
        const a = doc.createElement('a');
        a.className = 'rn-pagelink';
        a.href = `#${block.page ?? ''}`;
        const mark = doc.createElement('span');
        mark.className = 'rn-pagelink-icon';
        if (target?.icon) mark.textContent = target.icon;
        else mark.append(icon(doc, 'page', 18));
        const label = doc.createElement('span');
        label.textContent = target ? target.title || t.untitled : t.missingPage;
        if (!target) a.classList.add('rn-missing');
        a.append(mark, label);
        row.append(a);
        break;
      }
      case 'embed': {
        const box = doc.createElement('div');
        this.shown.set(el, renderEmbed(box, block.src ?? '', plainText(block.text), this.host.formats ?? [], t, this.host.language ?? 'en'));
        const body = box.querySelector<HTMLElement>('.rn-embed-body');
        if (body && block.height) body.style.height = `${block.height}px`;
        this.resizable(box, block, !!body);
        row.append(box);
        break;
      }
      case 'database': {
        const table = block.table ?? createTable(t.firstColumn);
        row.append(
          renderDatabase(doc, table, {
            root: this.host.root,
            strings: t,
            change: (next, focus) => {
              this.change(updateBlock(this.page, block.id, { table: next }));
              // The focus back in the cell it was in, in the database drawn again.
              if (focus) {
                const target = this.els.get(block.id)?.el.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`);
                target?.focus();
                if (target instanceof HTMLInputElement && target.type === 'text') target.select();
              }
            },
          }),
        );
        break;
      }
      default:
        row.append(text());
    }
    el.append(row);
    return el;
  }

  /**
   * Handles on the sides of an image or a file that pull it narrower or wider
   * (kept in the middle of the page), and for a file shown, one under it
   * that pulls it taller or shorter. What is pulled is kept when let go.
   */
  private resizable(box: HTMLElement, block: Block, tall: boolean): void {
    const doc = this.doc;
    box.classList.add('rn-sized');
    if (block.width) box.style.width = `${block.width}%`;
    const handle = (side: 'left' | 'right' | 'bottom') => {
      const h = doc.createElement('div');
      h.className = `rn-size rn-size-${side}`;
      h.contentEditable = 'false';
      h.title = this.t.resize;
      h.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const row = box.parentElement!.getBoundingClientRect();
        const body = box.querySelector<HTMLElement>('.rn-embed-body');
        const startY = e.clientY;
        const startHeight = body?.getBoundingClientRect().height ?? 0;
        let width = block.width;
        let height = block.height;
        box.classList.add('rn-sizing');
        const move = (ev: PointerEvent) => {
          if (side === 'bottom') {
            height = Math.round(Math.max(160, Math.min(1400, startHeight + ev.clientY - startY)));
            if (body) body.style.height = `${height}px`;
          } else {
            // Kept in the middle: as far from the middle on both sides as the pointer is on one.
            const half = Math.abs(ev.clientX - (row.left + row.width / 2));
            width = Math.round(Math.max(15, Math.min(100, ((2 * half) / row.width) * 100)));
            box.style.width = `${width}%`;
          }
        };
        const up = () => {
          doc.removeEventListener('pointermove', move);
          doc.removeEventListener('pointerup', up);
          box.classList.remove('rn-sizing');
          const patch = side === 'bottom' ? { height } : { width: width && width < 100 ? width : undefined };
          if (patch.width !== block.width || patch.height !== block.height) this.change(updateBlock(this.page, block.id, patch));
        };
        doc.addEventListener('pointermove', move);
        doc.addEventListener('pointerup', up);
      });
      box.append(h);
    };
    handle('left');
    handle('right');
    if (tall) handle('bottom');
  }

  private placeholderOf(block: Block): string {
    const t = this.t;
    switch (block.type) {
      case 'heading1':
        return say(t.placeholderHeading, { n: '1' });
      case 'heading2':
        return say(t.placeholderHeading, { n: '2' });
      case 'heading3':
        return say(t.placeholderHeading, { n: '3' });
      case 'bulleted':
      case 'numbered':
        return t.placeholderList;
      case 'todo':
        return t.placeholderTodo;
      case 'toggle':
        return t.placeholderToggle;
      case 'quote':
        return t.placeholderQuote;
      case 'code':
        return '';
      default:
        return t.placeholder;
    }
  }

  // ——— Where things are ———

  private textEl(id: string): HTMLElement | undefined {
    return this.els.get(id)?.el.querySelector<HTMLElement>('.rn-text') ?? undefined;
  }

  private blockOf(node: EventTarget | Node | null): { id: string; el: HTMLElement; text?: HTMLElement } | undefined {
    const el = (node instanceof Element ? node : (node as Node | null)?.parentElement)?.closest<HTMLElement>('.rn-block');
    if (!el?.dataset.id || !this.blocksEl.contains(el)) return undefined;
    const text = (node instanceof Element ? node : (node as Node).parentElement)?.closest<HTMLElement>('.rn-text') ?? undefined;
    return { id: el.dataset.id, el, text };
  }

  private block(id: string): Block | undefined {
    return this.page.blocks[blockIndex(this.page, id)];
  }

  /** Where the caret is now. */
  focusNow(): Focus | undefined {
    if (this.doc.activeElement === this.title) {
      const s = selectionIn(this.title);
      return s ? { title: true, start: s.start, end: s.end } : undefined;
    }
    const selection = this.doc.getSelection();
    const found = selection?.anchorNode ? this.blockOf(selection.anchorNode) : undefined;
    if (!found?.text) return undefined;
    const s = selectionIn(found.text);
    return s ? { block: found.id, start: s.start, ...(s.end !== s.start ? { end: s.end } : {}) } : undefined;
  }

  /** The caret put somewhere; -1 is the end. */
  focus(focus: Focus): void {
    if ('title' in focus) {
      this.title.focus({ preventScroll: true });
      placeCaret(this.title, focus.start, focus.end ?? focus.start);
      return;
    }
    const el = this.textEl(focus.block);
    if (!el) {
      if (this.els.has(focus.block)) this.select([focus.block]);
      return;
    }
    el.focus({ preventScroll: true });
    placeCaret(el, focus.start, focus.end ?? focus.start);
    this.els.get(focus.block)?.el.scrollIntoView({ block: 'nearest' });
  }

  /** The caret at the start of the first block, or in the title of an empty page. */
  focusStart(): void {
    if (!this.page.title) this.focus({ title: true, start: 0 });
    else {
      const first = visibleBlocks(this.page.blocks).find((b) => TEXT_TYPES.has(b.type));
      if (first) this.focus({ block: first.id, start: 0 });
    }
  }

  focusTitle(): void {
    this.focus({ title: true, start: -1 });
  }

  /** The blocks the caret can go to, in order. */
  private textBlocks(): Block[] {
    return visibleBlocks(this.page.blocks).filter((b) => TEXT_TYPES.has(b.type) || b.type === 'image');
  }

  // ——— Changing the page ———

  /** A change made by a command: drawn, the caret put where it goes, and told to the host. */
  private change(page: Page, after?: Focus, group?: string): void {
    const before = this.focusNow() ?? this.before;
    this.page = page;
    this.reconcile();
    if (after) this.focus(after);
    this.host.commit(page, before, after ?? this.focusNow(), group);
  }

  private onBeforeInput(e: InputEvent): void {
    this.before = this.focusNow();
    const found = this.blockOf(e.target as Node);
    if (!found?.text) return;
    switch (e.inputType) {
      case 'formatBold':
      case 'formatItalic':
      case 'formatUnderline':
      case 'formatStrikeThrough': {
        e.preventDefault();
        const mark = ({ formatBold: 'bold', formatItalic: 'italic', formatUnderline: 'underline', formatStrikeThrough: 'strike' } as const)[e.inputType];
        this.toggleMark(mark);
        break;
      }
      case 'historyUndo':
        e.preventDefault();
        this.host.undo();
        break;
      case 'historyRedo':
        e.preventDefault();
        this.host.redo();
        break;
      case 'insertParagraph':
        e.preventDefault();
        this.enter(found.id, found.text, false);
        break;
      case 'insertLineBreak':
        e.preventDefault();
        this.enter(found.id, found.text, true);
        break;
    }
  }

  private onInput(e: Event): void {
    if (this.composing) return;
    const found = this.blockOf(e.target as Node);
    if (!found?.text) return;
    const block = this.block(found.id);
    if (!block) return;
    const el = found.text;
    let spans = block.type === 'code' ? [{ text: el.textContent ?? '' }].filter((s) => s.text) : readSpans(el);
    const caret = selectionIn(el)?.start ?? spansLength(spans);
    const old = plainText(block.text);
    const now = plainText(spans);
    const inserted = now.length === old.length + 1 && now.slice(0, caret - 1) + now.slice(caret) === old ? now[caret - 1] : undefined;
    // Marks chosen for what is typed next.
    const pending = this.pending;
    if (pending && pending.block === block.id && caret > pending.at && now.length - old.length === caret - pending.at) {
      for (const mark of MARKS) spans = toggleMark(spans, pending.at, caret, mark, pending.marks.includes(mark));
      pending.at = caret;
    } else this.pending = undefined;

    let next = updateBlock(this.page, block.id, { text: spans });
    let after: Focus = { block: block.id, start: caret };
    let redraw = false;
    const prefix = now.slice(0, caret);

    // Markdown at the start of a line.
    if (block.type === 'paragraph' && inserted !== undefined) {
      const made = this.markdownStart(prefix, inserted);
      if (made) {
        const rest = deleteText(spans, 0, prefix.length);
        if (made.type === 'divider') {
          const fresh = createBlock('paragraph', rest, block.indent ? { indent: block.indent } : {});
          next = setBlockType(next, block.id, 'divider');
          next = insertBlocks(next, blockIndex(next, block.id) + 1, [fresh]);
          after = { block: fresh.id, start: 0 };
        } else {
          next = updateBlock(next, block.id, { text: rest });
          next = setBlockType(next, block.id, made.type, made.extra);
          after = { block: block.id, start: 0 };
        }
        this.page = next;
        this.reconcile();
        this.focus(after);
        this.host.commit(next, this.before, after);
        return;
      }
    }
    // Marks written as Markdown: **bold**, *italic*, `code`, ~~struck~~.
    if (inserted !== undefined && block.type !== 'code') {
      const marked = this.markdownMark(prefix);
      if (marked) {
        const { from, inner, open, mark } = marked;
        spans = deleteText(spans, caret - open.length, caret);
        spans = deleteText(spans, from, from + open.length);
        spans = toggleMark(spans, from, from + inner, mark, true);
        next = updateBlock(this.page, block.id, { text: spans });
        after = { block: block.id, start: from + inner };
        this.pending = { block: block.id, at: from + inner, marks: [] };
        redraw = true;
      }
    }

    const fresh = next.blocks[blockIndex(next, block.id)];
    const entry = this.els.get(block.id);
    if (entry) entry.block = fresh;
    this.page = next;
    // The browser's elements are the page's again when it made others (a <font>, a <div>).
    if (redraw || (block.type !== 'code' && el.innerHTML !== spansHtml(this.doc, fresh.text, (id) => pageById(this.host.workspace(), id)?.title))) {
      renderSpans(el, fresh.text, (id) => pageById(this.host.workspace(), id)?.title);
      placeCaret(el, 'start' in after ? after.start : caret);
    } else el.classList.toggle('rn-empty', !now);
    this.reconcile();
    this.host.commit(next, this.before, after, `text:${block.id}`);
    this.before = after;

    // The menus opened by what was typed.
    if (inserted === '/' && (caret === 1 || /\s/.test(now[caret - 2]))) this.openSlash(block.id, caret - 1);
    else if (this.slash) this.updateSlash(now, caret);
    if (inserted === '[' && now.slice(caret - 2, caret) === '[[') void this.linkPageAt(block.id, caret - 2);
  }

  /** The block a line starting with Markdown makes, once its space (or last character) is typed. */
  private markdownStart(prefix: string, inserted: string): { type: BlockType; extra?: Partial<Block> } | undefined {
    if (inserted === ' ') {
      const m = prefix.match(/^(#{1,3}|[-*+]|\d+[.)]|\[( |x|X)?\]|>) $/);
      if (!m) return undefined;
      const mark = m[1];
      if (mark.startsWith('#')) return { type: (['heading1', 'heading2', 'heading3'] as const)[mark.length - 1] };
      if (/^[-*+]$/.test(mark)) return { type: 'bulleted' };
      if (/^\d/.test(mark)) return { type: 'numbered' };
      if (mark.startsWith('[')) return { type: 'todo', extra: /x/i.test(mark) ? { checked: true } : {} };
      return { type: 'quote' };
    }
    if (prefix === '```') return { type: 'code' };
    if (prefix === '---') return { type: 'divider' };
    return undefined;
  }

  private markdownMark(prefix: string): { from: number; inner: number; open: string; mark: Mark } | undefined {
    const patterns: [RegExp, string, Mark][] = [
      [/(?:^|[^`])(`)([^`]+)`$/, '`', 'code'],
      [/(?:^|[^*])(\*\*)([^*\s](?:[^*]*[^*\s])?)\*\*$/, '**', 'bold'],
      [/(?:^|[^*])(\*)([^*\s](?:[^*]*[^*\s])?)\*$/, '*', 'italic'],
      [/(?:^|[^~])(~~)([^~\s](?:[^~]*[^~\s])?)~~$/, '~~', 'strike'],
    ];
    for (const [re, open, mark] of patterns) {
      const m = prefix.match(re);
      if (!m || m.index === undefined) continue;
      const from = m.index + m[0].length - m[1].length - m[2].length - open.length;
      return { from, inner: m[2].length, open, mark };
    }
    return undefined;
  }

  /** Enter: a block cut in two; a line break with Shift, and in code. */
  private enter(id: string, el: HTMLElement, lineBreak: boolean): void {
    const block = this.block(id);
    const sel = selectionIn(el);
    if (!block || !sel) return;
    let page = this.page;
    if (sel.end > sel.start) page = updateBlock(page, id, { text: deleteText(block.text, sel.start, sel.end) });
    if (lineBreak || block.type === 'code' || block.type === 'image') {
      if (block.type === 'image') return;
      const current = page.blocks[blockIndex(page, id)];
      const text = block.type === 'code' ? [{ text: plainText(insertText(current.text, sel.start, '\n')) }] : insertText(current.text, sel.start, '\n');
      this.change(updateBlock(page, id, { text }), { block: id, start: sel.start + 1 });
      return;
    }
    const result = splitBlock(page, id, sel.start);
    this.change(result.page, { block: result.focus, start: result.offset });
  }

  private onTitleInput(): void {
    const title = (this.title.textContent ?? '').replace(/\n/g, ' ');
    this.title.classList.toggle('rn-empty', !title);
    this.host.rename({ title }, `title:${this.page.id}`);
  }

  private onTitleKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = this.page.blocks[0];
      if (first && first.type === 'paragraph' && !first.text.length) this.focus({ block: first.id, start: 0 });
      else {
        const fresh = createBlock();
        this.change(insertBlocks(this.page, 0, [fresh]), { block: fresh.id, start: 0 });
      }
    } else if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && selectionIn(this.title)?.start === (this.title.textContent ?? '').length)) {
      const first = this.textBlocks()[0];
      if (first && (e.key === 'ArrowRight' || caretOnEdgeLine(this.title, 'last'))) {
        e.preventDefault();
        this.focus({ block: first.id, start: 0 });
      }
    } else if (isMod(e) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.host.redo();
      else this.host.undo();
    }
  }

  // ——— Keys ———

  private onKey(e: KeyboardEvent): void {
    if (this.selected.length && e.target === this.blocksEl) {
      this.onSelectionKey(e);
      return;
    }
    const found = this.blockOf(e.target as Node);
    if (!found?.text || e.isComposing) return;
    const { id, text: el } = found;
    const block = this.block(id);
    if (!block) return;
    const sel = selectionIn(el) ?? { start: 0, end: 0 };
    const length = spansLength(block.text);
    const key = e.key;
    const mod = isMod(e);

    if (this.slash?.menu.open) {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        this.slash.menu.move(key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (key === 'Enter' || key === 'Tab') {
        e.preventDefault();
        this.slash.menu.choose();
        return;
      }
      if (key === 'Escape') {
        e.preventDefault();
        this.closeSlash();
        return;
      }
    }

    if (mod && !e.altKey) {
      const k = key.toLowerCase();
      if (k === 'b' || k === 'i' || k === 'u') {
        e.preventDefault();
        this.toggleMark(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline');
        return;
      }
      if ((k === 's' || k === 'x') && e.shiftKey) {
        e.preventDefault();
        this.toggleMark('strike');
        return;
      }
      if (k === 'e') {
        e.preventDefault();
        this.toggleMark('code');
        return;
      }
      if (k === 'k') {
        e.preventDefault();
        if (sel.end > sel.start) void this.editLink();
        else this.host.search();
        return;
      }
      if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.host.redo();
        else this.host.undo();
        return;
      }
      if (k === 'y') {
        e.preventDefault();
        this.host.redo();
        return;
      }
      if (k === 'd') {
        e.preventDefault();
        const result = duplicateBlock(this.page, id);
        this.change(result.page, { block: result.focus, start: sel.start });
        return;
      }
      if (k === 'a' && sel.start === 0 && sel.end === length) {
        e.preventDefault();
        this.select(visibleBlocks(this.page.blocks).map((b) => b.id));
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        if (block.type === 'todo') this.change(updateBlock(this.page, id, { checked: !block.checked || undefined }), { block: id, start: sel.start });
        else if (block.type === 'toggle') this.change(updateBlock(this.page, id, { folded: !block.folded || undefined }), { block: id, start: sel.start });
        else if (block.type === 'code') {
          const fresh = createBlock('paragraph', '', block.indent ? { indent: block.indent } : {});
          this.change(insertBlocks(this.page, blockIndex(this.page, id) + 1, [fresh]), { block: fresh.id, start: 0 });
        }
        return;
      }
      if (e.shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
        e.preventDefault();
        this.moveBy([id], key === 'ArrowUp' ? -1 : 1, { block: id, start: sel.start });
        return;
      }
      return;
    }

    switch (key) {
      case 'Enter':
        e.preventDefault();
        this.enter(id, el, e.shiftKey);
        return;
      case 'Backspace':
        if (sel.start === 0 && sel.end === 0) {
          e.preventDefault();
          this.backspace(id);
        }
        return;
      case 'Delete':
        if (sel.start === length && sel.end === length) {
          e.preventDefault();
          this.deleteForward(id);
        }
        return;
      case 'Tab':
        e.preventDefault();
        if (block.type === 'code' && !e.shiftKey) {
          this.change(
            updateBlock(this.page, id, { text: [{ text: plainText(insertText(deleteText(block.text, sel.start, sel.end), sel.start, '  ')) }] }),
            { block: id, start: sel.start + 2 },
            `text:${id}`,
          );
          return;
        }
        this.change(indentBlock(this.page, id, e.shiftKey ? -1 : 1), { block: id, start: sel.start, end: sel.end });
        return;
      case 'ArrowUp':
      case 'ArrowDown': {
        if (e.shiftKey || e.altKey) return;
        const up = key === 'ArrowUp';
        if (!caretOnEdgeLine(el, up ? 'first' : 'last')) return;
        const list = this.textBlocks();
        const target = list[list.findIndex((b) => b.id === id) + (up ? -1 : 1)];
        if (!target) {
          if (up) {
            e.preventDefault();
            this.focusTitle();
          }
          return;
        }
        e.preventDefault();
        const x = caretBox(el).left;
        const next = this.textEl(target.id)!;
        const box = next.getBoundingClientRect();
        const offset = offsetAtPoint(next, x, up ? box.bottom - 4 : box.top + 4);
        this.focus({ block: target.id, start: offset ?? (up ? -1 : 0) });
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (e.shiftKey || e.altKey || sel.start !== sel.end) return;
        const left = key === 'ArrowLeft';
        if (left ? sel.start !== 0 : sel.start !== length) return;
        const list = this.textBlocks();
        const target = list[list.findIndex((b) => b.id === id) + (left ? -1 : 1)];
        if (!target) {
          if (left) {
            e.preventDefault();
            this.focusTitle();
          }
          return;
        }
        e.preventDefault();
        this.focus({ block: target.id, start: left ? -1 : 0 });
        return;
      }
      case 'Escape':
        e.preventDefault();
        this.select([id]);
        return;
    }
  }

  private backspace(id: string): void {
    // A database or a file before it is not taken away by a key: it is selected, and this block goes if it is empty.
    const shownBlocks = visibleBlocks(this.page.blocks);
    const previous = shownBlocks[shownBlocks.findIndex((b) => b.id === id) - 1];
    const block0 = this.block(id);
    if (previous && (previous.type === 'database' || previous.type === 'embed') && block0 && !block0.indent && (block0.type === 'paragraph' || !TEXT_TYPES.has(block0.type))) {
      if (!block0.text.length && this.page.blocks.length > 1) this.change(removeBlocks(this.page, [id]));
      this.select([previous.id]);
      return;
    }
    const result = joinBackward(this.page, id);
    if (result) {
      this.change(result.page, { block: result.focus, start: result.offset });
      return;
    }
    // The first block: up to the title, the block taken away when it is empty and not the only one.
    const block = this.block(id);
    if (block && !block.text.length && this.page.blocks.length > 1) {
      this.page = removeBlocks(this.page, [id]);
      this.reconcile();
      this.host.commit(this.page, { block: id, start: 0 }, { title: true, start: -1 });
    }
    this.focusTitle();
  }

  private deleteForward(id: string): void {
    const list = this.textBlocks();
    const block = this.block(id)!;
    const next = list[list.findIndex((b) => b.id === id) + 1];
    if (!next || next.type === 'image' || block.type === 'image') return;
    const offset = spansLength(block.text);
    const text = block.type === 'code' ? [{ text: plainText(block.text) + plainText(next.text) }] : joinSpans(block.text, next.text);
    const page = removeBlocks(updateBlock(this.page, id, { text }), [next.id]);
    this.change(page, { block: id, start: offset });
  }

  /** Blocks moved one place up or down among their siblings, each with what is under it. */
  private moveBy(ids: string[], by: -1 | 1, focus?: Focus): void {
    const blocks = this.page.blocks;
    const first = blockIndex(this.page, ids[0]);
    const last = subtreeEnd(blocks, blockIndex(this.page, ids[ids.length - 1]));
    const indent = blocks[first].indent ?? 0;
    let before: string | undefined;
    if (by < 0) {
      // Before the sibling above, at the same level or out.
      let i = first - 1;
      while (i >= 0 && (blocks[i].indent ?? 0) > indent) i--;
      if (i < 0) return;
      before = blocks[i].id;
    } else {
      if (last >= blocks.length) return;
      const after = subtreeEnd(blocks, last);
      before = blocks[after]?.id;
    }
    this.change(moveBlocks(this.page, ids, before), focus);
    if (!focus) this.select(ids);
  }

  // ——— Marks and links ———

  /** A mark on the selected text, or off it; with nothing selected, on what is typed next. */
  toggleMark(mark: Mark): void {
    const focus = this.focusNow();
    if (!focus || 'title' in focus) return;
    const block = this.block(focus.block);
    if (!block || block.type === 'code') return;
    const end = focus.end ?? focus.start;
    if (end === focus.start) {
      const current =
        this.pending?.block === block.id && this.pending.at === focus.start
          ? this.pending.marks
          : block.text.length
            ? (sliceSpans(block.text, Math.max(0, focus.start - 1), focus.start)[0]?.marks ?? [])
            : [];
      const marks = current.includes(mark) ? current.filter((m) => m !== mark) : [...current, mark];
      this.pending = { block: block.id, at: focus.start, marks };
      this.drawToolbar();
      return;
    }
    const text = toggleMark(block.text, focus.start, end, mark);
    this.change(updateBlock(this.page, block.id, { text }), { block: block.id, start: focus.start, end });
    this.drawToolbar();
  }

  /** A link on the selected text: an address or a page, chosen in the picker; taken off when it has one. */
  async editLink(): Promise<void> {
    const focus = this.focusNow();
    if (!focus || 'title' in focus || focus.end === undefined) return;
    const block = this.block(focus.block);
    if (!block) return;
    const { start, end } = { start: focus.start, end: focus.end };
    const part = sliceSpans(block.text, start, end);
    if (part.length && part.every((s) => s.link || s.page)) {
      this.change(updateBlock(this.page, block.id, { text: setLink(block.text, start, end, undefined) }), { block: block.id, start, end });
      return;
    }
    const anchor = caretBox(this.textEl(block.id)!);
    const picked = await openPicker(this.host.root, { workspace: this.host.workspace(), strings: this.t, anchor, placeholder: this.t.urlPlaceholder, allowUrl: true, allowNew: true, exclude: [] });
    if (!picked) {
      this.focus({ block: block.id, start, end });
      return;
    }
    const link = this.linkOf(picked);
    const current = this.block(block.id)!;
    this.change(updateBlock(this.page, block.id, { text: setLink(current.text, start, end, link) }), { block: block.id, start: end });
  }

  private linkOf(picked: Picked): { url?: string; page?: string } {
    if ('url' in picked) return { url: picked.url };
    if ('page' in picked) return { page: picked.page };
    return { page: this.host.createPage(this.page.id, picked.create).id };
  }

  /** `[[` typed: the picker, and the page chosen linked in place of the brackets. */
  private async linkPageAt(id: string, at: number): Promise<void> {
    const el = this.textEl(id);
    if (!el) return;
    const anchor = caretBox(el);
    const picked = await openPicker(this.host.root, { workspace: this.host.workspace(), strings: this.t, anchor, placeholder: this.t.linkPlaceholder, allowNew: true, exclude: [this.page.id] });
    const block = this.block(id);
    if (!block) return;
    if (!picked || 'url' in picked) {
      this.focus({ block: id, start: at + 2 });
      return;
    }
    const link = this.linkOf(picked);
    const title = pageById(this.host.workspace(), link.page)?.title || this.t.untitled;
    let text = deleteText(block.text, at, at + 2);
    text = insertText(text, at, title, { page: link.page });
    text = insertText(text, at + title.length, ' ', {});
    this.change(updateBlock(this.page, id, { text }), { block: id, start: at + title.length + 1 });
  }

  private makeToolbar(): HTMLElement {
    const bar = this.doc.createElement('div');
    bar.className = 'rn-toolbar';
    bar.hidden = true;
    bar.setAttribute('role', 'toolbar');
    bar.addEventListener('pointerdown', (e) => e.preventDefault());
    const add = (name: string, label: string, run: () => void, keys?: string) => {
      const b = this.doc.createElement('button');
      b.type = 'button';
      b.dataset.name = name;
      b.title = keys ? `${label} (${keys})` : label;
      b.setAttribute('aria-label', label);
      b.append(icon(this.doc, name, 18));
      b.addEventListener('click', run);
      bar.append(b);
    };
    const turn = this.doc.createElement('button');
    turn.type = 'button';
    turn.className = 'rn-toolbar-turn';
    turn.addEventListener('click', () => {
      const focus = this.focusNow();
      if (focus && 'block' in focus) this.openBlockMenu(focus.block, turn.getBoundingClientRect(), true);
    });
    bar.append(turn);
    add('bold', this.t.bold, () => this.toggleMark('bold'));
    add('italic', this.t.italic, () => this.toggleMark('italic'));
    add('underline', this.t.underline, () => this.toggleMark('underline'));
    add('strike', this.t.strike, () => this.toggleMark('strike'));
    add('code', this.t.code, () => this.toggleMark('code'));
    add('link', this.t.link, () => void this.editLink());
    this.host.root.append(bar);
    return bar;
  }

  private onSelectionChange(): void {
    const focus = this.focusNow();
    if (this.pending && (!focus || !('block' in focus) || focus.block !== this.pending.block || focus.start !== this.pending.at)) this.pending = undefined;
    this.drawToolbar();
  }

  private drawToolbar(): void {
    const focus = this.focusNow();
    const block = focus && 'block' in focus ? this.block(focus.block) : undefined;
    if (!focus || !('block' in focus) || focus.end === undefined || !block || block.type === 'code') {
      this.toolbar.hidden = true;
      return;
    }
    const range = this.doc.getSelection()!.getRangeAt(0);
    const box = range.getBoundingClientRect();
    for (const b of this.toolbar.querySelectorAll<HTMLButtonElement>('button[data-name]')) {
      const name = b.dataset.name!;
      const on = name === 'link' ? sliceSpans(block.text, focus.start, focus.end).every((s) => s.link || s.page) : hasMark(block.text, focus.start, focus.end, name as Mark);
      b.setAttribute('aria-pressed', String(on));
    }
    const turn = this.toolbar.querySelector<HTMLButtonElement>('.rn-toolbar-turn')!;
    turn.replaceChildren(this.t[kindOf(block.type)?.label ?? 'typeParagraph'], icon(this.doc, 'chevronDown', 14));
    this.toolbar.hidden = false;
    const own = this.toolbar.getBoundingClientRect();
    const view = this.doc.defaultView!;
    this.toolbar.style.left = `${Math.max(8, Math.min(box.left + box.width / 2 - own.width / 2, view.innerWidth - own.width - 8))}px`;
    this.toolbar.style.top = `${box.top - own.height - 8 > 8 ? box.top - own.height - 8 : box.bottom + 8}px`;
  }

  // ——— The slash menu ———

  private openSlash(id: string, start: number): void {
    this.slash?.menu.close();
    const el = this.textEl(id);
    if (!el) return;
    const items: MenuItem[] = BLOCK_KINDS.map((kind) => ({
      id: kind.id,
      label: this.t[kind.label],
      hint: this.t[kind.hint],
      icon: kind.icon,
      words: kind.words,
      section: this.t.blocks,
      keys: kind.markdown,
      run: () => void this.applyKind(id, kind, start),
    }));
    const menu = openMenu(this.host.root, caretBox(el), items, { empty: this.t.noResults, className: 'rn-slash', onClose: () => this.slash?.menu === menu && (this.slash = undefined) });
    this.slash = { block: id, start, menu };
  }

  private updateSlash(text: string, caret: number): void {
    const slash = this.slash!;
    const query = text.slice(slash.start + 1, caret);
    if (caret <= slash.start || text[slash.start] !== '/' || /\n/.test(query) || query.length > 20) {
      this.closeSlash();
      return;
    }
    if (!slash.menu.filter(query) && query.length > 3) this.closeSlash();
  }

  private closeSlash(): void {
    this.slash?.menu.close();
    this.slash = undefined;
  }

  /** A kind chosen in the slash menu: the `/query` taken away, and the block made or turned into it. */
  private async applyKind(id: string, kind: BlockKind, start: number): Promise<void> {
    this.slash = undefined;
    const block = this.block(id);
    const el = this.textEl(id);
    if (!block || !el) return;
    const caret = selectionIn(el)?.start ?? spansLength(block.text);
    const text = deleteText(block.text, start, Math.max(start + 1, caret));
    let page = updateBlock(this.page, id, { text });
    const empty = !text.length;
    const index = blockIndex(page, id);
    const indent = block.indent ? { indent: block.indent } : {};
    /** A block in place of this one when it is empty, after it otherwise. */
    const place = (fresh: Block): Page => (empty ? insertBlocks(removeBlocks(page, [id]), index, [fresh]) : insertBlocks(page, index + 1, [fresh]));

    if (kind.id === 'link') {
      this.page = page;
      this.reconcile();
      const picked = await openPicker(this.host.root, {
        workspace: this.host.workspace(),
        strings: this.t,
        anchor: caretBox(el),
        placeholder: this.t.linkPlaceholder,
        allowNew: true,
        exclude: [this.page.id],
      });
      if (!picked || 'url' in picked) {
        this.change(page, { block: id, start });
        return;
      }
      const target = this.linkOf(picked).page!;
      const fresh = createBlock('page', pageById(this.host.workspace(), target)?.title ?? '', { page: target, ...indent });
      page = place(fresh);
      const after = createBlock('paragraph', '', indent);
      page = insertBlocks(page, blockIndex(page, fresh.id) + 1, [after]);
      this.change(page, { block: after.id, start: 0 });
      return;
    }
    if (kind.type === 'page') {
      this.page = page;
      const child = this.host.createPage(this.page.id);
      const fresh = createBlock('page', '', { page: child.id, ...indent });
      this.change(place(fresh));
      this.host.navigate(child.id, 'title');
      return;
    }
    if (kind.type === 'divider') {
      const line = createBlock('divider', '', indent);
      page = place(line);
      const after = createBlock('paragraph', empty ? [] : [], indent);
      page = insertBlocks(page, blockIndex(page, line.id) + 1, [after]);
      this.change(page, { block: after.id, start: 0 });
      return;
    }
    if (kind.type === 'image') {
      const image = createBlock('image', '', indent);
      this.change(place(image), { block: image.id, start: 0 });
      return;
    }
    if (kind.type === 'database') {
      let table = createTable(this.t.firstColumn);
      if (kind.id === 'board')
        table = {
          ...table,
          columns: [...table.columns, { id: createBlock().id, name: this.t.colStatus, type: 'select', options: [this.t.statusTodo, this.t.statusDoing, this.t.statusDone] }],
          view: 'board',
        };
      if (kind.id === 'board')
        table = { ...table, groupBy: table.columns[1].id, rows: table.rows.map((r, i) => ({ ...r, cells: { [table.columns[1].id]: i ? this.t.statusDoing : this.t.statusTodo } })) };
      const db = createBlock('database', '', { table, ...indent });
      page = place(db);
      const after = createBlock('paragraph', '', indent);
      page = insertBlocks(page, blockIndex(page, db.id) + 1, [after]);
      this.change(page, { block: after.id, start: 0 });
      return;
    }
    if (kind.id === 'embedLink') {
      this.page = page;
      this.reconcile();
      const src = this.doc.defaultView?.prompt(this.t.embedPrompt)?.trim();
      if (!src) {
        this.change(page, { block: id, start });
        return;
      }
      const url = /^[a-z]+:/i.test(src) ? src : `https://${src}`;
      this.change(place(createBlock('embed', '', { src: url, ...indent })));
      return;
    }
    if (kind.id === 'file') {
      this.page = page;
      this.reconcile();
      const input = this.doc.createElement('input');
      input.type = 'file';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) void this.putFiles([file], id);
      });
      input.click();
      this.change(page, { block: id, start });
      return;
    }
    if (empty) {
      this.change(setBlockType(page, id, kind.type!), { block: id, start: 0 });
      return;
    }
    const fresh = createBlock(kind.type!, '', { ...indent, ...(kind.type === 'callout' ? { icon: '💡' } : {}) });
    this.change(insertBlocks(page, index + 1, [fresh]), { block: fresh.id, start: 0 });
  }

  // ——— Clicks ———

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const found = this.blockOf(target);
    if (!found) return;
    const block = this.block(found.id);
    if (!block) return;
    const mention = target.closest<HTMLAnchorElement>('a');
    if (mention && found.text) {
      e.preventDefault();
      if (mention.dataset.page) this.host.navigate(mention.dataset.page);
      else if (isMod(e)) this.doc.defaultView?.open(mention.href, '_blank', 'noopener');
      return;
    }
    if (target.closest('.rn-pagelink')) {
      e.preventDefault();
      if (block.page && pageById(this.host.workspace(), block.page)) this.host.navigate(block.page);
      return;
    }
    if (target.closest('.rn-check')) {
      this.change(updateBlock(this.page, block.id, { checked: !block.checked || undefined }));
      return;
    }
    if (target.closest('.rn-arrow')) {
      this.change(updateBlock(this.page, block.id, { folded: !block.folded || undefined }));
      return;
    }
    if (target.closest('.rn-toggle-empty')) {
      const fresh = createBlock('paragraph', '', { indent: (block.indent ?? 0) + 1 });
      this.change(insertBlocks(this.page, blockIndex(this.page, block.id) + 1, [fresh]), { block: fresh.id, start: 0 });
      return;
    }
    if (target.closest('.rn-callout-icon')) {
      openEmojiPicker(this.host.root, target.getBoundingClientRect(), this.t, (emoji) => this.change(updateBlock(this.page, block.id, { icon: emoji ?? '💡' })), false);
      return;
    }
    if (target.closest('.rn-add')) {
      const fresh = createBlock('paragraph', '', block.indent ? { indent: block.indent } : {});
      const at = subtreeEnd(this.page.blocks, blockIndex(this.page, block.id));
      this.change(insertBlocks(this.page, at, [fresh]), { block: fresh.id, start: 0 });
      // With the menu of blocks open in it, as if `/` was typed.
      const page = updateBlock(this.page, fresh.id, { text: [{ text: '/' }] });
      this.page = page;
      this.reconcile();
      this.focus({ block: fresh.id, start: 1 });
      this.openSlash(fresh.id, 0);
      return;
    }
    if (target.closest('.rn-image-upload')) {
      const input = this.doc.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) this.change(updateBlock(this.page, block.id, { src: await (this.host.uploadImage ?? readFile)(file) }));
      });
      input.click();
      return;
    }
    if (target.closest('.rn-image-address')) {
      const src = this.doc.defaultView?.prompt(this.t.imagePrompt)?.trim();
      if (src) this.change(updateBlock(this.page, block.id, { src }));
      return;
    }
    if (target.closest('.rn-divider') || (block.type === 'image' && target.tagName === 'IMG')) this.select([block.id]);
  }

  /** A click under the last block: the caret in it when it is an empty paragraph, in a new one otherwise. */
  private clickBelow(): void {
    const last = this.page.blocks[this.page.blocks.length - 1];
    if (last && last.type === 'paragraph' && !last.text.length && !last.indent) {
      this.focus({ block: last.id, start: 0 });
      return;
    }
    const fresh = createBlock();
    this.change(insertBlocks(this.page, this.page.blocks.length, [fresh]), { block: fresh.id, start: 0 });
  }

  private pickIcon(anchor: DOMRect): void {
    openEmojiPicker(this.host.root, anchor, this.t, (emoji) => {
      this.host.rename({ icon: emoji });
    });
  }

  // ——— Whole blocks ———

  /** Blocks selected whole (none to stop), the focus on the page to take their keys. */
  select(ids: string[]): void {
    this.selected = ids;
    for (const { el, block } of this.els.values()) el.classList.toggle('rn-selected', ids.includes(block.id));
    if (ids.length) {
      this.doc.getSelection()?.removeAllRanges();
      this.blocksEl.tabIndex = -1;
      this.blocksEl.focus({ preventScroll: true });
      this.els.get(ids[ids.length - 1])?.el.scrollIntoView({ block: 'nearest' });
    }
  }

  private onSelectionKey(e: KeyboardEvent): void {
    const shown = visibleBlocks(this.page.blocks);
    const ids = this.selected;
    const first = shown.findIndex((b) => b.id === ids[0]);
    const last = shown.findIndex((b) => b.id === ids[ids.length - 1]);
    const mod = isMod(e);
    const key = e.key;
    if (key === 'Escape') {
      e.preventDefault();
      this.select([]);
      this.blocksEl.blur();
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      const up = key === 'ArrowUp';
      if (mod && e.shiftKey) {
        this.moveBy(ids, up ? -1 : 1);
        return;
      }
      if (e.shiftKey) {
        const anchor = up ? first : last;
        const next = Math.max(0, Math.min(shown.length - 1, anchor + (up ? -1 : 1)));
        const from = Math.min(next, first);
        const to = Math.max(next, last);
        this.select(shown.slice(from, to + 1).map((b) => b.id));
      } else {
        const next = shown[Math.max(0, Math.min(shown.length - 1, (up ? first : last) + (up ? -1 : 1)))];
        if (next) this.select([next.id]);
      }
    } else if (key === 'Enter') {
      e.preventDefault();
      const block = this.block(ids[ids.length - 1]);
      this.select([]);
      if (block && TEXT_TYPES.has(block.type)) this.focus({ block: block.id, start: -1 });
    } else if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      const after = shown[last + 1] ?? shown[first - 1];
      const gone = new Set<string>();
      for (const id of ids) {
        const index = blockIndex(this.page, id);
        for (let i = index; i < subtreeEnd(this.page.blocks, index); i++) gone.add(this.page.blocks[i].id);
      }
      const page = removeBlocks(this.page, [...gone]);
      const focus = after && !gone.has(after.id) && TEXT_TYPES.has(after.type) ? { block: after.id, start: key === 'Delete' ? 0 : -1 } : undefined;
      this.select([]);
      this.change(page, focus ?? (page.blocks[0] && TEXT_TYPES.has(page.blocks[0].type) ? { block: page.blocks[0].id, start: 0 } : undefined));
    } else if (key === 'Tab') {
      e.preventDefault();
      let page = this.page;
      for (const id of ids) page = indentBlock(page, id, e.shiftKey ? -1 : 1);
      this.change(page);
      this.select(ids);
    } else if (mod && key.toLowerCase() === 'd') {
      e.preventDefault();
      let page = this.page;
      for (const id of [...ids].reverse()) page = duplicateBlock(page, id).page;
      this.change(page);
      this.select(ids);
    } else if (mod && key.toLowerCase() === 'a') {
      e.preventDefault();
      this.select(shown.map((b) => b.id));
    } else if (mod && (key.toLowerCase() === 'c' || key.toLowerCase() === 'x')) {
      e.preventDefault();
      this.copyBlocks(key.toLowerCase() === 'x');
    } else if (mod && key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.host.redo();
      else this.host.undo();
    }
  }

  /** The blocks selected (with what is under them) and their Markdown. */
  private selectedBlocks(): { blocks: Block[]; markdown: string } {
    const blocks: Block[] = [];
    const seen = new Set<string>();
    for (const id of this.selected) {
      const index = blockIndex(this.page, id);
      for (let i = index; i < subtreeEnd(this.page.blocks, index); i++) {
        const b = this.page.blocks[i];
        if (!seen.has(b.id)) blocks.push(b);
        seen.add(b.id);
      }
    }
    const base = Math.min(...blocks.map((b) => b.indent ?? 0));
    const shifted = blocks.map((b) => ({ ...b, indent: (b.indent ?? 0) - base || undefined }));
    return { blocks: shifted, markdown: blocksToMarkdown(shifted) };
  }

  private copyBlocks(cut: boolean): void {
    const { blocks, markdown } = this.selectedBlocks();
    this.clip = { markdown, blocks };
    void this.doc.defaultView?.navigator.clipboard?.writeText(markdown).catch(() => {});
    if (cut) {
      const ids = blocks.map((b) => b.id);
      this.select([]);
      this.change(removeBlocks(this.page, ids));
    }
  }

  private onCopy(e: ClipboardEvent, cut: boolean): void {
    if (!this.selected.length || this.doc.activeElement !== this.blocksEl) return;
    const { blocks, markdown } = this.selectedBlocks();
    this.clip = { markdown, blocks };
    e.clipboardData?.setData('text/plain', markdown);
    e.preventDefault();
    if (cut) {
      this.select([]);
      this.change(
        removeBlocks(
          this.page,
          blocks.map((b) => b.id),
        ),
      );
    }
  }

  private onPaste(e: ClipboardEvent): void {
    const found = this.blockOf(e.target as Node);
    const inSelection = this.selected.length && this.doc.activeElement === this.blocksEl;
    if (!found?.text && !inSelection) return;
    e.preventDefault();
    const data = e.clipboardData;
    const files = [...(data?.files ?? [])];
    const image = files.length === 1 ? files.find((f) => f.type.startsWith('image/')) : undefined;
    const text = data?.getData('text/plain') ?? '';
    const anchorId = found?.id ?? this.selected[this.selected.length - 1];
    const block = this.block(anchorId);
    if (!block) return;

    if (files.length && !image) {
      void this.putFiles(files, anchorId);
      return;
    }
    if (image) {
      void (this.host.uploadImage ?? readFile)(image).then((src) => {
        const fresh = createBlock('image', '', { src, ...(block.indent ? { indent: block.indent } : {}) });
        const index = blockIndex(this.page, anchorId);
        const empty = TEXT_TYPES.has(block.type) && !block.text.length;
        this.change(empty ? insertBlocks(removeBlocks(this.page, [anchorId]), index, [fresh]) : insertBlocks(this.page, subtreeEnd(this.page.blocks, index), [fresh]));
      });
      return;
    }
    if (!text) return;
    const sel = found?.text ? (selectionIn(found.text) ?? { start: 0, end: 0 }) : undefined;

    // Code takes text as it is.
    if (block.type === 'code' && sel) {
      const next = plainText(insertText(deleteText(block.text, sel.start, sel.end), sel.start, text));
      this.change(updateBlock(this.page, block.id, { text: [{ text: next }] }), { block: block.id, start: sel.start + text.length });
      return;
    }
    // An address over selected text links it.
    if (sel && sel.end > sel.start && /^(https?:\/\/|mailto:)\S+$/.test(text.trim())) {
      this.change(updateBlock(this.page, block.id, { text: setLink(block.text, sel.start, sel.end, { url: text.trim() }) }), { block: block.id, start: sel.end });
      return;
    }
    const pasted = this.clip && this.clip.markdown === text ? this.clip.blocks.map((b) => ({ ...b, id: createBlock().id })) : markdownToBlocks(text);
    if (!pasted.length) return;

    // Text of one line goes into the block where the caret is.
    if (sel && pasted.length === 1 && pasted[0].type === 'paragraph' && !text.includes('\n\n')) {
      const inserted = pasted[0].text;
      let spans = deleteText(block.text, sel.start, sel.end);
      const [a, b] = [sliceSpans(spans, 0, sel.start), sliceSpans(spans, sel.start, spansLength(spans))];
      spans = joinSpans(joinSpans(a, inserted), b);
      this.change(updateBlock(this.page, block.id, { text: spans }), { block: block.id, start: sel.start + spansLength(inserted) });
      return;
    }
    // Blocks go after this one; the text after the caret after them.
    const base = block.indent ?? 0;
    const placed = pasted.map((b) => ({ ...b, ...(b.indent || base ? { indent: (b.indent ?? 0) + base } : {}) }));
    let page = this.page;
    let index = blockIndex(page, block.id);
    if (sel && TEXT_TYPES.has(block.type)) {
      const kept = deleteText(block.text, sel.start, sel.end);
      const [before, after] = [sliceSpans(kept, 0, sel.start), sliceSpans(kept, sel.start, spansLength(kept))];
      // Pasted at the start of a paragraph, the blocks take its place.
      if (!before.length && block.type === 'paragraph') {
        page = removeBlocks(page, [block.id]);
        index -= 1;
      } else page = updateBlock(page, block.id, { text: before });
      if (after.length) placed.push(createBlock(LIST_TYPES.has(block.type) ? block.type : 'paragraph', after, base ? { indent: base } : {}));
    } else index = subtreeEnd(page.blocks, index) - 1;
    page = insertBlocks(page, index + 1, placed);
    const last = placed[placed.length - 1];
    this.select([]);
    this.change(page, TEXT_TYPES.has(last.type) ? { block: last.id, start: -1 } : undefined);
  }

  /**
   * Files put in the page after a block (in its place when it is an empty
   * paragraph): images as images, the rest as files shown as they can be.
   */
  async putFiles(files: File[], after: string): Promise<void> {
    const block = this.block(after);
    const indent = block?.indent ? { indent: block.indent } : {};
    const blocks: Block[] = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) blocks.push(createBlock('image', '', { src: await (this.host.uploadImage ?? readFile)(file), ...indent }));
      else blocks.push(createBlock('embed', file.name, { src: await (this.host.uploadFile ?? readFile)(file), ...indent }));
    }
    if (!blocks.length) return;
    const index = block ? blockIndex(this.page, after) : this.page.blocks.length - 1;
    const empty = block && block.type === 'paragraph' && !block.text.length;
    this.change(empty ? insertBlocks(removeBlocks(this.page, [after]), index, blocks) : insertBlocks(this.page, block ? subtreeEnd(this.page.blocks, index) : this.page.blocks.length, blocks));
  }

  // ——— The grip: dragging and the menu of a block ———

  private onPointerDown(e: PointerEvent): void {
    const grip = (e.target as HTMLElement).closest('.rn-grip');
    if (!grip || e.button !== 0) return;
    e.preventDefault();
    const found = this.blockOf(grip);
    if (!found) return;
    const ids = this.selected.includes(found.id) ? this.selected : [found.id];
    this.drag = { ids, startX: e.clientX, startY: e.clientY, moved: false };
    const move = (ev: PointerEvent) => this.onDragMove(ev);
    const up = (ev: PointerEvent) => {
      this.doc.removeEventListener('pointermove', move);
      this.doc.removeEventListener('pointerup', up);
      this.onDragEnd(ev, found.id, grip as HTMLElement);
    };
    this.doc.addEventListener('pointermove', move);
    this.doc.addEventListener('pointerup', up);
  }

  private onDragMove(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      this.element.classList.add('rn-dragging');
      for (const id of drag.ids) this.els.get(id)?.el.classList.add('rn-dragged');
    }
    // The blocks being moved, and what is under them, are not places to drop.
    const moving = new Set<string>();
    for (const id of drag.ids) {
      const index = blockIndex(this.page, id);
      for (let i = index; i < subtreeEnd(this.page.blocks, index); i++) moving.add(this.page.blocks[i].id);
    }
    const shown = visibleBlocks(this.page.blocks).filter((b) => !moving.has(b.id));
    let before: Block | undefined;
    let previous: Block | undefined;
    for (const block of shown) {
      const box = this.els.get(block.id)!.el.getBoundingClientRect();
      if (e.clientY < box.top + box.height / 2) {
        before = block;
        break;
      }
      previous = block;
    }
    const blocksBox = this.blocksEl.getBoundingClientRect();
    const rest = this.page.blocks.filter((b) => !moving.has(b.id));
    const at = before ? rest.indexOf(before) : rest.length;
    const most = previous ? maxIndent(rest, at) : 0;
    const indent = Math.max(0, Math.min(most, Math.floor((e.clientX - blocksBox.left) / INDENT)));
    drag.target = { before: before?.id, indent };
    const edge = before ? this.els.get(before.id)!.el.getBoundingClientRect().top : previous ? this.els.get(previous.id)!.el.getBoundingClientRect().bottom : blocksBox.top;
    const pageBox = this.element.getBoundingClientRect();
    this.drop.hidden = false;
    this.drop.style.top = `${edge - pageBox.top - 1}px`;
    this.drop.style.left = `${blocksBox.left - pageBox.left + indent * INDENT}px`;
    this.drop.style.width = `${blocksBox.width - indent * INDENT}px`;
  }

  private onDragEnd(_e: PointerEvent, id: string, grip: HTMLElement): void {
    const drag = this.drag;
    this.drag = undefined;
    this.drop.hidden = true;
    this.element.classList.remove('rn-dragging');
    for (const { el } of this.els.values()) el.classList.remove('rn-dragged');
    if (!drag) return;
    if (!drag.moved) {
      this.select(drag.ids.includes(id) ? drag.ids : [id]);
      this.openBlockMenu(id, grip.getBoundingClientRect(), false);
      return;
    }
    if (!drag.target) return;
    this.change(moveBlocks(this.page, drag.ids, drag.target.before, drag.target.indent));
    this.select(drag.ids);
  }

  /** The menu of a block: what to turn it into, duplicate, move, delete. */
  private openBlockMenu(id: string, anchor: DOMRect, onlyTurn: boolean): void {
    const block = this.block(id);
    if (!block) return;
    const t = this.t;
    const ids = this.selected.includes(id) ? this.selected : [id];
    const items: MenuItem[] = [];
    if (!onlyTurn) {
      items.push(
        {
          id: 'delete',
          label: t.delete,
          icon: 'trash',
          keys: 'Del',
          danger: true,
          run: () => {
            this.select(ids);
            this.onSelectionKey(new KeyboardEvent('keydown', { key: 'Delete' }));
          },
        },
        {
          id: 'duplicate',
          label: t.duplicate,
          icon: 'duplicate',
          keys: 'Mod+D',
          run: () => {
            let page = this.page;
            for (const x of [...ids].reverse()) page = duplicateBlock(page, x).page;
            this.change(page);
          },
        },
        { id: 'up', label: t.moveUp, icon: 'chevronRight', keys: 'Mod+Shift+↑', run: () => this.moveBy(ids, -1) },
        { id: 'down', label: t.moveDown, icon: 'chevronDown', keys: 'Mod+Shift+↓', run: () => this.moveBy(ids, 1) },
      );
    }
    if (TEXT_TYPES.has(block.type)) {
      for (const kind of TURN_INTO) {
        items.push({
          id: `turn-${kind.id}`,
          label: t[kind.label],
          icon: kind.icon,
          section: t.turnInto,
          run: () => {
            const focus = this.focusNow();
            let page = this.page;
            for (const x of ids) if (TEXT_TYPES.has(this.block(x)?.type ?? 'divider')) page = setBlockType(page, x, kind.type!);
            this.select([]);
            this.change(page, focus && 'block' in focus ? focus : { block: id, start: -1 });
          },
        });
      }
    }
    openMenu(this.host.root, anchor, items, { ownKeys: true, className: 'rn-block-menu' });
  }

  /** The others in the page: each block someone is in is marked with their colour and name. */
  markPeers(peers: { name: string; color: string; block?: string }[]): void {
    this.peers = peers;
    this.drawPeers();
  }

  private drawPeers(): void {
    for (const el of this.blocksEl.querySelectorAll<HTMLElement>('.rn-peer-block')) {
      el.classList.remove('rn-peer-block');
      el.style.removeProperty('--peer');
      delete el.dataset.peer;
    }
    for (const peer of this.peers) {
      const el = peer.block ? this.els.get(peer.block)?.el : undefined;
      if (!el) continue;
      el.classList.add('rn-peer-block');
      el.style.setProperty('--peer', `#${peer.color.replace(/^#/, '')}`);
      el.dataset.peer = el.dataset.peer ? `${el.dataset.peer}, ${peer.name}` : peer.name;
    }
  }

  /** The Markdown of the page. */
  toMarkdown(): string {
    return blocksToMarkdown(this.page.blocks);
  }

  /** Whether the caret or a selection of blocks is in the page. */
  hasFocus(): boolean {
    return this.element.contains(this.doc.activeElement);
  }

  /** Where the caret was before the last change, for the history. */
  get lastFocus(): Focus | undefined {
    return this.before;
  }

  /** The focus given, unless it is where the caret already is. */
  restore(focus: Focus | undefined): void {
    if (focus && !sameFocus(focus, this.focusNow())) this.focus(focus);
  }
}
