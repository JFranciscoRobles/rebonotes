// A file put in a page: a card with its name, to open or download it, and
// the file itself under it when it can be shown: a workbook, a deck or a
// document of the Rebo suite by the formats the application gives, a PDF, a
// video or a sound by the browser, a video of YouTube or Vimeo in its player.

import type { Strings } from './i18n';
import { icon } from './icons';

/** What a shown file is taken down with. */
export interface ShownFile {
  destroy(): void;
}

/** A kind of file the notes can show in a page, as the formats of `@rebonotes/editor/rebosheets` and the others are. */
export interface EmbedFormat {
  /** Whether a file is of this kind, by its name and its type. */
  test(file: { name: string; type: string }): boolean;
  /** The file shown in `element`, and what takes it down. */
  view(element: HTMLElement, bytes: Uint8Array, context: { language: string }): ShownFile | Promise<ShownFile>;
  /** The icon of the card. */
  icon?: string;
}

const extension = (name: string) => name.split('?')[0].split('.').pop()?.toLowerCase() ?? '';

/** The name a file is shown by: what the block says, or the end of its address. */
export const fileNameOf = (src: string, text: string): string => text || (src.startsWith('data:') ? 'file' : decodeURIComponent(src.split('?')[0].split('/').pop() || src));

/** A video of YouTube or Vimeo, as the address of its player. */
function playerOf(src: string): string | undefined {
  const yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = src.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return undefined;
}

/** The type of a file by its name, or by its data: address. */
function typeOf(src: string, name: string): string {
  const data = src.match(/^data:([^;,]+)/);
  if (data) return data[1];
  const ext = extension(name);
  return (
    (
      {
        pdf: 'application/pdf',
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        m4a: 'audio/mp4',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      } as Record<string, string>
    )[ext] ?? ''
  );
}

/**
 * The card of a file and the file under it, drawn into `box`. Gives what
 * takes down what was shown (a viewer of the suite has its own to take down).
 */
export function renderEmbed(box: HTMLElement, src: string, text: string, formats: readonly EmbedFormat[], t: Strings, language: string): () => void {
  const doc = box.ownerDocument;
  const name = fileNameOf(src, text);
  const type = typeOf(src, name);
  const format = formats.find((f) => f.test({ name, type }));
  const player = playerOf(src);
  box.className = 'rn-embed';
  box.contentEditable = 'false';

  const head = doc.createElement('div');
  head.className = 'rn-embed-head';
  const kind = format?.icon ?? (player || type.startsWith('video/') ? 'video' : type === 'application/pdf' ? 'pdf' : /^https?:/.test(src) && !extension(name).match(/^\w{2,5}$/) ? 'link' : 'file');
  const mark = doc.createElement('span');
  mark.className = 'rn-embed-icon';
  mark.append(icon(doc, kind, 18));
  const label = doc.createElement('span');
  label.className = 'rn-embed-name';
  label.textContent = name;
  const open = doc.createElement('a');
  open.className = 'rn-embed-act';
  open.href = src;
  open.target = '_blank';
  open.rel = 'noopener noreferrer';
  open.title = t.openLink;
  open.append(icon(doc, 'external', 16));
  const save = doc.createElement('a');
  save.className = 'rn-embed-act';
  save.href = src;
  save.download = name;
  save.title = t.download;
  save.append(icon(doc, 'download', 16));
  head.append(mark, label, open, save);
  box.replaceChildren(head);

  let shown: ShownFile | undefined;
  let gone = false;
  const body = doc.createElement('div');
  body.className = 'rn-embed-body';

  if (format) {
    body.classList.add('rn-embed-suite');
    box.append(body);
    const loading = doc.createElement('div');
    loading.className = 'rn-embed-loading';
    loading.textContent = t.loading;
    body.append(loading);
    void (async () => {
      try {
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        if (gone) return;
        body.replaceChildren();
        const view = await format.view(body, bytes, { language });
        if (gone) view.destroy();
        else shown = view;
      } catch {
        if (!gone) body.replaceChildren(Object.assign(doc.createElement('div'), { className: 'rn-embed-loading', textContent: t.cannotShow }));
      }
    })();
  } else if (player) {
    const frame = doc.createElement('iframe');
    frame.src = player;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.loading = 'lazy';
    body.classList.add('rn-embed-video');
    body.append(frame);
    box.append(body);
  } else if (type.startsWith('video/')) {
    const video = doc.createElement('video');
    video.src = src;
    video.controls = true;
    video.preload = 'metadata';
    body.append(video);
    box.append(body);
  } else if (type.startsWith('audio/')) {
    const audio = doc.createElement('audio');
    audio.src = src;
    audio.controls = true;
    body.classList.add('rn-embed-audio');
    body.append(audio);
    box.append(body);
  } else if (type === 'application/pdf') {
    const frame = doc.createElement('iframe');
    frame.src = src;
    frame.title = name;
    body.classList.add('rn-embed-suite');
    body.append(frame);
    box.append(body);
  }
  return () => {
    gone = true;
    shown?.destroy();
  };
}
