'use client';

// The notes themselves, running in the page: mounted in the browser after the
// first render, as the engine and the editor have nothing to do on a server.

import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/components/i18n';
import { delocalize, type Locale, localize } from '@/lib/i18n';

export interface LiveRoom {
  url: string;
  room: string;
  name?: string;
}

/** The sample workspace, or the one of a room of the collaboration server with `room`. */
export function LiveNotes({ className = '', room, page }: { className?: string; room?: LiveRoom; page?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const locale = useLocale();
  const t = useT();
  useEffect(() => {
    let destroy: (() => void) | undefined;
    let gone = false;
    void Promise.all([
      import('@rebonotes/editor'),
      import('@rebonotes/core'),
      import('@rebonotes/collab/browser'),
      import('@rebonotes/editor/rebosheets'),
      import('@rebonotes/editor/reboslides'),
      import('@rebonotes/editor/rebodocs'),
    ]).then(([{ mountNotes }, { sampleWorkspace }, collab, { sheetsFormat }, { slidesFormat }, { docsFormat }]) => {
      if (gone || !host.current) return;
      const notes = mountNotes(host.current, {
        workspace: sampleWorkspace(locale),
        locale,
        page,
        name: 'ReboNotes',
        logo: '/logo.svg',
        formats: [sheetsFormat, slidesFormat, docsFormat],
        // The language of the menu is the site's: the same page in the other one.
        onLocale: (next) => {
          window.location.href = localize(delocalize(window.location.pathname).path, next as Locale);
        },
      });
      notes.setTheme('light');
      Object.assign(window, { notes });
      const session = room ? collab.connectNotes(notes, room.room, { url: room.url, name: room.name }) : undefined;
      destroy = () => {
        session?.leave();
        notes.destroy();
      };
      setReady(true);
    });
    return () => {
      gone = true;
      destroy?.();
    };
  }, [locale, room?.url, room?.room, room?.name, page]);
  return (
    <div className={`relative ${className}`}>
      {!ready && <p className="absolute inset-0 m-0 flex items-center justify-center text-sm text-muted">{t({ en: 'Loading the notes…', es: 'Cargando las notas…' })}</p>}
      <div ref={host} className="h-full" />
    </div>
  );
}
