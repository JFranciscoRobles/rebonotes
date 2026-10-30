import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CodeTabs } from '@/components/CodeTabs';
import { LiveNotes } from '@/components/LiveNotes';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { HeroNotes } from '@/components/home/HeroNotes';
import { InstallPicker } from '@/components/home/InstallPicker';
import { Metrics } from '@/components/home/Metrics';
import { primary } from '@/components/home/buttons';
import { SiteFooter, SiteHeader } from '@/components/home/SiteChrome';
import { LocalLink as Link } from '@/components/i18n';
import { LIGHT_THEME, highlight } from '@/lib/docs';
import { PACKAGES, PASTEL_CLASS, type Pastel, SAMPLES, TAGS, VERSION, pastelAt } from '@/lib/home';
import { type L, LANGUAGES, type Locale, localize, translator } from '@/lib/i18n';
import { setPageLocale } from '@/lib/locale';
import { pageMetadata } from '@/lib/seo';
import { REBODOCS, REPO, SITE } from '@/lib/site';

const TITLE: L = {
  en: 'ReboNotes: notes and wikis you build into your app',
  es: 'ReboNotes: notas y wikis que integras en tu aplicación',
};
const DESCRIPTION: L = {
  en: 'Pages of blocks, a tree of pages, databases with spreadsheet formulas, and the workbooks, decks and documents of the suite in a page — every page a Markdown file, in packages you take one at a time.',
  es: 'Páginas de bloques, un árbol de páginas, bases de datos con fórmulas de hoja de cálculo, y las hojas, presentaciones y documentos de la suite en una página: cada página un archivo Markdown, en paquetes que tomas uno a uno.',
};

export function homeMetadata(locale: Locale): Metadata {
  const t = translator(locale);
  return pageMetadata({ locale, path: '/', title: t(TITLE), description: t(DESCRIPTION), absoluteTitle: true });
}

