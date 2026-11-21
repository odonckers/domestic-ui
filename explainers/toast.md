# Toast

Status: shipped in domestic-ui as a CSS region plus a small web component.
CSS: [`css/components/molecules/alerts.css`](../css/components/molecules/alerts.css) ·
Script: [`web-components/dui-toaster.js`](../web-components/dui-toaster.js) ·
Example: [`examples/molecules/alerts.html`](../examples/molecules/alerts.html)

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)
when, and only when, they appear in all capitals.

## Problem

After an action ("Link copied", "Export started") apps show a short message in a corner of the
screen. HTML has live regions (`role="status"`, `role="alert"`) but no toast element, and the APG
has no toast pattern. Common implementations create the live region at the same moment as the
message, so screen readers stay silent; dismiss the message after a few seconds, before some
users have read it; move focus to the message; or say "error" only with red.

## Use cases

- Confirming a background action: "Draft saved."
- Reporting that something started and will finish later: "Export started. We will email you."
- Reporting a recoverable failure: "Sync failed. Check your connection."
- A server-rendered "flash" message after a form post.

## Goals

- Every message is announced, without moving focus (WCAG 4.1.3).
- No message disappears on a timer (WCAG 2.2.1).
- The tone is a word as well as a color and an icon (WCAG 1.4.1).
- Each message can be dismissed, and focus goes somewhere sensible afterwards (WCAG 2.4.3).
- Server-rendered messages work without JavaScript.

## Non-goals

- Messages with actions such as "Undo" (see the open questions).
- Queueing, de-duplication, or a maximum number of messages.
- Errors that block the user: those belong next to their cause, in an inline `role="alert"`.

## Proposed markup and API

- The region MUST be in the page from the start, before any message is added:
  `<dui-toaster data-alert="toasts" role="status"></dui-toaster>`. The component adds
  `role="status"` if it is missing. `data-alert="toasts"` positions it at the bottom inline-end
  corner and stacks messages, newest last.
- A message is a child with a tone, `data-alert="info | success | warning | danger"`, whose text
  MUST start with a word for the tone ("Success:").
- `element.show(text, { tone, prefix })` builds a message and returns it. `tone` defaults to
  `"info"`. `prefix` defaults to "Info:", "Success:", "Warning:" or "Error:"; pass your own for
  other languages, or `""` for none.
- Each message gets a Dismiss button (`data-alert="dismiss"`) whose description is the message.
  `data-dismiss-label` on the region changes its text (default "Dismiss").
- `element.dismiss(toast)` removes a message. It first fires `dui-toast-dismiss` on the toast;
  the event bubbles and is cancelable.
- Messages MUST NOT be removed on a timer by the component. **Our choice:** no timeout option at
  all, so nobody can opt into breaking WCAG 2.2.1 by accident.
- Messages rendered by the server inside the region show with JavaScript off; the component
  adds their Dismiss buttons when it loads.

```html
<dui-toaster data-alert="toasts" role="status"></dui-toaster>
<script type="module" src="web-components/dui-toaster.js"></script>
<script type="module">
  document.querySelector("dui-toaster").show("Draft saved.", { tone: "success" });
</script>
```

## Keyboard interaction

- A new message never takes focus.
- Tab: reaches each message's Dismiss button, in order.
- Enter / Space on Dismiss: removes the message. Focus moves to the next message's Dismiss
  button, else the previous one, else back to the element that had focus before the user
  entered the region.

## Accessibility mappings

| Element | Role | Name / state |
| --- | --- | --- |
| `<dui-toaster>` | `status` (polite live region, atomic false) | none |
| Message | none (generic) | its text, read when added |
| Dismiss button | `button` | "Dismiss", described by the message |

When a message is added, a screen reader user hears it at the next pause, for example
"Success: Draft saved." Some screen readers also read the new button's text ("Dismiss").

## Alternatives considered

- **A `popover="manual"` region in the top layer.** Rejected as the default: it needs script to
  show, so server-rendered messages would be hidden with JavaScript off. It would draw above
  modal dialogs, which a fixed region does not.
- **Auto-dismiss after a few seconds.** Rejected: users who read slowly, use magnification or
  are interrupted lose the message (WCAG 2.2.1).
- **`role="alert"` for every message.** Rejected: assertive announcements interrupt whatever the
  user is doing. Use `role="alert"` only for urgent errors, inline.
- **Moving focus to each message.** Rejected: it pulls keyboard and screen reader users away from
  their task for a message that needs no action.

## Prior art

- Heydon Pickering, [Inclusive Components: Notifications](https://inclusive-components.design/notifications/).
- [MDN `status` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)
  and [`alert` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role).
- [WCAG 2.2 Understanding 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html),
  [2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)
  and techniques [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22) and
  [ARIA19](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19).
- [Open UI](https://open-ui.org/), where toast and notification components have been discussed.

## Mapping to a future standard

The region is "a live region for transient status messages, positioned at a viewport edge".
If HTML or Open UI standardizes a toast or notification element, `<dui-toaster>` would map to it
and `show()` would become that element's method or a declarative child.

## Open questions

- While a modal `<dialog>` is open, everything outside it is inert, including the region, so its
  messages are neither announced nor dismissible. Should the component move the region into the
  open dialog?
- Should the Dismiss button be kept out of the announcement (for example by adding it a moment
  after the text)?
- Messages with an action ("Undo") need a way to reach them quickly; is a keyboard shortcut
  acceptable, and how is it discovered?
- Should there be a limit on the number of messages kept on screen?
