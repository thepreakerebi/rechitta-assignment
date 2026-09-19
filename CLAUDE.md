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
