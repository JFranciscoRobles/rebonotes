# Styling and themes

The notes put their styles in the page once, as custom properties on `.rn-root`. Change them with CSS of your own:

```css
.rn-root {
  --rn-accent: #2563eb;        /* what is chosen, focused, and the buttons */
  --rn-font: 'Inter', system-ui, sans-serif;
  --rn-canvas: #f4f4f5;        /* behind the islands */
}
```

| Property | What it colours |
| --- | --- |
| `--rn-accent`, `--rn-accent-hover`, `--rn-accent-text` | Buttons, ticks, the current page. |
| `--rn-pressed`, `--rn-pressed-text` | What is on, and the current page in the tree. |
| `--rn-canvas`, `--rn-bg`, `--rn-raised` | Behind, the islands, menus. |
| `--rn-text`, `--rn-muted`, `--rn-placeholder` | Text. |
| `--rn-border`, `--rn-border-strong` | Lines. |
| `--rn-code-bg`, `--rn-code-text`, `--rn-callout`, `--rn-link` | Code, callouts and links. |
| `--rn-font`, `--rn-mono` | The fonts. |

Dark colours come when the system asks for them; `data-theme="light"` or `"dark"` on `.rn-root` (or `notes.setTheme()`) fixes one. On a phone the side becomes a panel over the page.
