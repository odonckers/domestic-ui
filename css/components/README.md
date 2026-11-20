# Components

The `components` cascade layer is declared in [`css/domestic.css`](../domestic.css).
Following [atomic design](https://atomicdesign.bradfrost.com/chapter-2/):

- **Native elements** are styled in [`css/base/`](../base/) (M1). Plain HTML looks right
  with no classes.
- **Atoms** live in [`atoms/`](atoms/) (M2): the minimum on top of base, such as button
  variants, a switch, a field with hint and error, and badges. See the
  [atoms index](atoms/README.md).
- **Molecules** (small groups of atoms, such as a search form or a card) and
  **organisms** (larger sections, such as a site header or a data table with controls)
  land in later milestones.

Each component has one documented class or attribute API, uses only semantic tokens
(`npm run lint:tokens` enforces this for `css/components/**`), and links to the matching
[APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) where one exists.
