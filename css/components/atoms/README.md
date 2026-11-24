# Atoms

Atoms add the minimum on top of the [base layer](../../base/). Plain HTML already looks
right; an atom covers something a native element cannot say on its own, such as how much
emphasis a button has or what tone a status label carries.

Every atom:

- lives in one file here, imported into the `components` layer by
  [`css/domestic.css`](../../domestic.css);
- has **one** attribute API, written at the top of its file with the markup to copy;
- uses only semantic `--dui-*` tokens (`npm run lint:tokens` checks `css/components/**`);
- has an example page under [`examples/atoms/`](../../../examples/atoms/index.html) that is
  validated, checked with axe in light and dark, and tested in Chromium, Firefox and WebKit.

## Index

| Atom | File | API | Example | Specs |
| --- | --- | --- | --- | --- |
| Text helpers | [`text.css`](text.css) | `data-text="lead \| small \| muted"` (combinable) | [text.html](../../../examples/atoms/text.html) | [WHATWG text-level semantics](https://html.spec.whatwg.org/multipage/text-level-semantics.html), [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| Quiet link | [`link.css`](link.css) | `data-link="quiet"` on `<a href>`; `data-link="nav"` keeps a navigational link outside a `<nav>` out of the visited color (combinable) | [link.html](../../../examples/atoms/link.html) | [WHATWG `a`](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element), [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) |
| Buttons | [`button.css`](button.css) | `data-button="[primary \| secondary \| quiet] [small \| large] [icon]"` on `<button>`, `<input type=submit\|button\|reset>`, `<a href>`; states `disabled`, `aria-disabled="true"`, `aria-busy="true"` | [button.html](../../../examples/atoms/button.html) | [WHATWG `button`](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element), [APG Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), [APG focusability of disabled controls](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#focusabilityofdisabledcontrols), [MDN `aria-disabled`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled), [MDN `aria-busy`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy), [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) |
| Form controls | none: [`css/base/forms.css`](../../base/forms.css) | No API; native elements | [controls.html](../../../examples/atoms/controls.html) | [WHATWG forms](https://html.spec.whatwg.org/multipage/forms.html), [W3C forms tutorial](https://www.w3.org/WAI/tutorials/forms/) |
| Switch | [`switch.css`](switch.css) | `role="switch"` on `<input type="checkbox">` | [switch.html](../../../examples/atoms/switch.html) | [APG Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), [ARIA in HTML](https://www.w3.org/TR/html-aria/#el-input-checkbox), [MDN `switch` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/switch_role) |
| Field | [`field.css`](field.css) | `data-field` on the wrapper, `data-field="hint"` and `data-field="error"` on the messages | [field.html](../../../examples/atoms/field.html) | [WCAG 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html), [MDN `aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby), [MDN `aria-invalid`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid), [MDN `:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid) |
| Badge | [`badge.css`](badge.css) | `data-badge="neutral \| accent \| success \| warning \| danger"` | [badge.html](../../../examples/atoms/badge.html) | [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [Using ARIA rule 1](https://www.w3.org/TR/using-aria/#rule1) |
| Icon | [`icon.css`](icon.css) | `data-icon` on an inline `<svg>` copied from [Lucide](https://lucide.dev); `data-icon="mirror"` flips a directional icon in right-to-left text | [icon.html](../../../examples/atoms/icon.html) | [WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html), [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [APG names and descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/), [MDN `currentColor`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#currentcolor), [MDN `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) |

## Not shipped, and why

| Candidate | Decision |
| --- | --- |
| Divider | Cut. `<hr>` is the native thematic break and is already styled in the base layer. A class would duplicate it. |
| Avatar | Cut. There is no standard or APG pattern for it; it is an `<img alt>` with a radius and a size, which the base layer and one line of your CSS already give. Revisit with a real use case (initials fallback, image loading). |
| Danger button variant | Not added. Not requested, and a destructive action is better marked by its label and a confirmation `<dialog>` than by color. Easy to add later as one more variant word. |
| Spinner for loading | Not added. The honest state is the changed label plus `aria-busy`; a spinner that replaces the label hides it from everyone. |

## Our choices

Each is a choice between valid options, not a standard.

- **Our choice:** one `data-<atom>` attribute per atom, whose value is a space-separated list
  matched with [`~=`](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors).
  One attribute is one API to learn, it reads as a sentence (`data-button="primary small"`),
  and it cannot pile up like modifier classes.
- **Our choice:** `data-button` with no variant word keeps the native default (a submit button
  is primary, everything else is secondary), so M1 markup keeps working and the attribute
  is only needed when the native type does not match the emphasis you want.
- **Our choice:** the quiet button uses the accent color for its text, so it still reads as
  interactive without a border. Use it next to other buttons, not inside running text,
  where a real link belongs.
- **Our choice:** primary buttons add an inner focus ring in their text color on top of the
  shared outline, so the indicator contrasts with the fill as well as the surface. This is the
  double-ring technique described in
  [WCAG technique C40](https://www.w3.org/WAI/WCAG22/Techniques/css/C40).
- **Our choice:** default buttons and fields are 36px tall and large ones 40px, and a coarse (touch) pointer
  restores 44px, between Primer and Radix (32px) and Material (40px), for comparison.
- **Our choice:** small buttons are 32px tall: below the 36px default, above the
  [24px minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **Our choice:** `aria-disabled="true"` looks exactly like `disabled`. Prefer native `disabled`;
  use `aria-disabled` when users should be able to reach the control and read why it is unavailable.
- **Our choice:** the field's error text starts with the word "Error:" in the markup, rather
  than a CSS icon, so every user and every screen reader gets it with no extra API. Invalid
  controls also get a thick start border, a shape change as well as a color change.
- **Our choice:** errors are tied to controls with `aria-describedby`, not `aria-errormessage`,
  because `aria-describedby` has broader screen reader support today (see the support notes on
  [MDN `aria-errormessage`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-errormessage)).
- **Our choice:** the switch is the native checkbox with `role="switch"`, drawn with
  `appearance: none` and one pseudo-element. The thumb moves and changes color, and forced-colors
  mode gets explicit system colors.
- **Our choice:** badge tones are 8% of the tone mixed into the surface, with the tone as text.
  The tinted surfaces are derived tokens (`--dui-color-*-surface`), so a theme that changes the
  surface or a tone re-tints badges with no extra overrides.
- **Our choice:** icons are [Lucide](https://lucide.dev) SVGs pasted inline, with no icon files, sprite, font or
  package in the repository, because Lucide already draws in our 24px, 2px, `currentColor` stroke and inline SVG needs
  no build and follows forced colors. The hook is `data-icon` on the `<svg>`, the same one-attribute rule as every atom,
  rather than `svg[aria-hidden]`, which would also style meaningful `role="img"` graphics and tie the look to an
  accessibility attribute. The rules for when to use an icon are in [PRINCIPLES.md](../../../PRINCIPLES.md#icons).
- **Our choice:** an icon-only button (`data-button="icon"`) is named by visually hidden text inside it, not
  `aria-label`, because real text is translated by browser translation tools and copied with the page. Its
  `<dui-tooltip>` shows the same words and is `aria-hidden`, so the name is announced once; with JavaScript off the
  button keeps its name.
- **Our choice:** a field is an atom here, not a molecule, because a control is not usable
  without its label, hint and error. Larger compositions (forms, cards, headers) are
  molecules and organisms for later milestones.
