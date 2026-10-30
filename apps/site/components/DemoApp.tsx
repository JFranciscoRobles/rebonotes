'use client';

// The notes on the whole window, under the bar Rebodocs' demo has: the name,
// back to the site, the two ways of putting them in a page (the editor as it
// comes, or an interface of one's own on the headless hooks), and what each is.
//
// With ?collab=<server> they work with other people: Share starts a room on
// that server with the workspace, and the address it gives (…&room=<id>) is
// the one to send. Both tabs join the same room.

import { useEffect, useState } from 'react';
import { HeadlessNotes } from '@/components/HeadlessNotes';
import { type LiveRoom, LiveNotes } from '@/components/LiveNotes';
import { LocalLink as Link, useT } from '@/components/i18n';
import type { L } from '@/lib/i18n';

type Tab = 'included' | 'headless';

const TABS: { id: Tab; label: L; note: L; dot: string }[] = [
  {
    id: 'included',
    label: { en: 'The included one', es: 'El incluido' },
    note: {
      en: 'mountNotes as it comes: the tree of pages and the page. Type / for a block, [[ to link a page, drag a block by its grip.',
      es: 'mountNotes tal cual viene: el árbol de páginas y la página. Escribe / para un bloque, [[ para enlazar una página, arrastra un bloque por su asa.',
    },
    dot: 'bg-brand',
  },
  {
    id: 'headless',
    label: { en: 'Your own interface', es: 'Tu propia interfaz' },
    note: {
      en: 'Built on the headless hooks of @rebonotes/react: NotesProvider, useNotes and NotesPage, with a tree, a path and a search of its own.',
      es: 'Hecha con los hooks headless de @rebonotes/react: NotesProvider, useNotes y NotesPage, con árbol, ruta y búsqueda propios.',
    },
    dot: 'bg-pastel-pink-fg',
  },
];

export function DemoApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('included');
  const [server, setServer] = useState<string>();
  const [room, setRoom] = useState<LiveRoom>();
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#headless') setTab('headless');
    const query = new URLSearchParams(window.location.search);
    const url = query.get('collab') ?? undefined;
    setServer(url);
    const id = query.get('room');
    if (url && id) setRoom({ url, room: id, name: query.get('name') ?? undefined });
  }, []);

  const choose = (next: Tab) => {
    setTab(next);
    history.replaceState(null, '', next === 'headless' ? '#headless' : window.location.pathname + window.location.search);
  };

  /** A room on the server with the sample workspace, and its address to send. */
  const share = async () => {
    if (!server) return;
    setSharing(true);
    try {
      const [{ createRoom }, core] = await Promise.all([import('@rebonotes/collab/browser'), import('@rebonotes/core')]);
      const id = await createRoom(server, core.sampleWorkspace(document.documentElement.lang), 'ReboNotes');
      const query = new URLSearchParams(window.location.search);
      query.set('room', id);
      history.replaceState(null, '', `${window.location.pathname}?${query}${window.location.hash}`);
      setRoom({ url: server, room: id, name: query.get('name') ?? undefined });
      await navigator.clipboard?.writeText(window.location.href).catch(() => {});
    } finally {
      setSharing(false);
    }
  };

  const current = TABS.find((one) => one.id === tab)!;
  const button = 'flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover pointer-coarse:min-h-11';
  return (
    <div className="flex h-dvh min-h-[560px] flex-col bg-surface text-ink">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-white px-3 py-2 sm:px-4">
        <Link href="/" title={t({ en: 'Back to the site', es: 'Volver al sitio' })} className="flex items-center gap-2 rounded-lg py-1 pr-1 font-display text-[17px] font-bold tracking-tight text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={24} height={24} />
          <span className="hidden sm:inline">ReboNotes</span>
          <span className="rounded-md bg-hover px-1.5 py-0.5 font-text text-xs font-semibold text-ink-soft">Demo</span>
        </Link>

        <div role="tablist" aria-label={t({ en: 'Which interface', es: 'Qué interfaz' })} className="order-3 flex w-full rounded-xl bg-surface p-1 sm:order-none sm:w-auto">
          {TABS.map(({ id, label, dot }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => choose(id)}
              className={`flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors sm:flex-none ${
                tab === id ? 'bg-white text-ink shadow-[0_1px_3px_rgba(47,46,43,0.14)]' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <span aria-hidden="true" className={`size-2 rounded-full ${tab === id ? dot : 'bg-border-strong'}`} />
              {t(label)}
            </button>
          ))}
        </div>

        <p className="hidden min-w-0 flex-1 truncate text-sm text-muted lg:block">
          {room ? t({ en: `Shared in room ${room.room}: send this address to work together.`, es: `Compartido en la sala ${room.room}: manda esta dirección para trabajar juntos.` }) : t(current.note)}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/docs/getting-started/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-hover hover:text-ink md:block">
            {t({ en: 'Docs', es: 'Documentación' })}
          </Link>
          {server && !room && (
            <button type="button" onClick={() => void share()} disabled={sharing} className={button}>
              {sharing ? t({ en: 'Sharing…', es: 'Compartiendo…' }) : t({ en: 'Share', es: 'Compartir' })}
            </button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1">{tab === 'included' ? <LiveNotes room={room} className="h-full" /> : <HeadlessNotes collab={room} />}</div>
    </div>
  );
}
