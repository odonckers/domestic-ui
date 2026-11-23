---
title: Motion
order: 2
summary: Transitions driven by tokens: one scale for every duration, one knob for movement, and `data-motion` to reduce or stop motion in part of a page.
principle: motion
tokens:
  - semantic: Motion knobs
  - semantic: Motion
  - primitives: Motion
---
Set `--dui-motion-scale` on `:root` to slow every transition down (`2`) or switch it off (`0`).
`data-motion="reduced"` on an element behaves like `prefers-reduced-motion: reduce` inside it, and
`data-motion="none"` stops every transition there.
