// The text of a block in the page and back: spans drawn as elements (strong,
// em, u, s, code, a), the elements read back as spans after the browser has
// put typed text in them, and the caret as an offset in the plain text, to
// read and to place. A line break is a "\n" in a text node, shown by
// `white-space: pre-wrap`; a trailing one has a <br> after it so that the
// empty line is shown.

import type { Mark, Span } from '@rebonotes/core';

const TAGS: [Mark, string][] = [
  ['code', 'code'],
  ['bold', 'strong'],
  ['italic', 'em'],
  ['underline', 'u'],
  ['strike', 's'],
];

/** Spans drawn into an element, in place of what it had. */
export function renderSpans(el: HTMLElement, spans: readonly Span[], pageTitle?: (id: string) => string | undefined): void {
  const doc = el.ownerDocument;
  const nodes: Node[] = [];
  for (const span of spans) {
    let node: Node = doc.createTextNode(span.text);
    for (const [mark, tag] of [...TAGS].reverse()) {
      if (!span.marks?.includes(mark)) continue;
      const wrap = doc.createElement(tag);
      wrap.append(node);
      node = wrap;
    }
    if (span.page || span.link) {
      const a = doc.createElement('a');
      if (span.page) {
        a.className = 'rn-mention';
        a.dataset.page = span.page;
        a.href = `#${span.page}`;
        const title = pageTitle?.(span.page);
        if (title === undefined) a.classList.add('rn-missing');
      } else {
        a.href = span.link!;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.append(node);
      node = a;
    }
    nodes.push(node);
  }
  const text = spans.map((s) => s.text).join('');
  if (text.endsWith('\n')) {
    const br = doc.createElement('br');
    br.className = 'rn-end';
    nodes.push(br);
  }
  el.replaceChildren(...nodes);
  el.classList.toggle('rn-empty', !text);
}

/** What `renderSpans` would make, as HTML: to know whether the browser has changed the elements. */
export function spansHtml(doc: Document, spans: readonly Span[], pageTitle?: (id: string) => string | undefined): string {
  const scratch = doc.createElement('div');
  renderSpans(scratch, spans, pageTitle);
  return scratch.innerHTML;
}

const MARK_OF: Record<string, Mark> = { STRONG: 'bold', B: 'bold', EM: 'italic', I: 'italic', U: 'underline', S: 'strike', DEL: 'strike', STRIKE: 'strike', CODE: 'code' };

/** The text of an element as spans: the marks from the elements around each piece of text. */
export function readSpans(el: HTMLElement): Span[] {
  const out: Span[] = [];
  const walk = (node: Node, marks: Mark[], link: { link?: string; page?: string }) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const text = child.nodeValue ?? '';
        if (text) out.push({ text, ...(marks.length ? { marks: [...marks] } : {}), ...link });
      } else if (child.nodeType === 1) {
        const element = child as HTMLElement;
        if (element.tagName === 'BR') {
          if (!isTrailingBreak(el, element)) out.push({ text: '\n', ...(marks.length ? { marks: [...marks] } : {}), ...link });
          continue;
        }
        const mark = MARK_OF[element.tagName];
        const nextMarks = mark && !marks.includes(mark) ? [...marks, mark] : marks;
        let nextLink = link;
        if (element.tagName === 'A') nextLink = element.dataset.page ? { page: element.dataset.page } : element.getAttribute('href') ? { link: element.getAttribute('href')! } : link;
        // A block the browser made inside the text (a div on Enter) is a line of its own.
        if ((element.tagName === 'DIV' || element.tagName === 'P') && out.length && !out[out.length - 1].text.endsWith('\n')) out.push({ text: '\n' });
        walk(element, nextMarks, nextLink);
      }
    }
  };
  walk(el, [], {});
  return out;
}

/** A <br> that only keeps the last line open: the last thing in the element. */
function isTrailingBreak(root: HTMLElement, br: Element): boolean {
  let node: Node | null = br;
  while (node && node !== root) {
    if (node.nextSibling) return false;
    node = node.parentNode;
  }
  return true;
}

