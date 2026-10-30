import { describe, expect, it } from 'vitest';
import { withoutIds } from './helpers';
import { blocksToMarkdown, markdownToBlocks, markdownToPage, markdownToSpans, pageToMarkdown, plainText, sampleWorkspace, type Span, spansToMarkdown } from '../src';

const roundTrip = (spans: Span[]) => markdownToSpans(spansToMarkdown(spans));

describe('the text of a block', () => {
  it('writes marks and reads them back', () => {
    const spans: Span[] = [{ text: 'plain ' }, { text: 'bold', marks: ['bold'] }, { text: ' and ' }, { text: 'both', marks: ['bold', 'italic'] }, { text: ' end' }];
    expect(spansToMarkdown(spans)).toBe('plain **bold** and ***both*** end');
    expect(roundTrip(spans)).toEqual(spans);
  });

  it('keeps marks that overlap', () => {
    const spans: Span[] = [
      { text: 'a', marks: ['bold'] },
      { text: 'b', marks: ['bold', 'italic'] },
      { text: 'c', marks: ['italic'] },
    ];
    expect(roundTrip(spans)).toEqual(spans);
  });

  it('puts the spaces outside the marks', () => {
    expect(spansToMarkdown([{ text: 'a ' }, { text: ' b ', marks: ['bold'] }, { text: 'c' }])).toBe('a  **b** c');
  });

  it('writes underline, strike, code, links and line breaks', () => {
    const spans: Span[] = [
      { text: 'u', marks: ['underline'] },
      { text: ' ' },
      { text: 's', marks: ['strike'] },
      { text: ' ' },
      { text: 'x`y', marks: ['code'] },
      { text: ' ' },
      { text: 'site', link: 'https://a.b/(c)' },
      { text: '\nnext' },
    ];
    const md = spansToMarkdown(spans);
    expect(md).toBe('<u>u</u> ~~s~~ ``x`y`` [site](https://a.b/%28c%29)<br>next');
    expect(roundTrip(spans)).toEqual(spans);
  });

  it('escapes what would be read as marks', () => {
    const spans: Span[] = [{ text: 'a*b_c [d] `e` <u> \\' }];
    expect(roundTrip(spans)).toEqual(spans);
  });

  it('keeps an underscore inside a word', () => {
    expect(markdownToSpans('snake_case_name and _it_')).toEqual([{ text: 'snake_case_name and ' }, { text: 'it', marks: ['italic'] }]);
  });

  it('reads a link to a page, with marks inside', () => {
    expect(markdownToSpans('see [**the** page](page:abc)')).toEqual([{ text: 'see ' }, { text: 'the', marks: ['bold'], page: 'abc' }, { text: ' page', page: 'abc' }]);
  });

  it('leaves a lone star as a star', () => {
    expect(markdownToSpans('2 * 3 = 6')).toEqual([{ text: '2 * 3 = 6' }]);
  });
});

