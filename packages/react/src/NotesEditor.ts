// The notes as a React component: the side with the tree of pages and the
// page in view, given a workspace. It renders nothing on the server; it is
// mounted in the browser, after the first render.

import type { Session } from '@rebonotes/collab/browser';
import type { Workspace } from '@rebonotes/core';
import { type Appearance, mountNotes, type Notes, type NotesOptions } from '@rebonotes/editor';
import { type CSSProperties, createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { connect, type NotesCollab } from './collab';

export interface NotesEditorProps extends Omit<NotesOptions, 'onChange' | 'onTheme'> {
  /** Called after every change, with the workspace as it is now. */
  onChange?: (workspace: Workspace) => void;
  /** Called with the notes once they are there, and with nothing when they are gone. */
  onReady?: (notes: Notes | undefined) => void;
  /** Light or dark; as the system when left out. */
  theme?: 'light' | 'dark';
  onTheme?: (appearance: Appearance) => void;
  /** Works on the workspace with other people, in a room of the collaboration server. */
  collab?: NotesCollab;
  /** Told the state of the collaboration and the people in the room, as they change. */
  onCollab?: (session: Session) => void;
  className?: string;
  /** The element takes the height of what it is in: something must give it one. */
  style?: CSSProperties;
}

/**
 * The workspace is opened again when the one given changes. Another `locale`
 * mounts the notes again in that language, with the workspace as it is and
 * the same page open. The other options are read when they are mounted; the
 * callbacks follow their props, and `page` opens that page when it changes.
 */
export const NotesEditor = forwardRef<Notes | undefined, NotesEditorProps>(function NotesEditor(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [notes, setNotes] = useState<Notes>();
  /** The workspace given the last time they were mounted, and what they had when they were taken down. */
  const given = useRef<{ workspace?: Workspace; last?: Workspace; page?: string }>({});

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const p = latest.current;
    const same = given.current.workspace === p.workspace && given.current.last;
    const carried = same ? given.current.last : undefined;
    const page = same ? given.current.page : p.page;
    given.current = { workspace: p.workspace };
    const mounted = mountNotes(el, {
      ...p,
      workspace: carried ?? p.workspace,
      page,
      onChange: (ws) => latest.current.onChange?.(ws),
      onNavigate: (id) => latest.current.onNavigate?.(id),
      onLocale: p.onLocale && ((value) => latest.current.onLocale?.(value)),
      onTheme: (value) => latest.current.onTheme?.(value),
    });
    setNotes(mounted);
    return () => {
      given.current.last = mounted.workspace;
      given.current.page = mounted.page;
      mounted.destroy();
      setNotes(undefined);
    };
  }, [props.workspace, props.locale]);

  useEffect(() => {
    if (notes && props.page && props.page !== notes.page) notes.open(props.page);
  }, [notes, props.page]);

  useEffect(() => {
    notes?.setTheme(props.theme ?? 'system');
  }, [notes, props.theme]);

  const { url, room, name: who, ticket } = props.collab ?? {};
  useEffect(() => {
    if (!notes || !url || !room) return;
    return connect(notes, { url, room, name: who, ticket }, (session) => latest.current.onCollab?.(session));
  }, [notes, url, room, who, ticket]);

  useImperativeHandle(ref, () => notes, [notes]);
  useEffect(() => {
    latest.current.onReady?.(notes);
    return () => latest.current.onReady?.(undefined);
  }, [notes]);

  return createElement('div', { ref: host, className: props.className, style: { height: '100%', ...props.style } });
});
