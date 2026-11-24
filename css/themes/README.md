# Prebuilt themes

Opt-in theme files. `css/domestic.css` imports none of them. Link one after it and set `data-theme` on `:root` or any element:

```html
<html lang="en" data-theme="soft">
  <head>
    <link rel="stylesheet" href="css/domestic.css">
    <link rel="stylesheet" href="css/themes/soft.css">
  </head>
```

| File | `data-theme` | In short |
| --- | --- | --- |
| [`calm.css`](calm.css) | `calm` | Indigo primary, default radius and density, accent-tinted shadows |
| [`soft.css`](soft.css) | `soft` | Warm neutrals, terracotta primary, rounder corners, roomier padding |
| [`compact.css`](compact.css) | `compact` | Blue accent, sharp corners, compact density, faint shadows |

Each file sets semantic `--dui-*` tokens only (`npm run lint:tokens` checks it). The tokens each one changes and how to write your own are in [PRINCIPLES.md, Prebuilt themes](../../PRINCIPLES.md#prebuilt-themes). Live: [`examples/themes.html`](../../examples/themes.html).
