// The notes drawn in the hero: a picture of a page being written, made of
// CSS alone, laid out as the editor comes: the side with the tree of pages,
// and the page with its title, a list of tasks, a small database with a
// formula, and the slash menu open under a line being typed. A note from an
// assistant floats in beside it.

import type { L } from '@/lib/i18n';
import { getT } from '@/lib/locale';

const island = 'rounded-[14px] border border-[#e6e3dc] bg-white';
const TREE: [string, L, number, boolean?][] = [
  ['👋', { en: 'Welcome', es: 'Bienvenida' }, 0],
  ['🚀', { en: 'Launch plan', es: 'Plan de lanzamiento' }, 0, true],
  ['🗓️', { en: 'Meeting notes', es: 'Notas de reunión' }, 1],
  ['📊', { en: 'Budget', es: 'Presupuesto' }, 1],
  ['💡', { en: 'Ideas', es: 'Ideas' }, 0],
];
const TASKS: [L, boolean][] = [
  [{ en: 'Write the announcement', es: 'Escribir el anuncio' }, true],
  [{ en: 'Record the demo', es: 'Grabar la demo' }, true],
  [{ en: 'Send it to the team', es: 'Mandarlo al equipo' }, false],
];
const BUDGET: [L, string, string, string][] = [
  [{ en: 'Ads', es: 'Anuncios' }, '120', '3', '360'],
  [{ en: 'Video', es: 'Video' }, '450', '1', '450'],
];
const MENU: [string, L, L][] = [
  ['▦', { en: 'Database', es: 'Base de datos' }, { en: 'A table with formulas', es: 'Una tabla con fórmulas' }],
  ['▥', { en: 'Board', es: 'Tablero' }, { en: 'Cards by status', es: 'Tarjetas por estado' }],
  ['▤', { en: 'File', es: 'Archivo' }, { en: 'A workbook, a deck…', es: 'Una hoja, una presentación…' }],
];

