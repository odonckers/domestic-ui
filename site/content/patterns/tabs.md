---
title: Tabs
summary: Sections of content shown one at a time, chosen from a list of tabs.
milestone: M3
level: molecule
standard: APG Tabs pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
keyboard:
  - Tab: moves focus into the tab list, onto the active tab; from the tab list, moves focus to the tab panel.
  - Left Arrow / Right Arrow: moves focus to the previous or next tab, wrapping at the ends.
  - Home / End: moves focus to the first or last tab.
  - Enter / Space: activates the focused tab, when tabs are not activated on focus.
---
- The selected tab has a bar and full-strength text, not color alone ([WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- Without JavaScript, every section shows and the links work as a table of contents.
- **Our choice:** automatic activation, as the [APG recommends](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#deciding-when-to-make-selection-automatically-follow-focus) for fast panels; `activation="manual"` otherwise.
