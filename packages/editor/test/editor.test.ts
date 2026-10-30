// @vitest-environment happy-dom
import { createBlock, createPage, sampleWorkspace, type Span } from '@rebonotes/core';
import { describe, expect, it } from 'vitest';
import { mountNotes, readSpans, renderSpans, selectionIn } from '../src';
import { offsetOf, placeCaret, pointAt } from '../src/dom';

describe('the text of a block in the page', () => {
  it('draws spans and reads them back', () => {
    const el = document.createElement('div');
    const spans: Span[] = [
      { text: 'a ' },
      { text: 'b', marks: ['bold', 'italic'] },
      { text: ' c', marks: ['code'] },
      { text: ' page', page: 'p1' },
      { text: ' web', link: 'https://x.y/' },
      { text: '\nline' },
    ];
    renderSpans(el, spans, () => 'Title');
    expect(el.querySelector('strong em')?.textContent).toBe('b');
    expect(el.querySelector('a.rn-mention')?.getAttribute('data-page')).toBe('p1');
    expect(readSpans(el)).toEqual(spans);
  });

  it('keeps an empty last line open with a break that is not read', () => {
    const el = document.createElement('div');
    renderSpans(el, [{ text: 'end\n' }]);
    expect(el.lastElementChild?.tagName).toBe('BR');
    expect(readSpans(el)).toEqual([{ text: 'end\n' }]);
  });

  it('reads what the browser made: other tags, and a div for a new line', () => {
    const el = document.createElement('div');
    el.innerHTML = 'one <b>two</b><div>three</div>';
    expect(readSpans(el)).toEqual([{ text: 'one ' }, { text: 'two', marks: ['bold'] }, { text: '\n' }, { text: 'three' }]);
  });

  it('turns offsets into points and back', () => {
    const el = document.createElement('div');
    document.body.append(el);
    renderSpans(el, [{ text: 'ab' }, { text: 'cd', marks: ['bold'] }, { text: 'ef' }]);
    for (const offset of [0, 1, 2, 3, 4, 6]) {
      const point = pointAt(el, offset);
      expect(offsetOf(el, point.node, point.offset)).toBe(offset);
    }
    placeCaret(el, 1, 5);
    expect(selectionIn(el)).toEqual({ start: 1, end: 5 });
    el.remove();
  });
});

describe('the notes', () => {
  it('shows the tree, the page and its blocks', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const notes = mountNotes(host, { workspace: sampleWorkspace('en'), locale: 'en' });
    expect(host.querySelector('.rn-title')?.textContent).toBe('Welcome to ReboNotes');
    expect(host.querySelectorAll('.rn-tree-row').length).toBeGreaterThan(0);
    expect(host.querySelector('.rn-block[data-type="callout"]')).not.toBeNull();
    expect(host.querySelector('.rn-block[data-type="numbered"]')).toBeNull();
    notes.open('meeting');
    expect(host.querySelector('.rn-title')?.textContent).toBe('Meeting notes');
    expect([...host.querySelectorAll('.rn-number')].map((n) => n.textContent)).toEqual(['1.', '2.', '3.']);
    expect(host.querySelector('.rn-backlink')?.textContent).toContain('Welcome');
    notes.destroy();
    host.remove();
  });

  it('adds, deletes and undoes pages', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const notes = mountNotes(host, { workspace: { pages: [createPage('One', { id: 'one', blocks: [createBlock('paragraph', 'hi')] })] } });
    const page = notes.addPage('one', 'Two');
    expect(notes.page).toBe(page.id);
    expect(notes.workspace.pages.find((p) => p.id === page.id)?.parent).toBe('one');
    notes.deletePage('one', false);
    expect(notes.workspace.pages.map((p) => p.title)).toEqual(['']);
    notes.undo();
    expect(notes.workspace.pages.map((p) => p.title)).toEqual(['One', 'Two']);
    notes.undo();
    expect(notes.workspace.pages.map((p) => p.title)).toEqual(['One']);
    notes.redo();
    expect(notes.workspace.pages.map((p) => p.title)).toEqual(['One', 'Two']);
    expect(notes.toMarkdown('one')).toContain('# One\n\nhi');
    notes.destroy();
    host.remove();
  });

  it('keeps the workspace in the browser under a key', async () => {
    localStorage.clear();
    const host = document.createElement('div');
    document.body.append(host);
    const notes = mountNotes(host, { storageKey: 'test:notes' });
    notes.addPage(undefined, 'Kept');
    notes.destroy();
    const again = mountNotes(host, { storageKey: 'test:notes' });
    expect(again.workspace.pages.map((p) => p.title)).toContain('Kept');
    again.destroy();
    host.remove();
  });
});
