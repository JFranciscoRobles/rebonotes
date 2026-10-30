// Decks (.reboslides) shown in a page by ReboSlides' viewer: the slides one
// by one, to go through and present. Apart from the rest of the package, so
// that notes without ReboSlides do not carry its engine; it is loaded the
// first time a deck is shown.
//
//   import { slidesFormat } from '@rebonotes/editor/reboslides';
//   mountNotes(element, { formats: [slidesFormat] });

import type { EmbedFormat } from '../embed';

export const slidesFormat: EmbedFormat = {
  icon: 'slides',
  test: (file) => /\.reboslides$/i.test(file.name) || file.type === 'application/vnd.reboslides+zip',
  async view(element, bytes, context) {
    const { createViewer } = await import('@reboslides/viewer');
    const viewer = createViewer(element, bytes, { locale: context.language });
    return { destroy: () => viewer.destroy() };
  },
};
