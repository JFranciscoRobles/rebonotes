// Every package tried together, without a framework: the notes as they come,
// the sample workspace in them (or what was written last time, kept in the
// browser), the page in view kept in the address, and the menu (☰) to open,
// save, export, change the language and the appearance. The language is kept
// for the next visit; `?lang=en` asks for English. With
// `?collab=http://127.0.0.1:7450` a button shares the workspace in a room of
// the collaboration server, and the address it gives (`&room=…`) opened in
// another window is the same workspace, edited by both.

import { sampleWorkspace, type Workspace } from '@rebonotes/core';
import { connectNotes, createRoom, type Session } from '@rebonotes/collab/browser';
import { mountNotes, type Notes } from '@rebonotes/editor';
import { docsFormat } from '@rebonotes/editor/rebodocs';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';
import { slidesFormat } from '@rebonotes/editor/reboslides';

const host = document.querySelector<HTMLElement>('#notes')!;
const LOCALE_KEY = 'rebonotes:locale';
const STORE_KEY = 'rebonotes:workspace';
let notes: Notes;
let session: Session | undefined;
const params = new URLSearchParams(location.search);
const collabUrl = params.get('collab');

function mount(locale: string, workspace?: Workspace): void {
  notes?.destroy();
  notes = mountNotes(host, {
    locale,
    workspace,
    storageKey: collabUrl ? undefined : STORE_KEY,
    page: decodeURIComponent(location.hash.slice(1)) || undefined,
    name: 'ReboNotes',
    // Workbooks, decks and documents of the suite shown in the pages they are put in.
    formats: [sheetsFormat, slidesFormat, docsFormat],
    logo: '/logo.svg',
    onNavigate: (id) => history.replaceState(null, '', `#${id}`),
    onLocale: (next) => {
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {
        // Not kept: it lasts until the page is closed.
      }
      mount(next, notes.workspace);
    },
    onTheme: (appearance) => {
      if (appearance === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = appearance;
    },
  });
  document.documentElement.lang = locale;
  if (collabUrl) share(locale);
  // For trying things from the console.
  Object.assign(window, { notes });
}

/** The workspace in a room of the collaboration server: joined when the address has one, made with the button otherwise. */
function share(locale: string): void {
  session?.leave();
  const room = new URLSearchParams(location.search).get('room');
  const name = params.get('name') ?? (locale === 'en' ? 'Guest' : 'Invitado');
  const button = document.querySelector<HTMLButtonElement>('#share') ?? document.body.appendChild(Object.assign(document.createElement('button'), { id: 'share' }));
  const say = (text: string) => {
    button.textContent = text;
  };
  if (room) {
    session = connectNotes(notes, room, {
      url: collabUrl!,
      name,
      onChange: () => session && say(`${session.state === 'on' ? '●' : '○'} ${[session.name, ...session.peers.map((p) => p.name)].join(', ')}`),
    });
    button.onclick = () => navigator.clipboard?.writeText(location.href);
    return;
  }
  say(locale === 'en' ? 'Share' : 'Compartir');
  button.onclick = async () => {
    const id = await createRoom(collabUrl!, notes.workspace, 'ReboNotes');
    const url = new URL(location.href);
    url.searchParams.set('room', id);
    history.replaceState(null, '', url);
    share(locale);
  };
}

function firstLocale(): string {
  let kept: string | null = null;
  try {
    kept = localStorage.getItem(LOCALE_KEY);
  } catch {
    // Nowhere to keep it.
  }
  const asked = new URLSearchParams(location.search).get('lang') ?? kept ?? 'es';
  return asked.toLowerCase().startsWith('en') ? 'en' : 'es';
}

const locale = firstLocale();
// In a room the workspace is the room's: nothing is kept in the browser.
const inRoom = !!collabUrl && params.has('room');
let kept = false;
try {
  kept = !!localStorage.getItem(STORE_KEY);
} catch {
  // Nothing kept.
}
mount(locale, kept && !inRoom ? undefined : sampleWorkspace(locale));
addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (id && id !== notes.page) notes.open(id);
});
