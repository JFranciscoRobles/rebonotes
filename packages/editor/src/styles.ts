// The look of the notes, put in the page once, in the manner of Rebodocs':
// islands on a warm canvas (the side with the tree of pages, and the page),
// warm greys, one rose for what is chosen and focused, quiet buttons, and a
// page set as a page is read: a measure of about seventy characters, room to
// breathe between blocks. Colours, sizes and the font are custom properties
// on .rn-root, for a page to change with its own CSS; the dark ones are used
// when the system asks for them, or with data-theme="dark".

const LIGHT = `
  --rn-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --rn-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --rn-canvas: #efede8;
  --rn-bg: #ffffff;
  --rn-chrome: #fbfaf8;
  --rn-raised: #ffffff;
  --rn-border: #e6e3dc;
  --rn-border-strong: #d4d0c7;
  --rn-text: #2f2e2b;
  --rn-muted: #6b6964;
  --rn-placeholder: #a9a59d;
  --rn-hover: #f3f1ec;
  --rn-down: #ebe8e1;
  --rn-pressed: #fdeef3;
  --rn-pressed-text: #c2255c;
  --rn-accent: #c2255c;
  --rn-accent-hover: #a61e4d;
  --rn-accent-text: #ffffff;
  --rn-focus: #c2255c;
  --rn-selection: rgba(194, 37, 92, 0.1);
  --rn-code-bg: #f6f4ef;
  --rn-code-text: #b02a55;
  --rn-callout: #f7f5f0;
  --rn-link: #c2255c;
  --rn-notice: #b13a2a;
  --rn-overlay: rgba(28, 27, 25, 0.32);
  --rn-shadow: 0 1px 4px rgba(47, 46, 43, 0.1), 0 12px 28px rgba(47, 46, 43, 0.14);
  --rn-island-shadow: 0 1px 2px rgba(47, 46, 43, 0.05), 0 10px 30px -18px rgba(47, 46, 43, 0.28);
`;

const DARK = `
  --rn-canvas: #1c1b19;
  --rn-bg: #262523;
  --rn-chrome: #242321;
  --rn-raised: #2c2b28;
  --rn-border: #3d3b37;
  --rn-border-strong: #55524d;
  --rn-text: #ecebe7;
  --rn-muted: #b1ada5;
  --rn-placeholder: #77736c;
  --rn-hover: #33312e;
  --rn-down: #403e3a;
  --rn-pressed: #3a1828;
  --rn-pressed-text: #faa2c1;
  --rn-accent: #f06595;
  --rn-accent-hover: #f783ac;
  --rn-accent-text: #1f0d15;
  --rn-focus: #f06595;
  --rn-selection: rgba(240, 101, 149, 0.16);
  --rn-code-bg: #1f1e1c;
  --rn-code-text: #f783ac;
  --rn-callout: #2f2d2a;
  --rn-link: #f783ac;
  --rn-notice: #ff8a73;
  --rn-overlay: rgba(0, 0, 0, 0.5);
  --rn-shadow: 0 1px 4px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.45);
  --rn-island-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 10px 30px -18px rgba(0, 0, 0, 0.6);
`;