/** What the page is, for search engines: the project as a piece of software, free, in the language of the page. */
function StructuredData({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ReboNotes',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: t(DESCRIPTION),
    url: `${SITE}${localize('/', locale)}`,
    inLanguage: LANGUAGES[locale].tag,
    softwareVersion: VERSION,
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: REPO,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
  // JSON written here, with no "<" in it to close the script.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const secondary = 'rounded-xl border border-border-strong bg-white font-semibold text-ink transition-colors hover:bg-hover';

const Pill = ({ color, children }: { color: Pastel; children: ReactNode }) => <span className={`rounded-full px-3 py-[5px] text-[13px] font-semibold ${PASTEL_CLASS[color]}`}>{children}</span>;
const Title = ({ children, small }: { children: ReactNode; small?: boolean }) => (
  <h2 className={`mt-4.5 font-display font-extrabold leading-[1.08] tracking-[-0.03em] ${small ? 'text-[clamp(34px,4.2vw,52px)]' : 'text-[clamp(36px,4.6vw,56px)]'}`}>{children}</h2>
);

const doodle = 'absolute hidden md:block';
/** A stroke drawn by hand, that draws itself in after `delay`. */
const drawn = (delay: string) => ({ className: 'draw animate-draw', style: { animationDelay: delay } });

/** The words the hand-drawn stroke underlines, and what comes before and after them. */
const HEADLINE: L<[string, string, string]> = {
  en: ['Notes and wikis you ', 'build into', ' your app.'],
  es: ['Notas y wikis que ', 'integras', ' en tu aplicación.'],
};

function Hero({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [before, underlined, after] = t(HEADLINE);
  return (
    <section id="top" className="relative mx-auto max-w-[1180px] px-6 pb-14 pt-18 text-center">
      <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true" className={`${doodle} left-[6%] top-[90px] animate-float`}>
        <path {...drawn('1.2s')} d="M35 8l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill="none" stroke="#E0A526" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <svg width="90" height="60" viewBox="0 0 90 60" aria-hidden="true" className={`${doodle} right-[7%] top-[110px] animate-float-slow`}>
        <path {...drawn('1.8s')} d="M6 52V30M24 52V12M42 52V36M60 52V20M78 52V8" fill="none" stroke="#E86A8C" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className={`${doodle} right-[13%] top-[330px] animate-float`}>
        <circle className="animate-pop-in opacity-0" style={{ animationDelay: '0.6s' }} cx="28" cy="28" r="20" fill="none" stroke="#6BAF7B" strokeWidth="2.5" strokeDasharray="4 7" />
      </svg>

      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-2 pr-3.5 text-sm text-muted">
        <span className="rounded-full border border-border bg-white px-2 py-0.5 text-xs font-semibold text-ink">{t({ en: 'New', es: 'Nuevo' })}</span>
        {t({ en: 'Databases, boards and the suite in a page', es: 'Bases de datos, tableros y la suite en una página' })}
      </p>
      <h1 className="mx-auto mt-7 max-w-[920px] text-balance font-display text-[clamp(44px,6.6vw,84px)] font-extrabold leading-[1.04] tracking-[-0.03em]">
        {before}
        <span className="relative whitespace-nowrap text-brand">
          {underlined}
          <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-2.5 left-0 h-[18px] w-full">
            <path {...drawn('0s')} d="M4 14C70 4 160 4 296 10" fill="none" stroke="#F5C443" strokeWidth="7" strokeLinecap="round" />
          </svg>
        </span>
        {after}
      </h1>
      <p className="mx-auto mt-7 max-w-[660px] text-[19px] leading-[1.6] text-muted">{t(DESCRIPTION)}</p>
      <p className="mt-8 flex flex-wrap justify-center gap-2.5 text-base">
        <Link href="/docs/getting-started/" className={`rounded-xl px-5.5 py-3.5 ${primary}`}>
          {t({ en: 'Get started', es: 'Empezar' })}
        </Link>
        <a href="#demo" className={`px-5.5 py-3.5 ${secondary}`}>
          {t({ en: 'Try it below', es: 'Pruébalas abajo' })}
        </a>
      </p>
      <InstallPicker />
      <HeroNotes />
    </section>
  );
}

export async function HomePage({ locale }: { locale: Locale }) {
  setPageLocale(locale);
  const t = translator(locale);
  const samples = await Promise.all(SAMPLES.map(async ([name, lang, code]) => ({ name: t(name), html: await highlight(code, lang, LIGHT_THEME) })));
  return (
    <div className="home overflow-x-clip text-ink">
      <StructuredData locale={locale} />
      <SiteHeader />
      <main>
        <Hero locale={locale} />

        <ul className="reveal mx-auto flex max-w-[1180px] flex-wrap justify-center gap-2.5 px-6 pb-6 pt-14" aria-label={t({ en: 'What it does', es: 'Qué hace' })}>
          {TAGS.map((tag, i) => (
            <li key={tag.en} className={`rounded-full px-3.5 py-[7px] text-sm font-medium transition duration-250 hover:-translate-y-1 hover:shadow-lift ${PASTEL_CLASS[pastelAt(i)]}`}>
              {t(tag)}
            </li>
          ))}
        </ul>

        <Metrics />

        <section id="demo" className="mx-auto max-w-[1180px] px-6 pb-15 pt-25">
          <div className="reveal mx-auto max-w-[740px] text-center">
            <Pill color="pink">{t({ en: 'Live notes', es: 'Notas en vivo' })}</Pill>
            <Title>{t({ en: 'These are the notes. Write.', es: 'Estas son las notas. Escribe.' })}</Title>
            <p className="mt-4.5 text-lg leading-[1.6] text-muted">
              {t({
                en: 'Type / for a block, # for a heading, - for a list, [[ to link a page. Drag a block by its grip. Open Projects for a database. Nothing leaves the browser.',
                es: 'Escribe / para un bloque, # para un título, - para una lista, [[ para enlazar una página. Arrastra un bloque por su asa. Abre Proyectos para ver una base de datos. Nada sale del navegador.',
              })}
            </p>
          </div>
          <div className="reveal mt-11 rounded-3xl border border-border bg-surface p-3.5">
            <LiveNotes className="h-[clamp(520px,72vh,700px)] overflow-hidden rounded-2xl border border-border bg-white" />
          </div>
          <p className="mt-4.5 text-center text-[15px] text-muted">
            {t({ en: 'More room to work →', es: 'Más espacio para trabajar →' })}{' '}
            <Link href="/demo/" className="font-medium text-brand hover:text-brand-hover">
              {t({ en: 'open them on the whole window', es: 'ábrelas en toda la ventana' })}
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="reveal mx-auto mb-12 max-w-[720px] text-center">
            <Pill color="yellow">{t({ en: 'Features', es: 'Funciones' })}</Pill>
            <Title>{t({ en: 'Notes that stay yours.', es: 'Notas que siguen siendo tuyas.' })}</Title>
            <p className="mt-4.5 text-lg leading-[1.6] text-muted">
              {t({
                en: 'Every page is a Markdown file you can read anywhere: no format of its own to be locked in, and everything Notion-like on top of it.',
                es: 'Cada página es un archivo Markdown que se lee donde sea: sin formato propio que te encierre, y todo lo de un Notion encima.',
              })}
            </p>
          </div>
          <FeatureGrid />
        </section>

        <section id="docs" className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="flex flex-wrap items-center gap-12 rounded-[28px] bg-surface p-[clamp(28px,5vw,64px)]">
            <div className="reveal min-w-0 flex-[1_1_360px]">
              <Pill color="blue">{t({ en: 'For developers', es: 'Para desarrolladores' })}</Pill>
              <Title small>{t({ en: 'It feels like part of your app — because it is.', es: 'Se siente parte de tu aplicación, porque lo es.' })}</Title>
              <p className="mt-4.5 text-[17px] leading-[1.65] text-muted">
                {t({
                  en: 'One React component, or one function on any element. The engine has no DOM: read a folder of notes, change it and write it back on a server, with the same code the editor runs.',
                  es: 'Un componente de React, o una función sobre cualquier elemento. El motor no usa el DOM: lee una carpeta de notas, cámbiala y escríbela en un servidor, con el mismo código que corre el editor.',
                })}
              </p>
              <Link href="/docs/getting-started/" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-hover">
                {t({ en: 'Read the guide', es: 'Lee la guía' })} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="reveal min-w-0 flex-[1.2_1_480px]">
              <CodeTabs samples={samples} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="reveal mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Pill color="orange">{t({ en: 'Packages', es: 'Paquetes' })}</Pill>
              <Title small>{t({ en: 'Take what you need.', es: 'Toma lo que necesites.' })}</Title>
            </div>
            <p className="max-w-[400px] text-base leading-[1.6] text-muted">
              {t({
                en: 'Six packages, each on its own. A sibling of',
                es: 'Seis paquetes, cada uno por su cuenta. Hermano de',
              })}{' '}
              <a href={REBODOCS} className="font-medium text-brand hover:text-brand-hover">
                Rebodocs
              </a>
              .
            </p>
          </div>
          <div className="reveal overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[53%]" />
                <col />
              </colgroup>
              <thead className="bg-surface text-[13px] font-medium text-muted">
                <tr>
                  <th className="px-4.5 py-[11px] font-medium">{t({ en: 'Package', es: 'Paquete' })}</th>
                  <th className="border-l border-border px-4.5 py-[11px] font-medium">{t({ en: 'What it does', es: 'Qué hace' })}</th>
                  <th className="border-l border-border px-4.5 py-[11px] font-medium">{t({ en: 'Runs in', es: 'Corre en' })}</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES.map((pkg) => (
                  <tr key={pkg.name} className="border-t border-border align-top transition-colors hover:bg-surface">
                    <td className="px-4.5 py-3.5">
                      <a
                        href={`https://www.npmjs.com/package/${pkg.name}`}
                        className="font-code text-sm font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-current"
                      >
                        {pkg.name}
                      </a>
                      <div className="mt-1 text-xs text-muted">v{VERSION}</div>
                    </td>
                    <td className="border-l border-border px-4.5 py-3.5 text-ink-soft">{t(pkg.what)}</td>
                    <td className="border-l border-border px-4.5 py-3">
                      <span className={`rounded-md px-[9px] py-[3px] text-[13px] font-medium ${PASTEL_CLASS[pkg.color]}`}>{t(pkg.tag)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="status" className="mx-auto max-w-[1180px] px-6 pb-25 pt-15">
          <div className="reveal flex flex-wrap items-center gap-10 rounded-[28px] bg-pastel-yellow p-[clamp(28px,5vw,64px)]">
            <div className="min-w-0 flex-[1_1_340px]">
              <span className="rounded-full bg-white px-3 py-[5px] text-[13px] font-semibold text-pastel-yellow-fg">{t({ en: 'Where it stands', es: 'Dónde está' })}</span>
              <p className="mt-4.5 font-display text-[clamp(80px,11vw,140px)] font-extrabold leading-[0.9] tracking-[-0.03em]">v{VERSION}</p>
              <p className="mt-2 text-lg text-[#5c4a1e]">{t({ en: 'Every package written and tested', es: 'Cada paquete escrito y probado' })}</p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white" aria-hidden="true">
                <div className="h-full w-0 animate-grow rounded-full bg-brand" />
              </div>
              <p className="mt-2.5 font-hand text-2xl font-semibold text-pastel-yellow-fg">{t({ en: 'young, and growing fast', es: 'joven, y creciendo rápido' })}</p>
            </div>
            <div className="min-w-0 flex-[1_1_380px]">
              <p className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.3] tracking-[-0.03em]">
                {t({ en: 'Put notes in your app today.', es: 'Pon notas en tu aplicación hoy.' })}
              </p>
              <p className="mt-4 text-[17px] leading-[1.6] text-[#5c4a1e]">
                {t({
                  en: 'One npm install, one component, and notes your users can take anywhere as Markdown. The status page says what is done and what is missing. Open source under MIT.',
                  es: 'Un npm install, un componente, y notas que tus usuarios se llevan a donde sea como Markdown. La página de estado dice qué está hecho y qué falta. Código abierto con licencia MIT.',
                })}
              </p>
              <p className="mt-6.5 flex flex-wrap gap-2.5">
                <Link href="/docs/getting-started/" className={`rounded-xl px-5 py-[13px] ${primary}`}>
                  {t({ en: 'Get started', es: 'Empezar' })}
                </Link>
                <Link href="/docs/status/" className="rounded-xl bg-white px-5 py-[13px] font-semibold text-ink transition-colors hover:bg-hover">
                  {t({ en: 'What’s checked, what’s missing →', es: 'Qué está comprobado y qué falta →' })}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
