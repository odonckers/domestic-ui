# Components

Empty for now. The `components` cascade layer is already declared in
[`css/domestic.css`](../domestic.css), so nothing about layer order changes
when components arrive.

Following [atomic design](https://atomicdesign.bradfrost.com/chapter-2/):

- **Atoms** are native elements styled in [`css/base/`](../base/) (M1).
- **Molecules** (small groups of atoms, such as a labelled field with a hint
  and an error message) land here in M2.
- **Organisms** (larger sections, such as a site header or a data table with
  controls) land here in M3.

Each component will have one documented class or attribute API, use only
semantic tokens (`npm run lint:tokens` enforces this), and link to the
matching [APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) where
one exists.
