import { describe, expect, it } from 'vitest';
import { createBlock, drawPage, markdownToPage, type PictureContext, PICTURE_SIZE } from '../src';

/** A context that draws nothing and keeps what was written, where, in what colour; each letter 8 pixels wide. */
function recorder() {
  const written: { text: string; x: number; y: number; color: unknown }[] = [];
  const images: unknown[] = [];
  const noop = () => undefined;
  const ctx: PictureContext = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textBaseline: '',
    fillText(text, x, y) {
      written.push({ text, x, y, color: ctx.fillStyle });
    },
    measureText: (text) => ({ width: text.length * 8 }),
    fillRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    rect: noop,
    clip: noop,
    drawImage: (image) => void images.push(image),
  };
  const text = () => written.map((w) => w.text).join('');
  return { ctx, written, images, text };
}

describe('a page as a picture', () => {
  it('writes its icon, its title and its blocks, numbering the items of a list', () => {
    const { ctx, text } = recorder();
    drawPage(ctx, { ...markdownToPage('## Visit\n\nThe **house** is fine.\n\n1. Keys\n2. Photos\n\n- [x] Called\n- [ ] Offer'), icon: '🏠', title: 'Notes' });
    const all = text();
    expect(all.startsWith('🏠Notes')).toBe(true);
    expect(all).toContain('Visit');
    expect(all).toContain('The house is fine.');
    expect(all).toContain('1.Keys');
    expect(all).toContain('2.Photos');
    expect(all).toContain('Called');
  });

  it('says what a page without a title is called', () => {
    const { ctx, written } = recorder();
    drawPage(ctx, { ...markdownToPage('Hello'), title: '' }, { untitled: 'Sin título' });
    expect(written[0].text).toBe('Sin título');
  });

  it('draws a link in the accent, and a task done in grey', () => {
    const { ctx, written } = recorder();
    drawPage(ctx, markdownToPage('See [the site](https://x.com)\n\n- [x] Done'));
    expect(written.find((w) => w.text === 'site')?.color).toBe('#c2255c');
    expect(written.find((w) => w.text === 'Done')?.color).toBe('#6b6964');
  });

  it('breaks a long paragraph into lines within the margins', () => {
    const { ctx, written } = recorder();
    drawPage(ctx, { ...markdownToPage('word '.repeat(200)), title: 'T' });
    const words = written.filter((w) => w.text === 'word');
    const lines = new Set(words.map((w) => w.y));
    expect(lines.size).toBeGreaterThan(5);
    for (const w of words) expect(w.x + 4 * 8).toBeLessThanOrEqual(PICTURE_SIZE.width - 72 + 0.01);
  });

  it('leaves out what is under a folded toggle, and what does not fit on the sheet', () => {
    const { ctx, text, written } = recorder();
    const page = markdownToPage('x');
    page.blocks = [
      createBlock('toggle', 'Folded', { folded: true }),
      createBlock('paragraph', 'Hidden', { indent: 1 }),
      createBlock('paragraph', 'After'),
      ...Array.from({ length: 200 }, (_, i) => createBlock('paragraph', `Line ${i}`)),
    ];
    drawPage(ctx, page);
    expect(text()).not.toContain('Hidden');
    expect(text()).toContain('After');
    expect(text()).not.toContain('Line 199');
    for (const w of written) expect(w.y).toBeLessThanOrEqual(PICTURE_SIZE.height);
  });

  it('draws a picture it is given, and a box for one it is not', () => {
    const { ctx, images } = recorder();
    const page = markdownToPage('![](https://x.com/a.png)\n\n![](https://x.com/b.png)');
    drawPage(ctx, page, { images: (src) => (src.endsWith('a.png') ? { image: 'A', width: 200, height: 100 } : undefined) });
    expect(images).toEqual(['A']);
  });
});
