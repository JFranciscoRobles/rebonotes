import type { Metadata, Viewport } from 'next';
import { Caveat, Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/components/i18n';
import { LANGUAGES, type Locale, translator } from '@/lib/i18n';
import { SITE } from '@/lib/site';
import '../../app/globals.css';

// The fonts of the landing page, as CSS variables: `globals.css` turns them into
// `font-display`, `font-text`, `font-code` and `font-hand`.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-jakarta' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' });
const caveat = Caveat({ subsets: ['latin'], weight: '600', variable: '--font-caveat' });

/** What every page of a language has: its title template, its description, and where the site is. */
export function rootMetadata(locale: Locale): Metadata {
  const t = translator(locale);
  return {
    metadataBase: new URL(SITE),
    title: {
      default: t({ en: 'ReboNotes: notes and wikis you build into your app', es: 'ReboNotes: notas y wikis que integras en tu aplicación' }),
      template: '%s · ReboNotes',
    },
    description: t({
      en: 'Notes and wikis for the browser with an engine of its own: pages of blocks kept as Markdown, databases with spreadsheet formulas, the files of the suite in a page, and an MCP server for AI assistants. Open source.',
      es: 'Notas y wikis para el navegador con motor propio: páginas de bloques guardadas como Markdown, bases de datos con fórmulas de hoja de cálculo, los archivos de la suite en una página y un servidor MCP para asistentes de IA. Código abierto.',
    }),
    applicationName: 'ReboNotes',
    keywords: t({
      en: ['notes', 'wiki', 'markdown', 'notion alternative', 'react notes editor', 'block editor', 'open source'],
      es: ['notas', 'wiki', 'markdown', 'alternativa a notion', 'editor de notas react', 'editor de bloques', 'código abierto'],
    }),
    icons: { icon: '/logo.svg' },
    openGraph: { type: 'website', siteName: 'ReboNotes', url: SITE, locale: LANGUAGES[locale].og },
    formatDetection: { telephone: false },
  };
}
export const viewport: Viewport = { themeColor: '#c2255c' };

/**
 * What every page has: the document in its language. The header and the
 * footer of the site are in the frame of the documentation and in the landing
 * page itself: a demo takes the whole window, and has neither.
 */
export function RootDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={LANGUAGES[locale].tag} className={`${jakarta.variable} ${inter.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
