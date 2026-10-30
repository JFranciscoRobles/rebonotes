// The icons of the interface: lines of the same weight on a grid of 20, in
// the colour of the text they stand beside, so that they follow the theme.

const PATHS: Record<string, string> = {
  menu: 'M3.5 5.5h13M3.5 10h13M3.5 14.5h13',
  search: 'M8.75 3.5a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM12.5 12.5l4 4',
  plus: 'M10 4.25v11.5M4.25 10h11.5',
  page: 'M5.25 2.75h6.25l3.25 3.25v11.25h-9.5zM11.5 2.75V6h3.25M7.75 10h4.5M7.75 13h4.5',
  chevronRight: 'M8 5.5 12.5 10 8 14.5',
  chevronDown: 'M5.5 8 10 12.5 14.5 8',
  grip: 'M7.5 5h.01M12.5 5h.01M7.5 10h.01M12.5 10h.01M7.5 15h.01M12.5 15h.01',
  more: 'M5 10h.01M10 10h.01M15 10h.01',
  trash: 'M4.25 6h11.5M8 6V4h4v2M6 6l.75 10.25h6.5L14 6',
  duplicate: 'M7 7h8.75v8.75H7zM4.25 13V4.25H13',
  text: 'M4.5 5.25h11M10 5.25v10.5',
  heading1: 'M3.75 4.75v10.5M10.25 4.75v10.5M3.75 10h6.5M13.5 8.25l2.25-1.5v8.5',
  heading2: 'M3.25 4.75v10.5M9.25 4.75v10.5M3.25 10h6M12.25 8.4a1.9 1.9 0 0 1 3.75.45c0 1.6-3.75 3.4-3.75 6.4H16',
  heading3: 'M3.25 4.75v10.5M9.25 4.75v10.5M3.25 10h6M12.4 7.5h3.5l-2 2.6a2 2 0 1 1-1.6 3.4',
  bulleted: 'M7.75 5.5h8.75M7.75 10h8.75M7.75 14.5h8.75M3.75 5.5h.01M3.75 10h.01M3.75 14.5h.01',
  numbered: 'M8.25 5.5h8.25M8.25 10h8.25M8.25 14.5h8.25M3.5 4.5l1-.75v3.5M3.5 12.25a1 1 0 0 1 2 .25c0 .75-2 1.5-2 2.5h2',
  todo: 'M3.75 3.75h12.5v12.5H3.75zM6.75 10.25 9 12.5l4.25-5',
  toggle: 'M4.5 6.5l2.5 2.25L4.5 11M9.75 8.75h6.5M9.75 13.5h4.5',
  quote: 'M4.5 4.5v11M8.5 6.5h7.25M8.5 10h7.25M8.5 13.5h5',
  callout: 'M3.75 4.25h12.5v9.5H9l-3.5 2.5v-2.5H3.75zM7 8h6.25M7 10.75h4',
  code: 'M7.25 6 3.25 10l4 4M12.75 6l4 4-4 4',
  divider: 'M3.25 10h13.5',
  image: 'M3.25 4.25h13.5v11.5H3.25zM3.25 13l4-4 3.5 3.5 2-2 4 4M12.75 7.75h.01',
  link: 'M8.5 11.5a3 3 0 0 0 4.25 0l2.5-2.5a3 3 0 0 0-4.25-4.25l-.75.75M11.5 8.5a3 3 0 0 0-4.25 0l-2.5 2.5a3 3 0 0 0 4.25 4.25l.75-.75',
  bold: 'M6 3.75h4.75a3 3 0 0 1 0 6H6zM6 9.75h5.5a3.25 3.25 0 0 1 0 6.5H6z',
  italic: 'M9 3.75h6M5 16.25h6M12 3.75 8 16.25',
  underline: 'M6 3.75V9a4 4 0 0 0 8 0V3.75M4.75 16.75h10.5',
  strike: 'M13.9 6.4C13.4 4.9 12 4 10 4 7.8 4 6.25 5.1 6.25 6.75c0 1.2.8 2.05 2.4 2.6M3.75 10h12.5M6.3 13.4c.45 1.6 1.9 2.6 3.85 2.6 2.3 0 3.9-1.15 3.9-2.85 0-.45-.1-.85-.3-1.2',
  turnInto: 'M4 7.5h10.5l-3-3M16 12.5H5.5l3 3',
  smile: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM7 11.75a3.5 3.5 0 0 0 6 0M7.5 8h.01M12.5 8h.01',
  sidebar: 'M3.25 4.25h13.5v11.5H3.25zM7.75 4.25v11.5',
  undo: 'M7.5 5 4 8.5 7.5 12M4 8.5h8.25a3.75 3.75 0 0 1 0 7.5H10',
  redo: 'M12.5 5 16 8.5 12.5 12M16 8.5H7.75a3.75 3.75 0 0 0 0 7.5H10',
  back: 'M12 4.5 6.5 10l5.5 5.5',
  close: 'M5 5l10 10M15 5 5 15',
  open: 'M3.25 6V4.75a1 1 0 0 1 1-1h3.5l1.75 2h6.25a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H4.25a1 1 0 0 1-1-1z',
  save: 'M4.25 3.25h9l2.5 2.5v10a1 1 0 0 1-1 1H4.25a1 1 0 0 1-1-1V4.25a1 1 0 0 1 1-1zM6.5 3.25v4h6v-4M6.5 16.75v-5h7v5',
  download: 'M10 3.5v9M6.5 9 10 12.5 13.5 9M4 16.25h12',
  markdown: 'M2.75 5.25h14.5v9.5H2.75zM5.25 12.25v-4.5l2 2.25 2-2.25v4.5M13.25 7.75v4.5M11.5 10.5l1.75 1.75L15 10.5',
  globe: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM3 10h14M10 3c1.9 2 2.8 4.4 2.8 7s-.9 5-2.8 7c-1.9-2-2.8-4.4-2.8-7S8.1 5 10 3z',
  contrast: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 3v14',
  notes: 'M5.25 2.75h9.5v14.5h-9.5zM7.75 6.5h4.5M7.75 9.5h4.5M7.75 12.5h2.5',
  table: 'M3.25 3.75h13.5v12.5H3.25zM3.25 7.75h13.5M3.25 12h13.5M8 7.75v8.5',
  board: 'M3.25 3.75h3.5v12.5h-3.5zM8.25 3.75h3.5v8h-3.5zM13.25 3.75h3.5v10h-3.5z',
  number: 'M7.5 3.75 6 16.25M14 3.75l-1.5 12.5M4 7.5h12.5M3.5 12.5H16',
  select: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM7 9.25l3 3 3-3',
  calendar: 'M3.75 4.75h12.5v11.5H3.75zM3.75 8.25h12.5M7 3.25v3M13 3.25v3',
  formula: 'M12.75 4c-1.6 0-2.4.9-2.7 2.6L8.5 14.5c-.3 1.5-1 2.25-2.25 2.25M6.75 8.25h6M12 11l3.5 4M15.5 11 12 15',
  sortAsc: 'M6 3.75v12.5M3.25 6.5 6 3.75 8.75 6.5M11 5.25h2.5M11 10h4M11 14.75h5.75',
  sortDesc: 'M6 3.75v12.5M3.25 13.5 6 16.25l2.75-2.75M11 5.25h5.75M11 10h4M11 14.75h2.5',
  file: 'M5.25 2.75h6.25l3.25 3.25v11.25h-9.5zM11.5 2.75V6h3.25',
  pdf: 'M5.25 2.75h6.25l3.25 3.25v11.25h-9.5zM11.5 2.75V6h3.25M7.25 13.75v-3.5h1.25a1 1 0 0 1 0 2H7.25M11 10.25v3.5h.75a1.25 1.75 0 0 0 0-3.5z',
  video: 'M3.25 5.25h10v9.5h-10zM13.25 8.75l3.5-2v6.5l-3.5-2',
  external: 'M11 3.75h5.25V9M16.25 3.75 9.5 10.5M8.25 5H4.75a1 1 0 0 0-1 1v9.25a1 1 0 0 0 1 1H14a1 1 0 0 0 1-1v-3.5',
  slides: 'M3.25 4.25h13.5v9.5H3.25zM10 13.75v3M7 16.75h6',
  doc: 'M5.25 2.75h9.5v14.5h-9.5zM7.75 6.5h4.5M7.75 9.5h4.5M7.75 12.5h4.5',
};

/** One of the icons, as an SVG element. */
export function icon(doc: Document, name: string, size = 20): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'rn-icon');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', PATHS[name] ?? '');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', name === 'grip' || name === 'more' ? '2.6' : name === 'bold' ? '2' : '1.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** A shortcut as the system writes it: ⌘B on a Mac, Ctrl+B elsewhere. "Mod" stands for either. */
export function shortcut(keys: string): string {
  if (isMac())
    return keys
      .replace(/Mod\+/g, '⌘')
      .replace(/Shift\+/g, '⇧')
      .replace(/Alt\+/g, '⌥');
  return keys.replace(/Mod\+/g, 'Ctrl+');
}
