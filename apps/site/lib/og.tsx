import { ImageResponse } from 'next/og';
import type { Locale } from './i18n';

const TEXT = {
  en: {
    title: 'Notes and wikis you build into your app.',
    lead: 'Pages of blocks, databases with formulas and the files of the suite in a page — every page a Markdown file. Open source, MIT.',
    tags: ['React', 'Any page', 'Markdown', 'Databases', 'MCP'],
  },
  es: {
    title: 'Notas y wikis que integras en tu aplicación.',
    lead: 'Páginas de bloques, bases de datos con fórmulas y los archivos de la suite en una página: cada página un archivo Markdown. Código abierto, MIT.',
    tags: ['React', 'Cualquier página', 'Markdown', 'Bases de datos', 'MCP'],
  },
};

/** The card a link to the site shows, in a language, made once when the site is built. */
export function ogCard(locale: Locale) {
  const text = TEXT[locale];
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', background: '#fbfaf7', color: '#2f2e2b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <svg width="84" height="84" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="8" fill="#FDEEF3" />
          <path d="M10 8h8.5l4 4v12H10z" fill="#FFFFFF" stroke="#C2255C" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13.5 16h5.5M13.5 19.5h4" stroke="#C2255C" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5 }}>ReboNotes</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <span style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3 }}>{text.title}</span>
        <span style={{ fontSize: 32, color: '#6b6963', lineHeight: 1.4 }}>{text.lead}</span>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {text.tags.map((tag) => (
          <span key={tag} style={{ padding: '10px 20px', borderRadius: 999, background: '#fdeef3', color: '#c2255c', fontSize: 26, fontWeight: 600 }}>
            {tag}
          </span>
        ))}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