export function HeroNotes() {
  const t = getT();
  return (
    <div className="relative mx-auto mt-16 max-w-[980px] text-left" aria-hidden="true">
      <div className="flex gap-2 overflow-hidden rounded-[22px] border border-border bg-[#efede8] p-2 shadow-editor sm:gap-2.5 sm:p-2.5">
        {/* The side: the tree of pages. */}
        <div className={`${island} hidden w-[210px] flex-none flex-col gap-0.5 p-2.5 text-[13px] text-[#2f2e2b] sm:flex`}>
          <div className="flex items-center gap-2 px-1.5 pb-2 font-bold">
            <span className="inline-flex size-[22px] items-center justify-center rounded-md bg-brand text-[12px] text-white">✎</span>
            {t({ en: 'Notes', es: 'Notas' })}
          </div>
          <div className="rounded-lg px-2 py-1.5 text-[#6b6964]">⌕ {t({ en: 'Search', es: 'Buscar' })}</div>
          <div className="px-2 pb-1 pt-3 text-[11px] font-semibold text-[#6b6964]">{t({ en: 'Pages', es: 'Páginas' })}</div>
          {TREE.map(([icon, title, depth, current]) => (
            <div key={title.en} style={{ paddingLeft: 8 + depth * 14 }} className={`flex items-center gap-2 rounded-lg py-1.5 pr-2 ${current ? 'bg-brand-light font-semibold text-brand' : ''}`}>
              <span>{icon}</span>
              <span className="truncate">{t(title)}</span>
            </div>
          ))}
        </div>

        {/* The page. */}
        <div className={`${island} min-w-0 flex-1 px-[clamp(18px,5vw,56px)] pb-8 pt-6 text-[14px] text-[#2f2e2b]`}>
          <div className="text-[13px] text-[#6b6964]">🚀 {t({ en: 'Launch plan', es: 'Plan de lanzamiento' })}</div>
          <div className="mt-5 text-[42px] leading-none">🚀</div>
          <div className="mt-2 font-display text-[clamp(24px,3.4vw,34px)] font-extrabold tracking-[-0.02em]">{t({ en: 'Launch plan', es: 'Plan de lanzamiento' })}</div>
          <div className="mt-3 rounded-[10px] bg-[#f7f5f0] px-3.5 py-2.5">
            💡 {t({ en: 'Everything here is a Markdown file:', es: 'Todo aquí es un archivo Markdown:' })} <code className="rounded bg-white px-1 font-code text-[12px] text-brand">plan.md</code>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {TASKS.map(([task, done]) => (
              <div key={task.en} className="flex items-center gap-2">
                <span className={`inline-flex size-[15px] items-center justify-center rounded-[4px] text-[10px] ${done ? 'bg-brand text-white' : 'border-[1.5px] border-[#d4d0c7]'}`}>
                  {done ? '✓' : ''}
                </span>
                <span className={done ? 'text-[#6b6964] line-through' : ''}>{t(task)}</span>
              </div>
            ))}
          </div>

          {/* A database, its total a formula. */}
          <div className="mt-4 overflow-hidden rounded-[10px] border border-[#e6e3dc] text-[13px]">
            <div className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr] bg-[#fbfaf8] text-[12px] text-[#6b6964]">
              <span className="border-r border-[#e6e3dc] px-2.5 py-1.5">Aa {t({ en: 'Item', es: 'Concepto' })}</span>
              <span className="border-r border-[#e6e3dc] px-2.5 py-1.5"># {t({ en: 'Price', es: 'Precio' })}</span>
              <span className="border-r border-[#e6e3dc] px-2.5 py-1.5"># {t({ en: 'Units', es: 'Unid.' })}</span>
              <span className="px-2.5 py-1.5">ƒ Total</span>
            </div>
            {BUDGET.map(([item, price, units, total], i) => (
              <div key={item.en} className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr] border-t border-[#e6e3dc]">
                <span className="border-r border-[#e6e3dc] px-2.5 py-1.5">{t(item)}</span>
                <span className="border-r border-[#e6e3dc] px-2.5 py-1.5 text-right">{price}</span>
                <span className="border-r border-[#e6e3dc] px-2.5 py-1.5 text-right">{units}</span>
                <span className="px-2.5 py-1.5 text-right font-semibold">
                  <span className="animate-[pop-in_0.4s_ease_forwards] opacity-0" style={{ animationDelay: `${1.6 + i * 0.3}s` }}>
                    {total}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* A line being typed, and the menu of blocks under it. */}
          <div className="relative mt-4">
            <span className="text-[#2f2e2b]">/</span>
            <span className="inline-block w-0 animate-[type-command_0.8s_steps(4,end)_0.8s_forwards] overflow-hidden whitespace-nowrap align-bottom">{t({ en: 'data', es: 'base' })}</span>
            <span className="ml-px inline-block h-[1.1em] w-0.5 animate-blink bg-brand align-middle" />
            <div className="absolute left-0 top-7 z-10 w-[250px] animate-[pop-in_0.4s_ease_1.2s_forwards] rounded-[12px] border border-[#e6e3dc] bg-white p-1.5 opacity-0 shadow-[0_12px_28px_rgba(47,46,43,0.14)]">
              {MENU.map(([icon, label, hint], i) => (
                <div key={label.en} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-[#f3f1ec]' : ''}`}>
                  <span className="inline-flex size-8 items-center justify-center rounded-lg border border-[#e6e3dc] text-[15px]">{icon}</span>
                  <span>
                    <b className="block text-[13px] font-semibold">{t(label)}</b>
                    <span className="block text-[11px] text-[#6b6964]">{t(hint)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-24" />
        </div>
      </div>

      {/* A note from an assistant, and a hint by hand; on a phone they would cover the page. */}
      <div className="absolute -right-6 bottom-[90px] z-10 hidden w-[220px] animate-[pop-in_0.5s_cubic-bezier(0.2,0.8,0.2,1)_3s_forwards,float_6s_ease-in-out_3.5s_infinite] rounded-[14px] border border-border bg-white px-3.5 py-3 text-[13px] leading-[1.45] opacity-0 shadow-[0_14px_30px_rgba(47,46,43,0.12)] md:block">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-[22px] items-center justify-center rounded-full bg-pastel-pink text-[11px] font-bold text-pastel-pink-fg">C</span>
          <span className="font-semibold">Claude</span>
          <span className="text-muted">· {t({ en: 'via MCP', es: 'vía MCP' })}</span>
        </div>
        <div className="mt-1.5 text-ink-soft">{t({ en: 'Ticked the first two tasks and added the budget.', es: 'Marcó las dos primeras tareas y añadió el presupuesto.' })}</div>
      </div>
      <div className="absolute -left-[30px] -bottom-[22px] z-10 hidden animate-[pop-in_0.5s_cubic-bezier(0.2,0.8,0.2,1)_3.6s_forwards,float_8s_ease-in-out_4.1s_infinite] rounded-[14px] bg-pastel-yellow px-4 py-2.5 opacity-0 md:block">
        <span className="font-hand text-2xl font-semibold text-pastel-yellow-fg">{t({ en: 'type / for any block', es: 'escribe / para cualquier bloque' })}</span>
      </div>
    </div>
  );
}
