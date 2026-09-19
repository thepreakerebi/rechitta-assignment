# Rechitta — Frontend-focused SWE assignment

A production build of the Rechitta onboarding and project-discovery experience,
from the supplied Figma design.

**Live:** https://rechitta-assignment.vercel.app

Built with **Vue 3, Nuxt 3, Tailwind CSS 4 and TypeScript**. No component
library: every primitive is hand-rolled, because the design has a voice and
because this repository bans `div` and `span` outright — see
[CLAUDE.md](./CLAUDE.md) for the rules the code is held to.

```bash
bun install
bun run dev      # http://localhost:3000
bun run verify   # lint + typecheck + unit
bun run test:e2e # 423 end-to-end tests, three browsers
```

---

## The screens

| | Screen | What it is |
|---|---|---|
| 01 | `/` | Splash — meet Rechitta |
| 02 | `/onboarding` | Ask for the microphone |
| 03 | `/ask` | Say the first thing — the orb on live audio |
| 04 | `/project/berkeley-square-north` | The briefing: seven chapters, closing on a viewing request |
| 05 | `/project/berkeley-square-north/answer` | Her answer, paged |
| — | `/privacy` | What happens to your voice |

The design supplies five frames. Two of them — *Project Overview 1* and *2* —
are one screen in two states, which is why the pager under them shows three
dots against two drawn panels: the third is the payment schedule, and it is
built.

### Seeing every state without breaking anything

Every state the interface claims to handle is reachable from a URL, so none of
it has to be taken on trust:

| Append | What happens |
|---|---|
| `?fail=server` | 500 from every route |
| `?fail=timeout` | 504 |
| `?fail=empty` | Empty session, no chapters, fully booked week |
| `?fail=slow` | Deliberately slow, so the skeletons are visible |
| `?latency=2000` | Any delay you like, in milliseconds |

