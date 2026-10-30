// Word documents (.docx) shown in a page by Rebodocs' viewer: their pages as
// they print. Apart from the rest of the package, so that notes without
// Rebodocs do not carry its engine; it is loaded the first time a document
// is shown.
//
//   import { docsFormat } from '@rebonotes/editor/rebodocs';
//   mountNotes(element, { formats: [docsFormat] });

import type { EmbedFormat } from '../embed';

export const docsFormat: EmbedFormat = {
  icon: 'doc',
  test: (file) => /\.docx$/i.test(file.name) || file.type.includes('wordprocessingml'),
  async view(element, bytes, context) {
    const { createViewer, setLocale } = await import('@rebodocs/viewer');
    // Rebodocs' words are its own, for all its editors in the page.
    if (context.language) setLocale(context.language);
    const viewer = createViewer(element, bytes);
    return { destroy: () => viewer.destroy() };
  },
};