/** The length a node counts for in the plain text. */
function nodeLength(root: HTMLElement, node: Node): number {
  if (node.nodeType === 3) return node.nodeValue?.length ?? 0;
  if ((node as Element).tagName === 'BR') return isTrailingBreak(root, node as Element) ? 0 : 1;
  let n = 0;
  for (const child of node.childNodes) n += nodeLength(root, child);
  return n;
}

/** The offset in the plain text of a point in the element (a node and an offset in it). */
export function offsetOf(root: HTMLElement, node: Node, offset: number): number {
  if (!root.contains(node)) return node.compareDocumentPosition(root) & 4 ? 0 : nodeLength(root, root);
  let total = 0;
  if (node.nodeType === 3) total = offset;
  else for (let i = 0; i < Math.min(offset, node.childNodes.length); i++) total += nodeLength(root, node.childNodes[i]);
  let current: Node = node;
  while (current !== root) {
    let sibling = current.previousSibling;
    while (sibling) {
      total += nodeLength(root, sibling);
      sibling = sibling.previousSibling;
    }
    current = current.parentNode!;
  }
  return total;
}

/** The point in the element at an offset of the plain text: a text node and an offset in it. */
export function pointAt(root: HTMLElement, offset: number): { node: Node; offset: number } {
  let left = Math.max(0, offset);
  let last: { node: Node; offset: number } | undefined;
  const walk = (node: Node): { node: Node; offset: number } | undefined => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const length = child.nodeValue?.length ?? 0;
        if (left <= length) return { node: child, offset: left };
        left -= length;
        last = { node: child, offset: length };
      } else if ((child as Element).tagName === 'BR') {
        if (isTrailingBreak(root, child as Element)) continue;
        const index = [...node.childNodes].indexOf(child);
        if (left === 0) return { node, offset: index };
        left -= 1;
        last = { node, offset: index + 1 };
      } else {
        const found = walk(child);
        if (found) return found;
      }
    }
    return undefined;
  };
  return walk(root) ?? last ?? { node: root, offset: 0 };
}

/** The caret, or the selection, in an element: offsets of the plain text; nothing when it is elsewhere. */
export function selectionIn(root: HTMLElement): { start: number; end: number } | undefined {
  const selection = root.ownerDocument.getSelection();
  if (!selection || !selection.rangeCount) return undefined;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) && !root.contains(range.endContainer)) return undefined;
  const start = offsetOf(root, range.startContainer, range.startOffset);
  const end = offsetOf(root, range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

/** The caret placed at an offset (or a stretch selected) in an element. */
export function placeCaret(root: HTMLElement, start: number, end = start): void {
  const doc = root.ownerDocument;
  const selection = doc.getSelection();
  if (!selection) return;
  const length = nodeLength(root, root);
  const a = pointAt(root, start < 0 ? length : Math.min(start, length));
  const b = end === start ? a : pointAt(root, end < 0 ? length : Math.min(end, length));
  const range = doc.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** The box of the caret on the screen, to place a menu by it. */
export function caretBox(root: HTMLElement): DOMRect {
  const selection = root.ownerDocument.getSelection();
  if (selection?.rangeCount) {
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rects = range.getClientRects();
    if (rects.length) return rects[0];
  }
  return root.getBoundingClientRect();
}

/** Whether the caret is on the first line (or the last) of an element. */
export function caretOnEdgeLine(root: HTMLElement, edge: 'first' | 'last'): boolean {
  const box = root.getBoundingClientRect();
  const caret = caretBox(root);
  if (!caret.height || caret === box) return true;
  const line = parseFloat(getComputedStyle(root).lineHeight) || caret.height;
  return edge === 'first' ? caret.top - box.top < line * 0.8 : box.bottom - caret.bottom < line * 0.8;
}

/** The offset in an element at a point of the screen, for moving the caret up or down a line at the same place. */
export function offsetAtPoint(root: HTMLElement, x: number, y: number): number | undefined {
  const doc = root.ownerDocument as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos && root.contains(pos.offsetNode)) return offsetOf(root, pos.offsetNode, pos.offset);
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  if (range && root.contains(range.startContainer)) return offsetOf(root, range.startContainer, range.startOffset);
  return undefined;
}
