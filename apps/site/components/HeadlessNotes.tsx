'use client';

// The notes in an interface of one's own, on the headless hooks of
// @rebonotes/react: a tree of pages drawn here, the path to the page and a
// search of its own, around the page as NotesPage draws it.

import { NotesPage, NotesProvider, sampleWorkspace, type TreePage, useNotes } from '@rebonotes/react';
import { useMemo, useState } from 'react';
import { useLocale, useT } from '@/components/i18n';
import type { LiveRoom } from './LiveNotes';

function Tree({ pages, depth = 0 }: { pages: TreePage[]; depth?: number }) {
  const { page, open } = useNotes();
  return (
    <ul className="m-0 list-none p-0">
      {pages.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => open(p.id)}
            style={{ paddingLeft: 10 + depth * 14 }}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-sm ${page?.id === p.id ? 'bg-pastel-pink font-semibold text-pastel-pink-fg' : 'text-ink hover:bg-hover'}`}
          >
            <span className="w-5 text-center">{p.icon ?? '·'}</span>
            <span className="truncate">{p.title || '—'}</span>
          </button>
          {p.children.length > 0 && <Tree pages={p.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

function Shell() {
  const t = useT();
  const { tree, path, find, open, addPage, collab } = useNotes();
  const [query, setQuery] = useState('');
  const found = query.trim() ? find(query).slice(0, 6) : [];
  return (
    <div className="flex h-full gap-3 bg-[#f7f3ff] p-3">
      <aside className="flex w-60 flex-none flex-col gap-2 rounded-2xl border border-border bg-white p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t({ en: 'Find a page…', es: 'Busca una página…' })}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
        />
        {found.length > 0 ? (
          <ul className="m-0 list-none p-0">
            {found.map((r) => (
              <li key={r.page.id}>
                <button type="button" onClick={() => (open(r.page.id), setQuery(''))} className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm hover:bg-hover">
                  <b className="block font-semibold">{r.page.title}</b>
                  <span className="block truncate text-xs text-muted">{r.snippet.join('')}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Tree pages={tree} />
        )}
        <button type="button" onClick={() => addPage()} className="mt-auto cursor-pointer rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
          + {t({ en: 'New page', es: 'Nueva página' })}
        </button>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-center gap-1 border-b border-border px-4 py-2 text-sm text-muted">
          {path.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ' / '}
              <button type="button" onClick={() => open(p.id)} className="cursor-pointer hover:text-ink">
                {p.icon} {p.title}
              </button>
            </span>
          ))}
          {collab && <span className="ml-auto text-xs">{[collab.name, ...collab.peers.map((p) => p.name)].join(', ')}</span>}
        </div>
        <NotesPage className="min-h-0 flex-1" />
      </section>
    </div>
  );
}

export function HeadlessNotes({ collab }: { collab?: LiveRoom }) {
  const locale = useLocale();
  const workspace = useMemo(() => sampleWorkspace(locale), [locale]);
  return (
    <NotesProvider key={locale} workspace={workspace} locale={locale} collab={collab}>
      <Shell />
    </NotesProvider>
  );
}
