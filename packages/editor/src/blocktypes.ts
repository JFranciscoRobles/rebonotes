// The kinds of block the slash menu offers and a block can be turned into:
// each with its icon, its name and line in the interface, the words it is
// found by in either language, and the Markdown that makes it as it is typed.

import type { BlockType } from '@rebonotes/core';
import type { Strings } from './i18n';

export interface BlockKind {
  id: string;
  /** The type it makes; none for what is not a type (a link to a page). */
  type?: BlockType;
  icon: string;
  label: keyof Strings;
  hint: keyof Strings;
  words: string;
  /** What typed at the start of a line makes it. */
  markdown?: string;
}

export const BLOCK_KINDS: BlockKind[] = [
  { id: 'paragraph', type: 'paragraph', icon: 'text', label: 'typeParagraph', hint: 'typeParagraphText', words: 'text texto paragraph parrafo plain' },
  { id: 'heading1', type: 'heading1', icon: 'heading1', label: 'typeHeading1', hint: 'typeHeading1Text', words: 'h1 heading titulo title', markdown: '#' },
  { id: 'heading2', type: 'heading2', icon: 'heading2', label: 'typeHeading2', hint: 'typeHeading2Text', words: 'h2 heading titulo subtitle', markdown: '##' },
  { id: 'heading3', type: 'heading3', icon: 'heading3', label: 'typeHeading3', hint: 'typeHeading3Text', words: 'h3 heading titulo', markdown: '###' },
  { id: 'bulleted', type: 'bulleted', icon: 'bulleted', label: 'typeBulleted', hint: 'typeBulletedText', words: 'ul list lista bullet viñetas puntos', markdown: '-' },
  { id: 'numbered', type: 'numbered', icon: 'numbered', label: 'typeNumbered', hint: 'typeNumberedText', words: 'ol list lista numbers numeros', markdown: '1.' },
  { id: 'todo', type: 'todo', icon: 'todo', label: 'typeTodo', hint: 'typeTodoText', words: 'todo task tarea check checkbox casilla', markdown: '[]' },
  { id: 'toggle', type: 'toggle', icon: 'toggle', label: 'typeToggle', hint: 'typeToggleText', words: 'toggle desplegable collapse details plegable' },
  { id: 'quote', type: 'quote', icon: 'quote', label: 'typeQuote', hint: 'typeQuoteText', words: 'quote cita blockquote', markdown: '>' },
  { id: 'callout', type: 'callout', icon: 'callout', label: 'typeCallout', hint: 'typeCalloutText', words: 'callout destacado note nota aviso tip' },
  { id: 'code', type: 'code', icon: 'code', label: 'typeCode', hint: 'typeCodeText', words: 'code codigo snippet pre', markdown: '```' },
  { id: 'divider', type: 'divider', icon: 'divider', label: 'typeDivider', hint: 'typeDividerText', words: 'divider separador line linea hr', markdown: '---' },
  { id: 'image', type: 'image', icon: 'image', label: 'typeImage', hint: 'typeImageText', words: 'image imagen picture foto photo' },
  { id: 'page', type: 'page', icon: 'page', label: 'typePage', hint: 'typePageText', words: 'page pagina subpage subpagina' },
  { id: 'link', icon: 'link', label: 'typeLinkPage', hint: 'typeLinkPageText', words: 'link enlace mention mencion page pagina' },
  { id: 'database', type: 'database', icon: 'table', label: 'typeDatabase', hint: 'typeDatabaseText', words: 'database base datos tabla table rows filas' },
  { id: 'board', type: 'database', icon: 'board', label: 'typeBoard', hint: 'typeBoardText', words: 'board tablero kanban columnas estado' },
  { id: 'file', type: 'embed', icon: 'file', label: 'typeFile', hint: 'typeFileText', words: 'file archivo upload subir excel xlsx hoja sheet slides presentacion docx documento pdf video' },
  { id: 'embedLink', type: 'embed', icon: 'external', label: 'typeEmbed', hint: 'typeEmbedText', words: 'embed insertar link enlace youtube vimeo video web url' },
];

/** What a block can be turned into: the kinds with text. */
export const TURN_INTO = BLOCK_KINDS.filter((k) => ['paragraph', 'heading1', 'heading2', 'heading3', 'bulleted', 'numbered', 'todo', 'toggle', 'quote', 'callout', 'code'].includes(k.id));

/** The kind a block is. */
export const kindOf = (type: BlockType): BlockKind | undefined => BLOCK_KINDS.find((k) => k.type === type);
