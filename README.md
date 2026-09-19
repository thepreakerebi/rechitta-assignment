# Rechitta — Frontend-focused SWE assignment

A production build of the Rechitta onboarding and project-discovery experience,
from the supplied Figma design.

**Live:** https://rechitta-assignment.vercel.app

**Vue 3 · Nuxt 3 · Tailwind CSS 4 · TypeScript.** No component library — every
primitive is hand-rolled, and `div`/`span` are banned by lint. The engineering
rules the code is held to are in [CLAUDE.md](./CLAUDE.md).

```bash
bun install
bun run dev       # localhost:3000
bun run verify    # lint + typecheck + unit
bun run test:e2e  # end-to-end, three browser profiles
```

## Screens

| | Route | |
|---|---|---|
| 01 | `/` | Splash |
| 02 | `/onboarding` | Microphone permission |
| 03 | `/ask` | Say the first thing — the orb on live audio |
| 04 | `/project/berkeley-square-north` | The briefing: seven chapters, closing on a viewing request |
| 05 | `/project/berkeley-square-north/answer` | Her answer, paged |

*Project Overview 1* and *2* in the design are one screen in two states — which
is why their pager shows three dots against two drawn panels. The third is the
payment schedule, and it is built.

## Seeing every state

Every state is reachable from a URL, so none of it has to be taken on trust:

| Append | |
|---|---|
| `?fail=server` | 500 from every route |
| `?fail=timeout` | 504 |
| `?fail=empty` | Empty session, no chapters, fully booked week |
| `?latency=2000` | Any delay, in milliseconds |

[Feed, failing](https://rechitta-assignment.vercel.app/project/berkeley-square-north?fail=server) ·
[feed, empty](https://rechitta-assignment.vercel.app/project/berkeley-square-north?fail=empty) ·
[deck, thinking](https://rechitta-assignment.vercel.app/project/berkeley-square-north/answer?latency=3000)

## The requirements

**Fluid, not breakpoints.** Six media/container queries in the whole app, under
four conditions, none a layout breakpoint: the chapters become an accordion when
there is room, "click" becomes "tap", the stat grid drops to one column, and
reduced motion. Everything else is `clamp()` — 71 of them — interpolating
between a 400px viewport and 1600px. The unit is `cqi`, not `vw`, so a heading
in a 27rem column sizes itself for the column rather than for a 2560px display.

**Smooth scrolling.** The briefing is one continuous scroll with zero gap
between chapters; a test measures those gaps and expects `0`. Declared on the
document and again on the deck's track, since `scroll-behavior` is not
inherited. All of it stops under `prefers-reduced-motion`.

**The orb, on live audio.** `getUserMedia` → `AnalyserNode` (FFT 2048, range
tightened to speech) → four bands → a WebGL2 shader, once per frame inside
`requestAnimationFrame` and deliberately outside Vue's reactivity. It stops
rendering offscreen and on a hidden tab, caps its frame delta, and releases
every track on teardown.

It only listens where it is asked to — never on the splash, never on the feed,
and not on the onboarding screen, where permission has not been granted yet. A
test counts `getUserMedia` calls on the briefing and expects zero.

> **On the asset.** The brief says *"refer to the Orb PNG in Figma assets"*. That
> points at which orb is meant; it cannot be literal, because a PNG cannot react
> to audio. This is a port of [Kaiyu Hsu's MIT-licensed Gradient Orb](https://uicapsule.com/ui/gradient-orb)
> to raw WebGL2 — attribution in [`licenses/`](./licenses/gradient-orb.md).

**Mock server.** Six Nitro routes: session, project, units, agent, viewing
slots, booking. Every input is validated with Zod, and a slot taken between
loading the form and submitting it returns a real 409.

The agent answers **per question**. Each of the seven chapters carries its own,
and each gets an answer with as many panels as the question earns — the opening
question earns all three, *"how does the payment plan work"* earns the schedule
and the arithmetic behind it. Seven arrows into one answer would have made the
arrows decoration.

**Every state.** Skeletons in the shape of what is coming — never a spinner,
never the word "Loading". Permission is treated as three outcomes (refused,
unsupported, no device) and is *followed* rather than sampled, because it
changes from the address bar and from other tabs. Every failure has a recovery
path, and no backend message reaches the interface.

**Accessibility.** axe-core runs over every screen at two widths, plus the
states that are easy to forget — the booking form mid-complaint, a failed
briefing, an empty one. Zero violations, and no rule is disabled to get there.
Semantic markup is enforced by lint; keyboard paths are tested on every screen;
one `h1` per screen with no skipped levels; touch targets clear 44px.

## Corrections to the design

Five inconsistencies are corrected rather than reproduced, each noted where it
occurs in [`server/mock/data.ts`](./server/mock/data.ts):

1. *"Investment from AED 2.8M"* sat above a unit list topping out at 2.016M —
   2.8M is the estimated value; the floor is 1.68M.
2. Handover read Q3 2025 on one panel and Q3 2026 on the card naming the same
   project.
3. Two different units were both numbered #528.
4. *"Berkley Square North"* is spelt Berkeley everywhere else.
5. The Amenities chapter repeated the Returns chapter's rental yield.

The design's smallest type — a 10px eyebrow, an 11px caption — is drawn on a
400px artboard. Those floors are raised to 12 and 13; the larger steps are
unchanged.

One further departure, on the feed. The design fades the greeting's last line
into the black along with the orb's lower half, so *"life's biggest decisions"*
is drawn at perhaps 2:1 against its background. It is the first thing Rechitta
says and it fails WCAG 1.4.3 by a wide margin. The gradient still takes the orb
— that is what lets the orb read as half-swallowed by the page — but the words
now sit above it at full white, which is 4.5:1 everywhere they fall. The
greeting is also held at the comp's 12px rather than scaling with the frame:
grown, its last line runs past the orb's face and onto bare black.

## Structure

```
app/
  components/{deck,feed,orb,ui}/   panels · chapters · the WebGL orb · primitives
  composables/                     microphone, API, mock scenario
  utils/                           pure logic: formatting, orb maths, validation
server/{api,mock}/                 six routes, the seed data, the state switch
shared/types/                      the domain, shared so the two sides cannot drift
```

Money is integer fils, never a float — 1.97M as a float is not 1.97M — and
formatting happens at the edge. Panels are a discriminated union, so a panel
carrying units cannot also claim to carry a schedule.

**Tests:** 126 unit, 400+ end-to-end across Chromium (microphone granted and
refused) and mobile Safari. They are written to be able to fail: the swipe tests
drive real touch through the browser's input pipeline, because an earlier
version dispatched synthetic events, passed, and did nothing on a phone.
