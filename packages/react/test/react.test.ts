// @vitest-environment happy-dom
import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { type Notes, NotesEditor, NotesPage, NotesProvider, sampleWorkspace, type UseNotes, useNotes } from '../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('the notes in React', () => {
  it('mounts the component and gives the notes', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    let notes: Notes | undefined;
    await act(async () => root.render(createElement(NotesEditor, { workspace: sampleWorkspace('en'), locale: 'en', page: 'ideas', onReady: (n) => (notes = n) })));
    expect(host.querySelector('.rn-title')?.textContent).toBe('Ideas');
    expect(notes?.page).toBe('ideas');
    await act(async () => root.render(createElement(NotesEditor, { workspace: sampleWorkspace('en'), locale: 'en', page: 'meeting', onReady: (n) => (notes = n) })));
    expect(host.querySelector('.rn-title')?.textContent).toBe('Meeting notes');
    await act(async () => root.unmount());
    expect(notes).toBeUndefined();
    host.remove();
  });

  it("gives a tree and commands to an interface of one's own", async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    let seen: UseNotes | undefined;
    function Tree() {
      seen = useNotes();
      return createElement('ul', { className: 'tree' }, ...seen.tree.map((p) => createElement('li', { key: p.id }, p.title)));
    }
    await act(async () => root.render(createElement(NotesProvider, { workspace: sampleWorkspace('en'), locale: 'en' }, createElement(Tree), createElement(NotesPage))));
    expect(host.querySelector('.rn-sidebar')?.closest('.rn-bare')).not.toBeNull();
    expect([...host.querySelectorAll('.tree li')].map((li) => li.textContent)).toEqual(['Welcome to ReboNotes']);
    expect(seen?.tree[0].children.map((c) => c.title)).toEqual(['Meeting notes', 'Ideas', 'Projects']);
    await act(async () => seen?.open('meeting'));
    expect(seen?.page?.id).toBe('meeting');
    expect(seen?.path.map((p) => p.id)).toEqual(['welcome', 'meeting']);
    await act(async () => void seen?.addPage(undefined, 'Fresh'));
    expect([...host.querySelectorAll('.tree li')].map((li) => li.textContent)).toEqual(['Welcome to ReboNotes', 'Fresh']);
    expect(seen?.find('decisions')[0].page.id).toBe('meeting');
    await act(async () => root.unmount());
    host.remove();
  });
});
