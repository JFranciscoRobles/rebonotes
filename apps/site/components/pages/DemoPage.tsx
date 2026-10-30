import type { Metadata } from 'next';
import { DemoApp } from '@/components/DemoApp';
import { type Locale, translator } from '@/lib/i18n';
import { setPageLocale } from '@/lib/locale';
import { pageMetadata } from '@/lib/seo';

export function demoMetadata(locale: Locale): Metadata {
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: '/demo/',
    title: 'Demo',
    description: t({
      en: 'ReboNotes on the whole window: write pages of blocks, link them, make databases and boards, put files of the suite in them. Nothing leaves the browser.',
      es: 'ReboNotes en toda la ventana: escribe páginas de bloques, enlázalas, haz bases de datos y tableros, pon archivos de la suite en ellas. Nada sale del navegador.',
    }),
  });
}

/** The notes on the whole window, under the bar of the demo: no header, no footer. */
export function DemoPage({ locale }: { locale: Locale }) {
  setPageLocale(locale);
  return (
    <main>
      <DemoApp />
    </main>
  );
}