For example:
[the feed, failing](https://rechitta-assignment.vercel.app/project/berkeley-square-north?fail=server) ·
[the feed, empty](https://rechitta-assignment.vercel.app/project/berkeley-square-north?fail=empty) ·
[the deck, thinking](https://rechitta-assignment.vercel.app/project/berkeley-square-north/answer?latency=3000)

---

## The six requirements

### Fluid at every size, not fixed breakpoints

The whole application contains **six** media and container queries, under four
distinct conditions, and not one of them is a layout breakpoint:

- `width >= 64rem` — the chapters become an accordion when there is room to lay
  seven photographs side by side (declared twice: the accordion and its loading
  skeleton, so the skeleton arrives in the shape the real thing will take).
- `hover: none`, or a narrow viewport — "click" becomes "tap".
- `container (width < 17rem)` — the stat grid drops from two columns to one,
  measured against the *panel*, not the window.
- `prefers-reduced-motion` — twice, in the one stylesheet that owns motion.

Everything else is fluid by construction — 71 uses of `clamp()`, with each type
and space token interpolating between its value at a 400px viewport and its
counterpart at 1600px. The unit is `cqi`, not `vw`: a heading inside a 27rem
column on a 2560px display should size itself for the column, not the display.

Tested at 320, 390, 1024 and 1440 on every screen, asserting no horizontal
scroll anywhere.

### The entire page scrolls smoothly

The briefing is one continuous scroll with **zero** gap between chapters — a
photograph with a margin around it reads as a thumbnail rather than a place, and
there is a test that measures those gaps and expects exactly `0`.

Smooth scrolling is declared on the document, and again on the answer deck's
track: `scroll-behavior` is not an inherited property, and the track is its own
scroll container, so the page's setting never reached it. Under
`prefers-reduced-motion`, all of it stops.

### The orb reacts to the microphone, in real time

`getUserMedia` → `AnalyserNode` (FFT 2048, range tightened to −85…−25 dB because
the defaults spend most of their resolution on levels a conversation never
reaches) → four bands (bass, mid, treble, level) → a WebGL2 fragment shader.

The loop runs once per frame inside `requestAnimationFrame` and deliberately
never touches Vue's reactivity: the status ref changes a handful of times in a
session, the drive changes sixty times a second, and only the first of those
belongs to a framework.

**Performance** is not an afterthought. The orb stops rendering when it scrolls
out of view, stops on a hidden tab, caps its frame delta at two frames so a
backgrounded tab does not resume by teleporting, renders a single still frame
under reduced motion, and releases every media track on teardown.

**A note on the asset.** The brief says *"refer to the Orb PNG in Figma assets"*.
That points at which orb is meant; it cannot be taken literally, because a PNG
cannot react to audio frequencies. The orb here is a port of
[Kaiyu Hsu's MIT-licensed Gradient Orb](https://uicapsule.com/ui/gradient-orb)
to raw WebGL2 — attribution in [`licenses/`](./licenses/gradient-orb.md).
`three` and `@react-three/fiber` were deliberately not taken: 600KB for one
fullscreen triangle, and R3F wraps its canvas in a `div`.

**The orb only ever listens where it is asked to.** Not on the splash, not on
the onboarding screen (there is nothing to listen with before permission is
granted), and not on the briefing — a briefing is not a conversation. A test
counts `getUserMedia` calls on the feed and expects zero.

### A mock server covering the whole flow

Six Nitro routes: the session, the project, its units, the agent, viewing slots,
and the booking itself. Every input is validated with Zod — a mock that only
works against well-behaved input is not finished — and a slot taken between
loading the form and submitting it returns a real 409.

The agent answers **per question**. The briefing's seven chapters each carry
their own, and each gets its own answer with as many panels as the question
earns: the broad opening question earns all three, *"how does the payment plan
work"* earns the schedule and the arithmetic behind it, *"what is nearby"* earns
four distances and nothing else. Seven arrows into one answer would have made
the arrows decoration.

**Five inconsistencies in the comp are corrected rather than reproduced**, each
noted where it occurs in [`server/mock/data.ts`](./server/mock/data.ts):

1. *"Investment from AED 2.8M"* sat above a unit list topping out at 2.016M.
   2.8M is carried as the estimated value; the real floor is 1.68M.
2. Handover read Q3 2025 on one panel and Q3 2026 on the card naming the same
   project.
3. Two different units were both numbered #528.
4. *"Berkley Square North"* on the booking card is spelt Berkeley everywhere
   else.
5. The Amenities chapter repeated the Returns chapter's metric — a rental yield
   under a heading about the podium gardens.

### Loading, empty, error, permission, success

Skeletons throughout, in the shape of the content that is coming, so nothing
jumps when it arrives. Never a spinner, and never the word "Loading".

Permission is treated as three distinct outcomes — refused, unsupported, no
device — because they need different sentences, and it is **followed** rather
than sampled: it changes from the address bar and from other tabs, so a screen
that reads it once on mount goes on offering to ask for something it already
has. Only an explicit grant lifts a refusal, because Chromium reports `prompt`
again after a dismissed request and reading that as consent erases a real
refusal.

Every failure has a recovery path, and no backend message ever reaches the
interface. Every list has a considered empty state: a fully booked week offers
an email address rather than a shrug.

### Visual polish, accessibility, code quality

**Accessibility** is a conformance target here, not a nice-to-have.

- **axe-core runs in the end-to-end suite** over every screen at two widths,
  plus the states that are easy to forget — the booking form mid-complaint, a
  failed briefing, an empty one. **Zero violations**, and no rule is ever
  disabled to make a screen pass.
- Semantic markup is enforced by ESLint: a single `div` or `span` fails the
  build. Hand-rolled controls use real elements — the slot picker is a genuine
  radio group, so arrow keys work without a line of script.
- Keyboard paths are tested on every screen, including a focus ring that had to
  be moved onto the label because a ring drawn on a visually hidden 1px input is
  a ring nobody can see.
- Touch targets clear 44px. axe caught one that *looked* fine and was 45×23 to a
  finger, because an invisible overlay covered its lower half.
- One `h1` per screen, no skipped levels, asserted across all six.
- Every animation respects `prefers-reduced-motion`.

**Tests**: 126 unit, 423 end-to-end across Chromium (microphone granted and
refused) and mobile Safari. They are written to be able to fail — the scroll
test runs at a window height where the card cannot fit, because that is the only
place the bug it describes was ever visible.

---

## Decisions worth explaining

**The device status bar is not reproduced.** It is the phone frame around the
design, not part of it, and a fake 9:41 on a web page is a lie.

**No speech recognition.** The only browser API for it ships the audio to a
vendor's servers, which contradicts both the promise made on the onboarding
screen and this repository's rule that the stream is never recorded or
transmitted. The microphone drives the orb and nothing else.

**Booking opens in place rather than navigating.** The briefing is the argument
for booking; taking someone away from it asks them to carry that argument in
their head.

**The desktop chapter accordion** is adapted from the *Squeeze Carousel* idea by
yura on 21st.dev. Its source is behind a login and was never read — this is a
Vue implementation from the described behaviour, which it had to be regardless.

**Two documented exceptions** to the repository's transform-and-opacity rule,
both commented where they occur: the accordion animates `flex-grow` and the
booking disclosure animates `grid-template-rows`. Both *are* changes of size;
the transform-only alternatives stretch a photograph and stretch type.

**Autoplay is deliberately absent** from the accordion. Anything that moves
itself needs a way to stop it under WCAG 2.2.2, and a briefing that changes
while you are reading it is worse than one that waits.

---

## How it is built

```
app/
  components/
    deck/     the answer deck — persistent header, panels
    feed/     the briefing — greeting, chapters, viewing request
    orb/      the WebGL orb, and nothing else
    ui/       hand-rolled primitives
  composables/  the microphone, the API, the mock scenario
  utils/        pure logic: formatting, orb maths, validation, swipe
server/
  api/          six routes
  mock/         the seed data and the scenario switch
shared/types/   the domain, shared by both sides so they cannot drift
```

Money is integer fils, never a float — 1.97M written as a float is not 1.97M —
and formatting happens at the edge. Panels are a discriminated union, so a panel
carrying units cannot also claim to carry a schedule, and a fourth kind would be
a compile error everywhere it must be handled.
