// Text with marks, as a list of spans, and what is done to it: put text in,
// take some out, cut it in two, mark or unmark a stretch, and say what marks
// are at a point. Offsets count characters of the plain text. Every function
// gives new spans, joined where two beside each other are marked the same.

import type { Mark, Span } from './model';

const ORDER: Mark[] = ['bold', 'italic', 'underline', 'strike', 'code'];

/** Two spans are marked the same: the same marks, the same link. */
export function sameStyle(a: Span, b: Span): boolean {
  if ((a.link ?? '') !== (b.link ?? '') || (a.page ?? '') !== (b.page ?? '')) return false;
  const x = a.marks ?? [];
  const y = b.marks ?? [];
  return x.length === y.length && x.every((m) => y.includes(m));
}

/** A span with its marks in order, and no empty fields. */
function tidy(span: Span): Span {
  const out: Span = { text: span.text };
  const marks = ORDER.filter((m) => span.marks?.includes(m));
  if (marks.length) out.marks = marks;
  if (span.link) out.link = span.link;
  if (span.page) out.page = span.page;
  return out;
}

/** Spans without empty ones, and those beside each other marked the same joined. */
export function normalizeSpans(spans: readonly Span[]): Span[] {
  const out: Span[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last, span)) out[out.length - 1] = { ...last, text: last.text + span.text };
    else out.push(tidy(span));
  }
  return out;
}

/** The length of the plain text. */
export const spansLength = (spans: readonly Span[]): number => spans.reduce((n, s) => n + s.text.length, 0);

/** The spans before and after an offset. */
export function splitSpans(spans: readonly Span[], at: number): [Span[], Span[]] {
  const before: Span[] = [];
  const after: Span[] = [];
  let pos = 0;
  for (const span of spans) {
    const end = pos + span.text.length;
    if (end <= at) before.push(span);
    else if (pos >= at) after.push(span);
    else {
      before.push({ ...span, text: span.text.slice(0, at - pos) });
      after.push({ ...span, text: span.text.slice(at - pos) });
    }
    pos = end;
  }
  return [normalizeSpans(before), normalizeSpans(after)];
}

/** The stretch from one offset to another. */
export function sliceSpans(spans: readonly Span[], from: number, to: number): Span[] {
  return splitSpans(splitSpans(spans, to)[0], from)[1];
}

/** The style a character typed at an offset takes: the one before it, or after it at the start. */
export function styleAt(spans: readonly Span[], at: number): Omit<Span, 'text'> {
  let pos = 0;
  let found: Span | undefined;
  for (const span of spans) {
    const end = pos + span.text.length;
    if (at > pos && at <= end) {
      found = span;
      break;
    }
    if (at === 0 && pos === 0) {
      found = span;
      break;
    }
    pos = end;
  }
  if (!found) return {};
  // Code goes on being typed, a link does not: the text after it is plain.
  const { text: _text, link: _link, page: _page, ...style } = found;
  return style;
}

/** Text put in at an offset, in a style; the style around it when none is given. */
export function insertText(spans: readonly Span[], at: number, text: string, style?: Omit<Span, 'text'>): Span[] {
  const [before, after] = splitSpans(spans, at);
  return normalizeSpans([...before, { ...(style ?? styleAt(spans, at)), text }, ...after]);
}

/** The text from one offset to another taken out. */
export function deleteText(spans: readonly Span[], from: number, to: number): Span[] {
  if (to <= from) return normalizeSpans(spans);
  const [before] = splitSpans(spans, from);
  const [, after] = splitSpans(spans, to);
  return normalizeSpans([...before, ...after]);
}

/** One span list after another. */
export const joinSpans = (a: readonly Span[], b: readonly Span[]): Span[] => normalizeSpans([...a, ...b]);

/** Every character from one offset to another has a mark. */
export function hasMark(spans: readonly Span[], from: number, to: number, mark: Mark): boolean {
  const part = sliceSpans(spans, from, to);
  return part.length > 0 && part.every((s) => s.marks?.includes(mark));
}

/** A mark put on a stretch, or taken off it when all of it has it already (or as `on` says). */
export function toggleMark(spans: readonly Span[], from: number, to: number, mark: Mark, on = !hasMark(spans, from, to, mark)): Span[] {
  const [before, rest] = splitSpans(spans, from);
  const [middle, after] = splitSpans(rest, to - from);
  const changed = middle.map((s) => {
    const marks = (s.marks ?? []).filter((m) => m !== mark);
    if (on) marks.push(mark);
    return { ...s, marks };
  });
  return normalizeSpans([...before, ...changed, ...after]);
}

/** A stretch made to go to an address, or to nowhere with none. */
export function setLink(spans: readonly Span[], from: number, to: number, link: { url?: string; page?: string } | undefined): Span[] {
  const [before, rest] = splitSpans(spans, from);
  const [middle, after] = splitSpans(rest, to - from);
  const changed = middle.map(({ link: _l, page: _p, ...s }) => ({ ...s, ...(link?.url ? { link: link.url } : {}), ...(link?.page ? { page: link.page } : {}) }));
  return normalizeSpans([...before, ...changed, ...after]);
}
