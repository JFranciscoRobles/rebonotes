# Estilos y temas

Las notas ponen sus estilos en la página una vez, como propiedades personalizadas en `.rn-root`. Cámbialas con CSS propio:

```css
.rn-root {
  --rn-accent: #2563eb;        /* lo elegido, el foco y los botones */
  --rn-font: 'Inter', system-ui, sans-serif;
  --rn-canvas: #f4f4f5;        /* detrás de las islas */
}
```

| Propiedad | Qué colorea |
| --- | --- |
| `--rn-accent`, `--rn-accent-hover`, `--rn-accent-text` | Botones, casillas, la página actual. |
| `--rn-pressed`, `--rn-pressed-text` | Lo que está activo, y la página actual en el árbol. |
| `--rn-canvas`, `--rn-bg`, `--rn-raised` | El fondo, las islas, los menús. |
| `--rn-text`, `--rn-muted`, `--rn-placeholder` | El texto. |
| `--rn-border`, `--rn-border-strong` | Las líneas. |
| `--rn-code-bg`, `--rn-code-text`, `--rn-callout`, `--rn-link` | Código, destacados y enlaces. |
| `--rn-font`, `--rn-mono` | Las fuentes. |

Los colores oscuros llegan cuando el sistema los pide; `data-theme="light"` o `"dark"` en `.rn-root` (o `notes.setTheme()`) fija uno. En un teléfono la barra lateral se vuelve un panel sobre la página.
