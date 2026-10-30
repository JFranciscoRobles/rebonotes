// Workbooks (.xlsx and .csv) shown in a page by Rebosheets' viewer: the grid
// with its sheets, read only. Apart from the rest of the package, so that
// notes without Rebosheets do not carry its engine; it is loaded the first
// time a workbook is shown.
//
//   import { sheetsFormat } from '@rebonotes/editor/rebosheets';
//   mountNotes(element, { formats: [sheetsFormat] });

import type { EmbedFormat } from '../embed';

/** An .xlsx is a zip, which starts so; anything else is read as the text of a CSV. */
const sourceOf = (bytes: Uint8Array) => (bytes[0] === 0x50 && bytes[1] === 0x4b ? bytes : new TextDecoder().decode(bytes).replace(/^﻿/, ''));

export const sheetsFormat: EmbedFormat = {
  icon: 'table',
  test: (file) => /\.(xlsx|csv)$/i.test(file.name) || file.type.includes('spreadsheetml') || file.type === 'text/csv',
  async view(element, bytes, context) {
    const { createViewer } = await import('@rebosheets/viewer');
    const viewer = createViewer(element, sourceOf(bytes), { locale: context.language });
    return { destroy: () => viewer.destroy() };
  },
};
