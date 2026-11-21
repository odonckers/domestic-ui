---
title: Menu button
summary: A button that opens a menu of actions.
milestone: M3
level: molecule
standard: APG Menu Button pattern: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
specs:
  - APG Menu and Menubar pattern: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
keyboard:
  - Enter / Space: on the button, opens the menu and moves focus to the first item.
  - Down Arrow / Up Arrow: in the menu, moves focus to the next or previous item.
  - Home / End: in the menu, moves focus to the first or last item.
  - Enter: in the menu, activates the focused item and closes the menu.
  - Escape: closes the menu and returns focus to the button.
---
- `<dui-menu>` adds the ARIA and arrow keys. Without JavaScript, every action is a Tab stop.
- For links to other pages, use a disclosure: `role="menu"` means arrow keys and no Tab stops ([APG note](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)).