describe('blocks', () => {
  it('reads every kind of block', () => {
    const blocks = markdownToBlocks(
      [
        '# One',
        '## Two',
        '### Three',
        'A paragraph',
        'that goes on.',
        '',
        '- item',
        '  - under it',
        '1. first',
        '2. second',
        '- [ ] to do',
        '- [x] done',
        '> a quote',
        '> on two lines',
        '',
        '> [!WARNING]',
        '> careful',
        '',
        '```js',
        'let a = 1;',
        '',
        'a++;',
        '```',
        '---',
        '![a cat](cat.png)',
        '[Other](page:p2)',
      ].join('\n'),
    );
    expect(blocks.map((b) => b.type)).toEqual([
      'heading1',
      'heading2',
      'heading3',
      'paragraph',
      'bulleted',
      'bulleted',
      'numbered',
      'numbered',
      'todo',
      'todo',
      'quote',
      'callout',
      'code',
      'divider',
      'image',
      'page',
    ]);
    expect(plainText(blocks[3].text)).toBe('A paragraph that goes on.');
    expect(blocks[5].indent).toBe(1);
    expect(blocks[9].checked).toBe(true);
    expect(plainText(blocks[10].text)).toBe('a quote\non two lines');
    expect(blocks[11]).toMatchObject({ icon: '⚠️', text: [{ text: 'careful' }] });
    expect(blocks[12]).toMatchObject({ language: 'js', text: [{ text: 'let a = 1;\n\na++;' }] });
    expect(blocks[14]).toMatchObject({ src: 'cat.png', text: [{ text: 'a cat' }] });
    expect(blocks[15]).toMatchObject({ page: 'p2', text: [{ text: 'Other' }] });
  });

  it('writes blocks and reads the same back', () => {
    const source = markdownToBlocks(
      [
        '- a',
        '  1. b',
        '  2. c',
        '- [x] d',
        '',
        '> [!NOTE]',
        '> 🧪 test',
        '',
        '<details>',
        '<summary>Fold</summary>',
        '',
        '  inside',
        '',
        '  - item inside',
        '',
        '</details>',
        '',
        'after',
        '',
        '\\# not a heading',
      ].join('\n'),
    );
    const again = markdownToBlocks(blocksToMarkdown(source));
    const strip = (bs: typeof source) => bs.map(({ id: _id, ...b }) => b);
    expect(strip(again)).toEqual(strip(source));
    expect(source.find((b) => b.type === 'toggle')).toMatchObject({ folded: true, text: [{ text: 'Fold' }] });
    expect(source.find((b) => plainText(b.text) === 'inside')?.indent).toBe(1);
    expect(source.find((b) => plainText(b.text) === 'after')?.indent).toBeUndefined();
    expect(source.at(-1)).toMatchObject({ type: 'paragraph', text: [{ text: '# not a heading' }] });
    expect(source.find((b) => b.type === 'callout')).toMatchObject({ icon: '🧪', text: [{ text: 'test' }] });
  });

  it('numbers a numbered list from 1 at each level', () => {
    const md = blocksToMarkdown(markdownToBlocks('1. a\n1. b\n   - c\n1. d'));
    expect(md).toBe('1. a\n2. b\n  - c\n3. d');
  });
});

describe('pages', () => {
  it('keeps what a page is in front matter and its title as the first heading', () => {
    const page = markdownToPage('---\nid: "p1"\nicon: "📘"\ncreated: "2026-01-02T00:00:00.000Z"\n---\n\n# My page\n\nHello');
    expect(page).toMatchObject({ id: 'p1', icon: '📘', title: 'My page', created: Date.parse('2026-01-02T00:00:00.000Z') });
    expect(page.blocks.map((b) => plainText(b.text))).toEqual(['Hello']);
    const again = markdownToPage(pageToMarkdown(page));
    expect(withoutIds(again)).toEqual(withoutIds(page));
  });

  it('takes a title when the file has no heading', () => {
    expect(markdownToPage('Just text', { title: 'From the file name' }).title).toBe('From the file name');
  });

  it('reads the sample workspace in both languages', () => {
    for (const locale of ['en', 'es']) {
      const ws = sampleWorkspace(locale);
      expect(ws.pages.map((p) => p.id)).toEqual(['welcome', 'meeting', 'ideas', 'projects']);
      expect(ws.pages[3].blocks.filter((b) => b.type === 'database')).toHaveLength(2);
      const types = new Set(ws.pages[0].blocks.map((b) => b.type));
      for (const type of ['callout', 'heading2', 'bulleted', 'todo', 'toggle', 'code', 'divider', 'page']) expect(types).toContain(type);
      // The welcome page goes through Markdown and comes back the same.
      expect(withoutIds(markdownToPage(pageToMarkdown(ws.pages[0])))).toEqual(withoutIds(ws.pages[0]));
    }
  });
});
