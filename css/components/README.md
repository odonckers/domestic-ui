# Components

The `components` cascade layer is declared in [`css/domestic.css`](../domestic.css).
Following [atomic design](https://atomicdesign.bradfrost.com/chapter-2/):

- **Native elements** are styled in [`css/base/`](../base/) (M1). Plain HTML looks right
  with no classes.
- **Atoms** live in [`atoms/`](atoms/) (M2): the minimum on top of base, such as button
  variants, a switch, a field with hint and error, and badges. See the
  [atoms index](atoms/README.md).
- **Molecules** live in [`molecules/`](molecules/) (M3a): small groups of atoms and native
  elements, such as a dialog and drawer, tabs, a navigation list, a card and toasts. See the
  [molecules index](molecules/README.md). Where HTML cannot do the behavior, a molecule pairs
  with one small [web component](../../web-components/README.md); where there is no standard or
  APG pattern, it has an [explainer](../../explainers/README.md).
- **Organisms** live in [`organisms/`](organisms/) (M3b): larger sections of a screen: a page
  header, a filter bar, a long form split into sections and a data table. See the
  [organisms index](organisms/README.md). They adapt to their own width with container queries, so
  they fit the main area of the [app shell](../layout/app-shell.css) and the other page layouts in
  [`css/layout/`](../layout/).

Each component has one documented attribute API (or a native element or ARIA role), uses only
semantic tokens (`npm run lint:tokens` enforces this for `css/components/**`), and links to the
matching [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) where one exists.
