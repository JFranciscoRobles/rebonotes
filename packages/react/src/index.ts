// The API of @rebonotes/react: the notes as a React component, or as headless
// hooks for an interface of one's own; collaboration in both.

export { type ClosedReason, type CollabState, createRoom, type Peer, type Session } from '@rebonotes/collab/browser';
export { createPage, markdownToPage, type Page, pageToMarkdown, sampleWorkspace, type Workspace, workspaceFromFiles, workspaceToFiles } from '@rebonotes/core';
export type { Notes, NotesOptions } from '@rebonotes/editor';
export type { NotesCollab } from './collab';
export { type NotesCommands, NotesPage, type NotesPageProps, NotesProvider, type NotesProviderProps, type NotesState, type TreePage, type UseNotes, useNotes, useOpenPage } from './headless';
export { NotesEditor, type NotesEditorProps } from './NotesEditor';
