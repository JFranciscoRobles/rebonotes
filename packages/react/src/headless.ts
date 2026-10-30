// The notes for whoever draws their own interface, in React: a provider that
// holds the workspace, the element the page is edited in, and a hook that
// gives what to show (the tree of pages, the page open, the path to it, who
// else is in) and what to do. Nothing here has a look of its own but the
// page itself: the side, the tree and the bars are the application's.
//
//   <NotesProvider workspace={ws} onChange={save}>
//     <MyTree />          uses useNotes()
//     <NotesPage className="flex-1" />
//   </NotesProvider>

import type { CollabState, Peer, Session } from '@rebonotes/collab/browser';
import { childrenOf, type Page, pageById, pathTo, searchPages, type SearchResult, type Workspace } from '@rebonotes/core';
import { mountNotes, type Notes } from '@rebonotes/editor';
import { type CSSProperties, createContext, createElement, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { connect, type NotesCollab } from './collab';

/** A page in the tree: what it is, and the pages inside it. */
export interface TreePage {
  id: string;
  title: string;
  icon?: string;
  depth: number;
  children: TreePage[];
}

export interface NotesState {
  workspace: Workspace;
  /** The pages as a tree. */
  tree: TreePage[];
  /** The page open, and the pages from the top down to it. */
  page: Page | undefined;
  path: Page[];
  /** Working with other people. Nothing when the notes are not shared. */
  collab?: { state: CollabState; peers: Peer[]; color: string; name: string; pending: number };
}

export interface NotesCommands {
  open(id: string): void;
  /** A new page, inside another or at the top, opened. */
  addPage(parent?: string, title?: string): Page | undefined;
  deletePage(id: string, ask?: boolean): void;
  duplicatePage(id: string): void;
  undo(): void;
  redo(): void;
  /** The quick search over the whole screen. */
  search(): void;
  /** The pages that have the words of a query, for a search of one's own. */
  find(query: string): SearchResult[];
  toMarkdown(id?: string): string;
  toZip(): Uint8Array;
  focus(): void;
}

export type UseNotes = NotesState & NotesCommands & { notes: Notes | undefined };

interface Store {
  notes: Notes | undefined;
  attach(notes: Notes | undefined): void;
  subscribe(fn: () => void): () => void;
  snapshot(): number;
  collab?: Session;
  setSession(session: Session | undefined): void;
  workspace: Workspace;
  /** The provider's props as they are now. */
  props: { current: NotesProviderProps };
}

const Context = createContext<Store | undefined>(undefined);

export interface NotesProviderProps {
  workspace?: Workspace;
  locale?: string;
  storageKey?: string;
  page?: string;
  onChange?: (workspace: Workspace) => void;
  onNavigate?: (id: string) => void;
  uploadImage?: (file: File) => Promise<string>;
  collab?: NotesCollab;
  onCollab?: (session: Session) => void;
  children?: ReactNode;
}

export function NotesProvider(props: NotesProviderProps): ReactNode {
  const latest = useRef(props);
  latest.current = props;
  const store = useMemo<Store>(() => {
    const listeners = new Set<() => void>();
    let version = 0;
    let offs: (() => void)[] = [];
    const bump = () => {
      version++;
      for (const fn of listeners) fn();
    };
    const store: Store = {
      notes: undefined,
      workspace: props.workspace ?? { pages: [] },
      props: latest,
      attach(notes) {
        for (const off of offs) off();
        offs = [];
        store.notes = notes;
        if (notes) {
          store.workspace = notes.workspace;
          offs = [notes.on('update', () => ((store.workspace = notes.workspace), bump())), notes.on('navigate', bump)];
        }
        bump();
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      snapshot: () => version,
      setSession(session) {
        store.collab = session;
        bump();
      },
    };
    return store;
  }, []);
  return createElement(Context.Provider, { value: store }, props.children);
}

function useStore(): Store {
  const store = useContext(Context);
  if (!store) throw new Error('useNotes and NotesPage go inside a NotesProvider.');
  return store;
}

const treeOf = (ws: Workspace, parent: string | undefined, depth: number): TreePage[] =>
  childrenOf(ws, parent).map((p) => ({ id: p.id, title: p.title, ...(p.icon ? { icon: p.icon } : {}), depth, children: treeOf(ws, p.id, depth + 1) }));

/** What to show of the notes and what to do with them. */
export function useNotes(): UseNotes {
  const store = useStore();
  const version = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  const notes = store.notes;
  const ws = store.workspace;
  const page = pageById(ws, notes?.page);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the tree follows the workspace, which `version` stands for.
  const tree = useMemo(() => treeOf(ws, undefined, 0), [ws, version]);
  const session = store.collab;
  return {
    notes,
    workspace: ws,
    tree,
    page,
    path: page ? pathTo(ws, page.id) : [],
    collab: session && { state: session.state, peers: session.peers, color: session.color, name: session.name, pending: session.pending },
    open: (id) => notes?.open(id),
    addPage: (parent, title) => notes?.addPage(parent, title),
    deletePage: (id, ask) => notes?.deletePage(id, ask),
    duplicatePage: (id) => notes?.duplicatePage(id),
    undo: () => notes?.undo(),
    redo: () => notes?.redo(),
    search: () => void notes?.search(),
    find: (query) => searchPages(ws, query),
    toMarkdown: (id) => notes?.toMarkdown(id) ?? '',
    toZip: () => notes?.toZip() ?? new Uint8Array(),
    focus: () => notes?.focus(),
  };
}

export interface NotesPageProps {
  className?: string;
  style?: CSSProperties;
}

/** The page open, edited in place: what the provider's notes are drawn in. Only one in a provider. */
export function NotesPage(props: NotesPageProps): ReactNode {
  const store = useStore();
  const host = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Notes>();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const o = store.props.current;
    const mounted = mountNotes(el, {
      workspace: o.workspace,
      locale: o.locale,
      storageKey: o.storageKey,
      page: o.page,
      menu: false,
      chrome: false,
      uploadImage: o.uploadImage,
      onChange: (ws) => store.props.current.onChange?.(ws),
      onNavigate: (id) => store.props.current.onNavigate?.(id),
    });
    store.attach(mounted);
    setNotes(mounted);
    return () => {
      store.attach(undefined);
      mounted.destroy();
      setNotes(undefined);
    };
  }, [store]);

  const collab = store.props.current.collab;
  useEffect(() => {
    if (!notes || !collab?.url || !collab.room) return;
    const leave = connect(notes, collab, (session) => {
      store.setSession(session);
      store.props.current.onCollab?.(session);
    });
    return () => {
      leave();
      store.setSession(undefined);
    };
  }, [notes, collab?.url, collab?.room, collab?.name, collab?.ticket]);

  return createElement('div', { ref: host, className: props.className, style: { height: '100%', ...props.style } });
}

/** A callback that opens a page: for links of one's own. */
export function useOpenPage(): (id: string) => void {
  const { notes } = useNotes();
  return useCallback((id: string) => notes?.open(id), [notes]);
}
