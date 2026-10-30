// A page of notes as a picture, in the page: drawn by the engine on a canvas
// of its own, with the pictures of the page in it when the place they come
// from lets them be drawn (else a box where they go: a picture from another
// place that does not would make the canvas unreadable). For the thumbnail of
// a note in a drive, as the first page of a Word document or the first slide
// of a deck is one.

import { drawPage, type Loaded, PICTURE_SIZE, type Page, type PictureOptions, type Workspace } from '@rebonotes/core';

/** How long a picture of the page is waited for before its box is drawn instead. */
const WAIT = 4000;

function load(src: string): Promise<Loaded | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(undefined), WAIT);
    image.crossOrigin = 'anonymous';
    image.onload = () => (clearTimeout(timer), resolve({ image, width: image.naturalWidth || 1, height: image.naturalHeight || 1 }));
    image.onerror = () => (clearTimeout(timer), resolve(undefined));
    image.src = src;
  });
}

/** A page drawn on a canvas whose longest side, its height, is `size` pixels, its pictures loaded first. */
export async function pageCanvas(page: Page, size: number, options: Omit<PictureOptions, 'images'> = {}): Promise<HTMLCanvasElement> {
  const scale = size / PICTURE_SIZE.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PICTURE_SIZE.width * scale);
  canvas.height = Math.round(PICTURE_SIZE.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas here.');
  const sources = [...new Set(page.blocks.filter((b) => b.type === 'image' && b.src).map((b) => b.src as string))];
  const loaded = new Map(await Promise.all(sources.map(async (src) => [src, await load(src)] as const)));
  ctx.scale(scale, scale);
  drawPage(ctx, page, { ...options, images: (src) => loaded.get(src) });
  return canvas;
}

/** The workspace a file of notes has (its JSON, as `{ pages }`); an empty one when it is not one. */
export function readNotesFile(bytes: Uint8Array): Workspace {
  try {
    const read = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Workspace>;
    if (Array.isArray(read?.pages)) return { pages: read.pages };
  } catch {}
  return { pages: [] };
}

/**
 * The first page of a file of notes as a picture, its longest side `size` pixels, as the editor shows it in light.
 * JPEG, or PNG when `type` says. `untitled`, what a page without a title is called.
 */
export async function pictureOfNote(bytes: Uint8Array, size: number, type = 'image/jpeg', quality = 0.85, untitled?: string): Promise<Blob> {
  const workspace = readNotesFile(bytes);
  const first = workspace.pages.find((p) => !p.parent) ?? { id: '', title: '', blocks: [], created: 0, updated: 0 };
  const canvas = await pageCanvas(first, size, { workspace, untitled });
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The canvas made no picture.'))), type, quality));
}