const CSS = `
.rn-root {${LIGHT}
  position: relative; display: flex; gap: 8px; height: 100%; padding: 8px; box-sizing: border-box;
  background: var(--rn-canvas); color: var(--rn-text); font: 14px/1.45 var(--rn-font);
  -webkit-font-smoothing: antialiased; color-scheme: light; overflow: hidden;
}
.rn-root *, .rn-root *::before, .rn-root *::after { box-sizing: border-box; }
@media (prefers-color-scheme: dark) {
  .rn-root:not([data-theme="light"]) {${DARK} color-scheme: dark; }
}
.rn-root[data-theme="dark"] {${DARK} color-scheme: dark; }
:where(.rn-root) button { font: inherit; color: inherit; }
.rn-root [hidden] { display: none !important; }
.rn-root :focus-visible { outline: 2px solid var(--rn-focus); outline-offset: 1px; }
.rn-root [contenteditable]:focus-visible { outline: none; }
.rn-icon { flex: none; display: block; }

/* The side */
.rn-sidebar { flex: none; display: flex; flex-direction: column; width: 264px; padding: 10px 8px; background: var(--rn-bg); border-radius: 14px; box-shadow: var(--rn-island-shadow); overflow: hidden; }
.rn-root.rn-no-sidebar .rn-sidebar { display: none; }
.rn-nav-top { display: flex; align-items: center; gap: 4px; padding: 0 2px 8px; }
.rn-brand { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding-left: 4px; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
.rn-icon-button { display: grid; place-items: center; flex: none; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 8px; background: none; color: var(--rn-muted) !important; cursor: pointer; }
.rn-icon-button:hover { background: var(--rn-hover); color: var(--rn-text) !important; }
.rn-icon-small { width: 24px; height: 24px; border-radius: 6px; }
.rn-nav-action { display: flex; align-items: center; gap: 10px; width: 100%; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: none; color: var(--rn-muted) !important; font-size: 14px; text-align: left; cursor: pointer; }
.rn-nav-action:hover { background: var(--rn-hover); color: var(--rn-text) !important; }
.rn-nav-action kbd { margin-left: auto; font: 12px var(--rn-font); opacity: 0.75; }
.rn-nav-label { display: flex; align-items: center; justify-content: space-between; padding: 16px 6px 4px 10px; color: var(--rn-muted); font-size: 12px; font-weight: 600; }
.rn-tree { flex: 1; overflow-y: auto; padding-bottom: 12px; }
.rn-tree-row { position: relative; display: flex; align-items: center; gap: 2px; height: 30px; padding: 0 4px 0 calc(var(--depth) * 14px + 4px); border-radius: 8px; cursor: pointer; user-select: none; }
.rn-tree-row:hover { background: var(--rn-hover); }
.rn-tree-row.rn-current { background: var(--rn-pressed); color: var(--rn-pressed-text); font-weight: 600; }
.rn-tree-toggle { display: grid; place-items: center; flex: none; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--rn-muted) !important; cursor: pointer; }
.rn-tree-toggle:hover { background: var(--rn-down); }
.rn-tree-toggle .rn-icon { transition: transform 120ms ease; }
.rn-tree-row[aria-expanded="true"] .rn-tree-toggle .rn-icon { transform: rotate(90deg); }
.rn-tree-toggle.rn-leaf { opacity: 0.35; }
.rn-tree-icon { display: grid; place-items: center; flex: none; width: 22px; font-size: 15px; color: var(--rn-muted); }
.rn-tree-title { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding-left: 4px; }
.rn-untitled { color: var(--rn-muted); }
.rn-tree-actions { display: none; gap: 1px; }
.rn-tree-row:hover .rn-tree-actions { display: flex; }
.rn-tree-act { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--rn-muted) !important; cursor: pointer; }
.rn-tree-act:hover { background: var(--rn-down); color: var(--rn-text) !important; }
.rn-tree-dragged { opacity: 0.45; }
.rn-drop-inside { box-shadow: inset 0 0 0 2px var(--rn-accent); }
.rn-drop-before::before, .rn-drop-after::after { content: ""; position: absolute; left: calc(var(--depth) * 14px + 8px); right: 4px; height: 2px; border-radius: 1px; background: var(--rn-accent); }
.rn-drop-before::before { top: -1px; }
.rn-drop-after::after { bottom: -1px; }

/* The others in the workspace */
.rn-peers { display: flex; gap: 2px; margin-right: 6px; }
.rn-peer { display: grid; place-items: center; width: 26px; height: 26px; padding: 0; border: 2px solid var(--rn-bg); border-radius: 50%; background: var(--peer); color: #fff !important; font-size: 12px; font-weight: 700; cursor: pointer; }
.rn-peer-away { opacity: 0.45; }
.rn-peer-block::before { content: ""; position: absolute; top: 2px; bottom: 2px; left: calc(var(--indent) * 26px - 8px); width: 3px; border-radius: 2px; background: var(--peer); }
.rn-peer-block::after { content: attr(data-peer); position: absolute; top: -9px; right: 0; padding: 0 6px; border-radius: 4px; background: var(--peer); color: #fff; font-size: 11px; font-weight: 600; line-height: 16px; pointer-events: none; }

/* Only the page: the interface around it is the application's */
.rn-root.rn-bare { padding: 0; background: none; }
.rn-bare .rn-sidebar, .rn-bare .rn-topbar { display: none; }
.rn-bare .rn-main { background: none; border-radius: 0; box-shadow: none; }

/* The page */
.rn-main { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--rn-bg); border-radius: 14px; box-shadow: var(--rn-island-shadow); overflow: hidden; }
.rn-topbar { flex: none; display: flex; align-items: center; gap: 4px; height: 46px; padding: 0 10px; }
.rn-crumbs { flex: 1; min-width: 0; display: flex; align-items: center; gap: 2px; overflow: hidden; }
.rn-crumb { display: flex; align-items: center; gap: 6px; min-width: 0; max-width: 240px; padding: 4px 7px; border: 0; border-radius: 6px; background: none; font-size: 14px; cursor: pointer; }
.rn-crumb span:last-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rn-crumb:hover { background: var(--rn-hover); }
.rn-crumb-sep { color: var(--rn-placeholder); }
.rn-edited { margin-right: 4px; color: var(--rn-muted); font-size: 13px; white-space: nowrap; }
.rn-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.rn-page { position: relative; max-width: 780px; margin: 0 auto; padding: 48px 76px 0; }
.rn-header { position: relative; padding-top: 24px; }
.rn-header-tools { display: flex; gap: 4px; height: 30px; opacity: 0; transition: opacity 120ms; }
.rn-header:hover .rn-header-tools, .rn-header-tools:focus-within { opacity: 1; }
.rn-ghost { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; border: 0; border-radius: 6px; background: none; color: var(--rn-muted) !important; font-size: 14px; cursor: pointer; }
.rn-ghost:hover { background: var(--rn-hover); }
.rn-ghost[hidden] { display: none; }
.rn-page-icon { display: block; margin: 0 0 4px -6px; padding: 4px 6px; border: 0; border-radius: 10px; background: none; font-size: 64px; line-height: 1.1; cursor: pointer; }
.rn-page-icon:hover { background: var(--rn-hover); }
.rn-page-icon[hidden] { display: none; }
.rn-title { position: relative; margin: 2px 0 14px; outline: none; font-size: 40px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; word-break: break-word; }
.rn-title.rn-empty::before { content: attr(data-placeholder); position: absolute; color: var(--rn-placeholder); pointer-events: none; }
.rn-blocks { position: relative; outline: none; }
.rn-tail { min-height: 30vh; cursor: text; }
.rn-backlinks { margin: 0 0 64px; padding-top: 14px; border-top: 1px solid var(--rn-border); }
.rn-backlinks[hidden] { display: none; }
.rn-backlinks-head { margin-bottom: 6px; color: var(--rn-muted); font-size: 13px; font-weight: 600; }
.rn-backlink { display: flex; align-items: center; gap: 8px; width: fit-content; padding: 3px 6px; margin-left: -6px; border-radius: 6px; color: inherit; text-decoration: none; font-size: 14px; }
.rn-backlink:hover { background: var(--rn-hover); }
.rn-backlink span { display: grid; place-items: center; width: 18px; color: var(--rn-muted); }

/* Blocks */
.rn-block { position: relative; margin: 1px 0; padding-left: calc(var(--indent) * 26px); border-radius: 4px; }
.rn-block.rn-selected::after { content: ""; position: absolute; inset: 0 0 0 calc(var(--indent) * 26px); border-radius: 4px; background: var(--rn-selection); pointer-events: none; }
.rn-row { display: flex; align-items: flex-start; gap: 2px; }
.rn-text { position: relative; flex: 1; min-width: 0; padding: 3px 2px; outline: none; font-size: 16px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; caret-color: var(--rn-text); }
.rn-text.rn-empty::before { content: attr(data-placeholder); position: absolute; color: var(--rn-placeholder); pointer-events: none; white-space: nowrap; }
.rn-block[data-type="paragraph"] .rn-text.rn-empty:not(:focus)::before { content: none; }
.rn-page-empty .rn-block[data-type="paragraph"] .rn-text.rn-empty::before { content: attr(data-placeholder); }
.rn-handle { position: absolute; top: 2px; left: calc(var(--indent) * 26px - 50px); display: flex; gap: 0; opacity: 0; transition: opacity 100ms; }
.rn-block[data-type="heading1"] > .rn-handle { top: 18px; }
.rn-block[data-type="heading2"] > .rn-handle { top: 12px; }
.rn-block[data-type="heading3"] > .rn-handle { top: 8px; }
.rn-block:hover > .rn-handle, .rn-block.rn-selected > .rn-handle { opacity: 1; }
.rn-dragging .rn-handle { opacity: 0 !important; }
.rn-add, .rn-grip { display: grid; place-items: center; width: 24px; height: 26px; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--rn-placeholder) !important; cursor: pointer; }
.rn-grip { width: 20px; cursor: grab; }
.rn-add:hover, .rn-grip:hover { background: var(--rn-hover); color: var(--rn-muted) !important; }
.rn-dragging, .rn-dragging * { cursor: grabbing !important; }
.rn-dragged { opacity: 0.4; }
.rn-drop { position: absolute; z-index: 2; height: 3px; border-radius: 2px; background: var(--rn-accent); opacity: 0.7; pointer-events: none; }
.rn-drop[hidden] { display: none; }

.rn-block[data-type="heading1"] { margin-top: 22px; }
.rn-block[data-type="heading2"] { margin-top: 16px; }
.rn-block[data-type="heading3"] { margin-top: 10px; }
.rn-block[data-type="heading1"] .rn-text { font-size: 30px; font-weight: 700; line-height: 1.3; letter-spacing: -0.015em; }
.rn-block[data-type="heading2"] .rn-text { font-size: 24px; font-weight: 650; line-height: 1.3; letter-spacing: -0.01em; }
.rn-block[data-type="heading3"] .rn-text { font-size: 19px; font-weight: 650; line-height: 1.35; }
.rn-marker { display: flex; align-items: center; justify-content: center; flex: none; width: 24px; height: 31.6px; padding: 0; border: 0; background: none; color: var(--rn-text); user-select: none; }
.rn-bullet { font-size: 20px; line-height: 1; }
.rn-number { justify-content: flex-end; width: auto; min-width: 24px; padding-right: 4px; font-variant-numeric: tabular-nums; font-size: 16px; }
.rn-check { cursor: pointer; }
.rn-check::before { content: ""; width: 16px; height: 16px; border: 1.5px solid var(--rn-border-strong); border-radius: 4px; }
.rn-check[aria-checked="true"]::before { display: none; }
.rn-check .rn-icon { width: 16px; height: 16px; padding: 1px; border-radius: 4px; background: var(--rn-accent); color: var(--rn-accent-text); }
.rn-done .rn-text { color: var(--rn-muted); text-decoration: line-through; text-decoration-color: var(--rn-placeholder); }
.rn-arrow { border-radius: 5px; cursor: pointer; }
.rn-arrow:hover { background: var(--rn-hover); }
.rn-arrow .rn-icon { transition: transform 120ms ease; }
.rn-arrow[aria-expanded="true"] .rn-icon { transform: rotate(90deg); }
.rn-toggle-empty { display: none; margin: 0 0 2px 26px; padding: 3px 4px; border: 0; border-radius: 5px; background: none; color: var(--rn-placeholder) !important; font-size: 14px; text-align: left; cursor: pointer; }
.rn-childless .rn-toggle-empty:not([hidden]) { display: block; }
.rn-toggle-empty:hover { background: var(--rn-hover); }
.rn-block[data-type="quote"] .rn-row { margin: 4px 0; padding-left: 14px; border-left: 3px solid var(--rn-text); }
.rn-block[data-type="quote"] .rn-text { font-size: 17px; }
.rn-block[data-type="callout"] .rn-row { gap: 8px; margin: 4px 0; padding: 12px 16px 12px 12px; border-radius: 10px; background: var(--rn-callout); }
.rn-callout-icon { width: 28px; height: 28px; border-radius: 6px; font-size: 20px; cursor: pointer; }
.rn-callout-icon:hover { background: var(--rn-hover); }
.rn-block[data-type="code"] .rn-row { position: relative; flex-direction: column; margin: 6px 0; padding: 14px 16px; border-radius: 10px; background: var(--rn-code-bg); }
.rn-block[data-type="code"] .rn-text { width: 100%; font: 13.5px/1.6 var(--rn-mono); tab-size: 2; overflow-x: auto; white-space: pre; }
.rn-code-lang { position: absolute; top: 6px; right: 8px; width: 90px; padding: 2px 6px; border: 0; border-radius: 5px; background: none; color: var(--rn-muted); font: 12px var(--rn-font); text-align: right; outline: none; }
.rn-code-lang:hover, .rn-code-lang:focus { background: var(--rn-hover); }
.rn-divider { flex: 1; padding: 10px 2px; cursor: pointer; }
.rn-divider hr { margin: 0; border: 0; border-top: 1px solid var(--rn-border-strong); }
.rn-figure { flex: 1; margin: 6px 0; }
.rn-figure img { display: block; max-width: 100%; border-radius: 8px; }
.rn-caption { font-size: 14px; color: var(--rn-muted); }
.rn-image-empty { display: flex; gap: 8px; padding: 16px; border-radius: 10px; background: var(--rn-callout); }
.rn-image-empty button { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; border: 1px solid var(--rn-border); border-radius: 8px; background: var(--rn-bg); color: var(--rn-muted) !important; cursor: pointer; }
.rn-image-empty button:hover { border-color: var(--rn-accent); color: var(--rn-accent) !important; }
.rn-pagelink { display: flex; align-items: center; gap: 8px; width: 100%; padding: 4px 4px; margin: 1px 0; border-radius: 6px; color: inherit; font-size: 16px; font-weight: 500; text-decoration: none; }
.rn-pagelink span:last-child { text-decoration: underline; text-decoration-color: var(--rn-border-strong); text-underline-offset: 3px; }
.rn-pagelink:hover { background: var(--rn-hover); }
.rn-pagelink-icon { display: grid; place-items: center; width: 22px; font-size: 18px; color: var(--rn-muted); }
.rn-missing { color: var(--rn-muted) !important; text-decoration: line-through !important; }

/* Databases */
.rn-block[data-type="database"] .rn-row, .rn-block[data-type="embed"] .rn-row { display: block; }
.rn-db { margin: 8px 0 10px; }
.rn-db-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.rn-db-views { display: flex; gap: 2px; margin-right: auto; }
.rn-db-view, .rn-db-new { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 9px; border: 0; border-radius: 7px; background: none; color: var(--rn-muted) !important; font-size: 13px; cursor: pointer; }
.rn-db-view:hover, .rn-db-new:hover { background: var(--rn-hover); color: var(--rn-text) !important; }
.rn-db-view[aria-pressed="true"] { background: var(--rn-pressed); color: var(--rn-pressed-text) !important; font-weight: 600; }
.rn-db-new { background: var(--rn-accent); color: var(--rn-accent-text) !important; font-weight: 600; }
.rn-db-new:hover { background: var(--rn-accent-hover); color: var(--rn-accent-text) !important; }
.rn-db-group { height: 28px; padding: 0 8px; border: 1px solid var(--rn-border); border-radius: 7px; background: var(--rn-bg); color: var(--rn-text); font-size: 13px; }
.rn-db-scroll { overflow-x: auto; border-top: 1px solid var(--rn-border); }
.rn-db-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.rn-db-table th, .rn-db-table td { min-width: 120px; height: 34px; padding: 0; border-bottom: 1px solid var(--rn-border); border-right: 1px solid var(--rn-border); text-align: left; vertical-align: middle; }
.rn-db-table th:last-child, .rn-db-table td:last-child { border-right: 0; min-width: 34px; width: 34px; }
.rn-db-table th { font-weight: 500; color: var(--rn-muted); }
.rn-db-table th > * { vertical-align: middle; }
.rn-db-table th[data-type="checkbox"], .rn-db-table td[data-type="checkbox"] { min-width: 70px; text-align: center; }
.rn-db-col { display: inline-flex; align-items: center; gap: 2px; height: 26px; margin-left: 4px; padding: 0 3px; border: 0; border-radius: 5px; background: none; color: var(--rn-muted) !important; cursor: pointer; }
.rn-db-col:hover { background: var(--rn-hover); }
.rn-db-name { width: calc(100% - 40px); min-width: 50px; padding: 4px 4px; border: 0; background: none; color: var(--rn-muted); font: 500 13px var(--rn-font); outline: none; }
.rn-db-name:focus { color: var(--rn-text); }
.rn-db-input { width: 100%; height: 33px; padding: 0 8px; border: 0; background: none; color: var(--rn-text); font: 14px var(--rn-font); outline: none; }
.rn-db-input:focus, .rn-db-select:focus-visible { box-shadow: inset 0 0 0 2px var(--rn-focus); border-radius: 3px; }
.rn-db-number { text-align: right; font-variant-numeric: tabular-nums; }
.rn-db-date { color-scheme: inherit; }
.rn-db-check { width: 16px; height: 16px; accent-color: var(--rn-accent); cursor: pointer; }
.rn-db-select { display: flex; align-items: center; width: 100%; height: 33px; padding: 0 8px; border: 0; background: none; cursor: pointer; text-align: left; }
.rn-db-select:hover { background: var(--rn-hover); }
.rn-db-formula { display: block; padding: 0 8px; color: var(--rn-text); text-align: right; font-variant-numeric: tabular-nums; }
.rn-db-error { color: var(--rn-notice); }
.rn-tag { display: inline-block; max-width: 100%; padding: 1px 8px; border-radius: 5px; background: var(--tag); color: var(--tag-text); font-size: 13px; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rn-root[data-theme="dark"] .rn-tag { filter: brightness(0.75) saturate(1.2); }
.rn-db-rowend { text-align: center; }
.rn-db-remove { display: inline-grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--rn-placeholder) !important; opacity: 0; cursor: pointer; }
.rn-db-table tr:hover .rn-db-remove, .rn-db-card:hover .rn-db-remove { opacity: 1; }
.rn-db-remove:hover { background: var(--rn-hover); color: var(--rn-notice) !important; }
.rn-db-board { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.rn-db-lane { flex: 1 1 0; display: flex; flex-direction: column; gap: 6px; min-width: 200px; padding: 8px; border-radius: 10px; background: var(--rn-callout); }
.rn-db-lane.rn-db-over { box-shadow: inset 0 0 0 2px var(--rn-accent); }
.rn-db-lane-head { display: flex; align-items: center; gap: 8px; padding: 2px 2px 4px; }
.rn-db-lane-head small { color: var(--rn-muted); }
.rn-db-none { color: var(--rn-muted); font-size: 13px; }
.rn-db-card { position: relative; padding: 6px 8px 8px; border: 1px solid var(--rn-border); border-radius: 8px; background: var(--rn-bg); box-shadow: 0 1px 2px rgba(47, 46, 43, 0.06); cursor: grab; }
.rn-db-card .rn-db-remove { position: absolute; top: 4px; right: 4px; }
.rn-db-card-title { min-height: 28px; padding: 4px 22px 4px 2px; font-weight: 600; line-height: 20px; cursor: text; }
input.rn-db-card-title { height: 28px; padding: 0 22px 0 2px; }
.rn-db-card-title.rn-db-empty { color: var(--rn-placeholder); font-weight: 400; }
.rn-db-card.rn-db-dragging { position: relative; z-index: 5; opacity: 0.9; box-shadow: var(--rn-shadow); }
.rn-db-prop { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 12px; color: var(--rn-muted); }
.rn-db-prop b { color: var(--rn-text); font-weight: 500; }
.rn-db-lane-add { display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 6px; border: 0; border-radius: 6px; background: none; color: var(--rn-muted) !important; font-size: 13px; cursor: pointer; }
.rn-db-lane-add:hover { background: var(--rn-hover); }

/* Files put in a page */
.rn-embed { margin: 6px 0; border: 1px solid var(--rn-border); border-radius: 10px; overflow: hidden; background: var(--rn-bg); }
.rn-embed-head { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 8px 0 12px; }
.rn-embed-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: var(--rn-pressed); color: var(--rn-accent); }
.rn-embed-name { flex: 1; min-width: 0; overflow: hidden; font-size: 14px; font-weight: 550; white-space: nowrap; text-overflow: ellipsis; }
.rn-embed-act { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 7px; color: var(--rn-muted); }
.rn-embed-act:hover { background: var(--rn-hover); color: var(--rn-text); }
.rn-embed-body { border-top: 1px solid var(--rn-border); }
.rn-embed-suite { position: relative; height: 460px; overflow: hidden; }
.rn-embed-suite > iframe, .rn-embed-video > iframe { display: block; width: 100%; height: 100%; border: 0; }
.rn-embed-video { aspect-ratio: 16 / 9; }
.rn-embed-body > video { display: block; width: 100%; max-height: 480px; background: #000; }
.rn-embed-audio { padding: 10px; }
.rn-embed-audio audio { width: 100%; }
.rn-embed-loading { display: grid; place-items: center; height: 100%; padding: 24px; color: var(--rn-muted); font-size: 14px; }

/* Images and files pulled narrower, wider, taller */
.rn-sized { position: relative; width: 100%; margin-left: auto; margin-right: auto; max-width: 100%; }
.rn-figure.rn-sized { flex: none; }
.rn-block[data-type="image"] .rn-row { justify-content: center; }
.rn-size { position: absolute; z-index: 3; opacity: 0; transition: opacity 120ms; }
.rn-sized:hover > .rn-size, .rn-sizing > .rn-size { opacity: 1; }
.rn-size-left, .rn-size-right { top: 50%; width: 6px; height: 48px; max-height: 60%; margin-top: -24px; border-radius: 4px; background: var(--rn-muted); box-shadow: 0 0 0 2px var(--rn-bg); cursor: ew-resize; }
.rn-size-left { left: 6px; }
.rn-size-right { right: 6px; }
.rn-size-bottom { left: 50%; bottom: 4px; width: 48px; height: 6px; margin-left: -24px; border-radius: 4px; background: var(--rn-muted); box-shadow: 0 0 0 2px var(--rn-bg); cursor: ns-resize; }
.rn-sizing, .rn-sizing * { user-select: none; }
.rn-sizing iframe { pointer-events: none; }
.rn-embed-body.rn-embed-suite { min-height: 160px; }

/* Text marks */
.rn-text strong { font-weight: 650; }
.rn-text code { padding: 0.12em 0.32em; border-radius: 4px; background: var(--rn-code-bg); color: var(--rn-code-text); font: 0.86em var(--rn-mono); }
.rn-block[data-type="code"] .rn-text code { padding: 0; background: none; color: inherit; font: inherit; }
.rn-text a { color: var(--rn-link); text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--rn-link) 40%, transparent); text-underline-offset: 2px; cursor: pointer; }
.rn-text a.rn-mention { color: inherit; font-weight: 550; text-decoration-color: var(--rn-border-strong); }
.rn-text a.rn-mention::before { content: "↗"; margin-right: 2px; color: var(--rn-muted); font-size: 0.85em; }

/* Floating: the bar over a selection, menus, the emoji, the finder */
.rn-toolbar { position: fixed; z-index: 50; display: flex; align-items: center; gap: 2px; padding: 4px; border: 1px solid var(--rn-border); border-radius: 10px; background: var(--rn-raised); box-shadow: var(--rn-shadow); animation: rn-pop 110ms ease-out; }
.rn-toolbar[hidden] { display: none; }
.rn-toolbar button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 6px; background: none; cursor: pointer; }
.rn-toolbar button:hover { background: var(--rn-hover); }
.rn-toolbar button[aria-pressed="true"] { background: var(--rn-pressed); color: var(--rn-pressed-text); }
.rn-toolbar .rn-toolbar-turn { display: flex; gap: 4px; width: auto; padding: 0 6px 0 8px; margin-right: 2px; font-size: 13px; font-weight: 500; white-space: nowrap; }
.rn-menu { position: fixed; z-index: 60; width: 300px; max-height: min(400px, 70vh); overflow-y: auto; padding: 6px; border: 1px solid var(--rn-border); border-radius: 12px; background: var(--rn-raised); box-shadow: var(--rn-shadow); animation: rn-pop 110ms ease-out; }
.rn-block-menu { width: 250px; }
.rn-menu-section { padding: 8px 10px 4px; color: var(--rn-muted); font-size: 12px; font-weight: 600; }
.rn-menu-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 5px 8px; border: 0; border-radius: 8px; background: none; text-align: left; font-size: 14px; cursor: pointer; }
.rn-menu-item.rn-active { background: var(--rn-hover); }
.rn-menu-icon { display: grid; place-items: center; flex: none; width: 22px; height: 22px; color: var(--rn-muted); font-size: 16px; }
.rn-menu-icon-big { width: 40px; height: 40px; border: 1px solid var(--rn-border); border-radius: 8px; background: var(--rn-bg); color: var(--rn-text); }
.rn-menu-words { flex: 1; min-width: 0; }
.rn-menu-words small { display: block; color: var(--rn-muted); font-size: 12px; }
.rn-menu-item kbd { margin-left: auto; color: var(--rn-muted); font: 12px var(--rn-mono); white-space: nowrap; }
.rn-menu-item.rn-danger { color: var(--rn-notice); }
.rn-menu-item.rn-danger .rn-menu-icon { color: var(--rn-notice); }
.rn-menu-empty { padding: 10px; color: var(--rn-muted); font-size: 14px; }
.rn-emoji { position: fixed; z-index: 60; width: 332px; padding: 8px; border: 1px solid var(--rn-border); border-radius: 12px; background: var(--rn-raised); box-shadow: var(--rn-shadow); animation: rn-pop 110ms ease-out; }
.rn-emoji-bar { display: flex; gap: 6px; margin-bottom: 6px; }
.rn-emoji-bar button { height: 28px; padding: 0 10px; border: 1px solid var(--rn-border); border-radius: 7px; background: var(--rn-bg); font-size: 13px; cursor: pointer; }
.rn-emoji-bar button:hover { border-color: var(--rn-accent); }
.rn-emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; max-height: 260px; overflow-y: auto; }
.rn-emoji-grid button { height: 36px; padding: 0; border: 0; border-radius: 6px; background: none; font-size: 21px; cursor: pointer; }
.rn-emoji-grid button:hover { background: var(--rn-hover); }
.rn-finder-overlay { position: fixed; inset: 0; z-index: 70; display: flex; justify-content: center; align-items: flex-start; padding: 12vh 16px 16px; background: var(--rn-overlay); animation: rn-fade 120ms ease-out; }
.rn-finder-float { position: fixed; inset: 0; z-index: 70; }
.rn-finder { width: min(620px, 100%); border: 1px solid var(--rn-border); border-radius: 14px; background: var(--rn-raised); box-shadow: var(--rn-shadow); overflow: hidden; animation: rn-pop 120ms ease-out; }
.rn-finder-small { position: absolute; width: 360px; border-radius: 12px; }
.rn-finder-field { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--rn-border); color: var(--rn-muted); }
.rn-finder-small .rn-finder-field { padding: 9px 12px; }
.rn-finder-field input:focus-visible { outline: none; }
.rn-finder-field input { flex: 1; min-width: 0; border: 0; background: none; color: var(--rn-text); font: 16px var(--rn-font); outline: none; }
.rn-finder-small .rn-finder-field input { font-size: 14px; }
.rn-finder-list { max-height: min(420px, 60vh); overflow-y: auto; padding: 6px; }
.rn-finder-small .rn-finder-list { max-height: 280px; }
.rn-finder-row { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 7px 10px; border: 0; border-radius: 8px; background: none; text-align: left; cursor: pointer; }
.rn-finder-row.rn-active { background: var(--rn-hover); }
.rn-finder-icon { display: grid; place-items: center; flex: none; width: 22px; height: 22px; color: var(--rn-muted); font-size: 17px; }
.rn-finder-words { flex: 1; min-width: 0; }
.rn-finder-words b { display: block; overflow: hidden; font-weight: 550; white-space: nowrap; text-overflow: ellipsis; }
.rn-finder-words small { display: block; overflow: hidden; color: var(--rn-muted); font-size: 12px; white-space: nowrap; text-overflow: ellipsis; }
.rn-finder-snippet mark { background: var(--rn-pressed); color: var(--rn-pressed-text); border-radius: 2px; }
@keyframes rn-pop { from { opacity: 0; transform: translateY(-4px); } }
@keyframes rn-fade { from { opacity: 0; } }

/* The menu of the workspace: a screen over the notes */
.rn-side { position: absolute; inset: 0; z-index: 40; display: flex; background: var(--rn-chrome); color: var(--rn-text); animation: rn-pop 160ms ease-out; }
.rn-side[hidden] { display: none; }
.rn-side-nav { flex: none; display: flex; flex-direction: column; gap: 2px; width: 260px; padding: 18px 14px; border-right: 1px solid var(--rn-border); overflow-y: auto; }
.rn-side-list { display: contents; }
.rn-side-back { display: flex; align-items: center; gap: 8px; height: 38px; margin-bottom: 14px; padding: 0 10px; border: 0; border-radius: 10px; background: var(--rn-hover); font-weight: 600; cursor: pointer; text-align: left; }
.rn-side-back:hover { background: var(--rn-down); }
.rn-side-tab { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: none; text-align: left; font-size: 14px; cursor: pointer; }
.rn-side-tab .rn-icon { color: var(--rn-muted); }
.rn-side-tab:hover { background: var(--rn-hover); }
.rn-side-tab[aria-selected="true"] { background: var(--rn-bg); color: var(--rn-accent); font-weight: 600; box-shadow: 0 0 0 1px var(--rn-border), 0 1px 3px rgba(47, 46, 43, 0.12); }
.rn-side-tab[aria-selected="true"] .rn-icon { color: var(--rn-accent); }
.rn-side-doc { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: var(--rn-bg); border: 1px solid var(--rn-border); }
.rn-side-nav .rn-side-doc { margin-top: auto; }
.rn-side-doc b { display: block; font-size: 15px; }
.rn-side-doc small { display: block; margin-top: 2px; color: var(--rn-muted); font-size: 12px; }
.rn-side-pane .rn-side-doc { border: 0; padding: 0; background: none; margin-bottom: 14px; }
.rn-side-icon { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 10px; background: var(--rn-pressed); color: var(--rn-accent); }
.rn-side-main { position: relative; flex: 1; min-width: 0; overflow-y: auto; padding: 40px clamp(20px, 5vw, 64px); }
.rn-side-pane { max-width: 760px; }
.rn-side-pane[hidden] { display: none; }
.rn-side-pane h2 { margin: 0 0 6px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
.rn-side-pane > p { margin: 0 0 24px; color: var(--rn-muted); font-size: 14px; }
.rn-side-x { position: absolute; right: 16px; top: 16px; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; background: none; cursor: pointer; }
.rn-side-x:hover { background: var(--rn-hover); }
.rn-side-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.rn-side-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 104px; padding: 12px; border: 1px solid var(--rn-border); border-radius: 12px; background: var(--rn-bg); cursor: pointer; }
.rn-side-tile .rn-icon { color: var(--rn-accent); }
.rn-side-tile:hover, .rn-side-format:hover, .rn-side-choice:hover { border-color: var(--rn-accent); }
.rn-side-formats { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.rn-side-format { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--rn-border); border-radius: 12px; background: var(--rn-bg); text-align: left; cursor: pointer; }
.rn-side-format b { display: block; font-size: 14px; }
.rn-side-format small { display: block; margin-top: 3px; color: var(--rn-muted); font-size: 12px; line-height: 1.4; }
.rn-side-choices { display: flex; flex-wrap: wrap; gap: 8px; }
.rn-side-choice { display: flex; align-items: center; gap: 10px; min-width: 160px; height: 44px; padding: 0 14px; border: 1px solid var(--rn-border); border-radius: 12px; background: var(--rn-bg); cursor: pointer; }
.rn-side-dot { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--rn-border-strong); flex: none; }
.rn-side-choice[aria-checked="true"] { border-color: var(--rn-accent); color: var(--rn-accent); font-weight: 600; }
.rn-side-choice[aria-checked="true"] .rn-side-dot { border: 5px solid var(--rn-accent); }

@media (max-width: 760px) {
  .rn-root { gap: 0; padding: 0; }
  .rn-main { border-radius: 0; box-shadow: none; }
  .rn-sidebar { position: absolute; z-index: 30; inset: 6px auto 6px 6px; box-shadow: var(--rn-shadow); }
  .rn-page { padding: 24px 22px 0 30px; }
  .rn-handle { left: calc(var(--indent) * 26px - 28px); }
  .rn-add { display: none; }
  .rn-title { font-size: 32px; }
  .rn-edited { display: none; }
  .rn-side { flex-direction: column; }
  .rn-side-nav { flex-direction: row; width: auto; margin-right: 48px; padding: 10px; gap: 4px; border-right: 0; overflow-x: auto; }
  .rn-side-nav .rn-side-doc { display: none; }
  .rn-side-back { margin: 0; padding: 0 8px; }
  .rn-side-back span { display: none; }
  .rn-side-tab { flex: none; }
  .rn-side-main { padding: 22px 16px; border-top: 1px solid var(--rn-border); }
  .rn-side-x { top: 10px; right: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .rn-menu, .rn-toolbar, .rn-emoji, .rn-finder, .rn-finder-overlay, .rn-side { animation: none; }
}
`;

const ID = 'rebonotes-styles';

/** The styles put in a document, once. */
export function installStyles(doc: Document): void {
  if (doc.getElementById(ID)) return;
  const style = doc.createElement('style');
  style.id = ID;
  style.textContent = CSS;
  doc.head.append(style);
}
