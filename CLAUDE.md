# Engineering rules — non-negotiable

These apply to every line of code in this repository. They are enforced by tooling
wherever tooling can enforce them, and by review where it cannot.

## Markup

- **Semantic HTML only. No `<div>` and no `<span>`, under any circumstance.**
  - Block/structure: `section`, `article`, `header`, `footer`, `nav`, `main`,
    `aside`, `figure`, `figcaption`, `hgroup`, `search`, `dialog`, `details`,
    `ul`/`ol`/`li`, `dl`/`dt`/`dd`, `p`, `form`, `fieldset`, `address`, `menu`.
  - Inline: `em`, `strong`, `small`, `b`, `i`, `mark`, `q`, `cite`, `abbr`,
    `data`, `time`, `output`, `bdi`, `label`, `code`, `kbd`.
- No third-party component library that renders `div`/`span` internally.
  Every primitive in `app/components/ui/` is hand-rolled.
- The element must carry meaning. Reaching for `section` as a generic box is the
  same mistake as reaching for `div` — pick the tag that describes the content.
- Enforced by ESLint `vue/no-restricted-html-elements`; `bun run lint` fails on a
  single occurrence.

## Code

- **Functional style.** Pure functions, immutable data, composition over
  inheritance. No classes for domain logic. Side effects live in composables and
  server handlers, never in the middle of a transform.
- **KISS.** The simplest thing that fully works. No speculative abstraction, no
  configuration for a case that does not exist yet.
- **DRY.** Extract on the second occurrence, not the first. Two similar things
  that change for different reasons are not duplication.
- **Single responsibility per file.** No source file over 1000 lines.
- **TypeScript strict.** No `any`, no non-null `!` to silence the compiler.
  Discriminated unions over boolean flags; make illegal states unrepresentable.
- Name things for what they mean, not how they work.

## Security

- Validate every server input with Zod. Never trust the client.
- No secrets in client code. No `v-html`. External links get
  `rel="noopener noreferrer"`.
- Explicit CSP and `Permissions-Policy`. Least privilege on browser APIs — the
  microphone is requested at the moment of use, never on load, and the stream is
  never recorded or transmitted.
- Release every media stream track on teardown.

## Motion

- Animate mount, unmount and reflow. Nothing appears or vanishes abruptly.
- Every animation respects `prefers-reduced-motion`.
- Transform and opacity only — never animate layout properties.

## States

- Skeletons, never spinners and never the word "Loading…".
- Every list has a considered empty state. Every failure has a recovery path.
- Error copy is concise and actionable. Never leak a backend error to the user.
- Helper text sits between the label and the control. No placeholder-as-label.
- Never disable a control with the reason hidden in a tooltip.

## Accessibility — WCAG 2.2 Level AA

This is a conformance target, not a nice-to-have. A screen that fails any of
these is not done.

### Perceivable
- Every image has an `alt`. Decorative images get `alt=""` and are kept out of
  the accessibility tree; an image whose meaning is already in adjacent text is
  decorative. Purely decorative layers are CSS, not markup.
- Text contrast is at least **4.5:1** (3:1 at 24px, or 19px bold). UI controls
  and the visible boundary of a component are at least **3:1**.
- Text over photography always sits on a scrim that guarantees the ratio — never
  on the raw image.
- Nothing is conveyed by colour alone; a dot or a state colour is always paired
  with text.
- The layout reflows at 320px wide and at 400% zoom with no horizontal scroll,
  and survives 200% text-only zoom.

### Operable
- Everything reachable by mouse is reachable by keyboard, in a logical order,
  with no traps. Custom controls handle Enter, Space, arrows and Escape as their
  ARIA pattern requires.
- Focus is always visible, at 3:1 against its background, and never clipped by
  an ancestor's `overflow`.
- A skip link precedes the main landmark.
- Touch targets are at least **24×24px**, and 44×44px wherever there is room.
- No animation that flashes more than three times a second. Motion that is not
  essential stops under `prefers-reduced-motion`.
- Nothing depends on a drag, a path gesture, or a device tilt without a simple
  alternative.

### Understandable
- `<html lang>` is set. One `<h1>` per page and heading levels never skip.
- Every input has a real `<label>`; a placeholder is never the label.
- Errors name the field and say how to fix it, are announced to assistive
  technology, and never rely on colour alone.
- Navigation and naming stay consistent between screens.

### Robust
- Native elements first; ARIA only where no element exists. An incorrect ARIA
  role is worse than none.
- A control's accessible name always contains its visible label.
- Asynchronous changes — a loaded panel, a submitted form, a failure — are
  announced through a live region.
- Every state carries `aria-busy`, `aria-invalid`, `aria-expanded` or
  `aria-current` as appropriate.

### How it gets checked
- Keyboard-only pass on every screen before it is committed.
- Screen-reader pass (VoiceOver) on anything with live or dynamic content.
- Automated axe pass in the end-to-end suite; zero violations is the bar.
- Contrast computed against the real token values, not eyeballed.

## Testing

- Every feature branch ships its own tests. A branch with no test is not done.
- Unit tests (Vitest) for pure logic: transforms, formatters, guards, maths.
- Component tests for anything with more than one visual state.
- End-to-end smoke (Playwright) for each user-facing flow the branch adds,
  including its failure path — not only the happy path.
- `bun run verify` (lint + typecheck + unit) must pass before any commit.

## Git workflow

Three tiers. Work never lands directly on `stage` or `main`.

```
main    ← production. Only ever receives a merge from stage.
 └ stage ← integration. Only ever receives a merge from feature/*.
    └ feature/<short-kebab-name> ← all work happens here.
```

1. Branch `feature/<name>` **off `stage`**.
2. Build, self-review, commit on the feature branch.
3. `bun run verify` must pass.
4. Merge `feature/<name>` → `stage`.
5. Push `stage` to the remote.
6. Merge `stage` → `main` to deploy.

- Commit at every milestone, with a message that says **why**, not what.
- **Before every commit, re-read the work just written** — check the logic, the
  edge cases, and every state — then commit.
- Never force-push `stage` or `main`.
