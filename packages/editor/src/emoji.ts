// A choice of emoji for the icon of a page or of a callout: a grid of the
// common ones, one at random, and a button to take the icon away.

import type { Strings } from './i18n';

export const EMOJI = [
  ...'📄📝📘📗📙📕📒📓📚🗂️🗓️📅📌📍📎🔖🏷️💼🗃️🗄️📦📫✉️📮'.match(/\p{Extended_Pictographic}️?/gu)!,
  ...'💡✨🔥⭐️🌟⚡️🎯🚀🎉🎨🧪🔬🧭🗺️🏠🏢🏗️🌱🌳🌍🌙☀️🌈❄️🌊'.match(/\p{Extended_Pictographic}️?/gu)!,
  ...'✅☑️❗️❓⚠️🛑ℹ️🔒🔑🛠️⚙️🧩🔗📈📉📊💰💳🧾🛒🎁🏆'.match(/\p{Extended_Pictographic}️?/gu)!,
  ...'😀😊🙂😎🤔🧠👋👍🙌👀💬🗣️👥🤝❤️💜💙💚🧡💛'.match(/\p{Extended_Pictographic}️?/gu)!,
  ...'☕️🍕🍎🎵🎬📷🎮⚽️🏃✈️🚗🐶🐱🦊🐝'.match(/\p{Extended_Pictographic}️?/gu)!,
];

export const randomEmoji = (): string => EMOJI[Math.floor(Math.random() * EMOJI.length)];

/** The grid, under `anchor`; `onPick` is told the emoji chosen, or null to take the icon away. */
export function openEmojiPicker(root: HTMLElement, anchor: DOMRect, t: Strings, onPick: (emoji: string | null) => void, removable = true): () => void {
  const doc = root.ownerDocument;
  const box = doc.createElement('div');
  box.className = 'rn-emoji';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', t.changeIcon);
  const bar = doc.createElement('div');
  bar.className = 'rn-emoji-bar';
  const random = doc.createElement('button');
  random.type = 'button';
  random.textContent = `🎲 ${t.randomIcon}`;
  random.addEventListener('click', () => pick(randomEmoji()));
  bar.append(random);
  if (removable) {
    const remove = doc.createElement('button');
    remove.type = 'button';
    remove.textContent = t.removeIcon;
    remove.addEventListener('click', () => pick(null));
    bar.append(remove);
  }
  const grid = doc.createElement('div');
  grid.className = 'rn-emoji-grid';
  for (const emoji of EMOJI) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = emoji;
    b.addEventListener('click', () => pick(emoji));
    grid.append(b);
  }
  box.append(bar, grid);
  root.append(box);
  const view = doc.defaultView!;
  const own = box.getBoundingClientRect();
  box.style.left = `${Math.max(8, Math.min(anchor.left, view.innerWidth - own.width - 8))}px`;
  box.style.top = `${anchor.bottom + own.height + 6 > view.innerHeight ? Math.max(8, anchor.top - own.height - 6) : anchor.bottom + 6}px`;

  const onOutside = (e: PointerEvent) => !box.contains(e.target as Node) && close();
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.preventDefault(), close());
  function close() {
    box.remove();
    doc.removeEventListener('pointerdown', onOutside, true);
    doc.removeEventListener('keydown', onKey, true);
  }
  function pick(emoji: string | null) {
    close();
    onPick(emoji);
  }
  setTimeout(() => {
    doc.addEventListener('pointerdown', onOutside, true);
    doc.addEventListener('keydown', onKey, true);
  });
  return close;
}
