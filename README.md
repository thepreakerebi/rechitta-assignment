# Rechitta — Frontend-focused SWE assignment

The supplied Figma design, built as a working product.

**Live:** https://rechitta-assignment.vercel.app

**Vue 3 · Nuxt 3 · Tailwind CSS 4 · TypeScript.** No component library — every
primitive is hand-rolled and `div`/`span` are banned by lint. The rules the code
is held to are in [CLAUDE.md](./CLAUDE.md).

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

*Project Overview 1* and *2* in the design are one screen in two states.

## Seeing every state

Every state is reachable from a URL, so none of it has to be taken on trust.

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

**Fluid, not breakpoints.** Seven media/container queries in the whole app, none
a layout breakpoint. Everything else is `clamp()` — 72 of them — in `cqi` rather
than `vw`, so a heading in a 27rem column sizes for the column.

**Smooth scrolling.** Zero gap between chapters; a test measures the gaps and
expects `0`. Declared on the document *and* on the deck's track, because
`scroll-behavior` is not inherited. Off under `prefers-reduced-motion`.

**The orb, on live audio.** `getUserMedia` → `AnalyserNode` (FFT 2048, range
tightened to speech) → four bands → a WebGL2 shader, once per frame inside
`requestAnimationFrame` and outside Vue's reactivity. It stops rendering
offscreen and on a hidden tab, and releases every track on teardown.

It listens only where it is asked to — never on the splash or the feed, and not
on onboarding, where permission has not been granted yet. A test counts
`getUserMedia` calls on the briefing and expects zero.

> **On the asset.** The brief says *"refer to the Orb PNG in Figma assets"* —
> which orb is meant, not a literal instruction, because a PNG cannot react to
> audio. This is a port of [Kaiyu Hsu's MIT-licensed Gradient Orb](https://uicapsule.com/ui/gradient-orb)
> to raw WebGL2; attribution in [`licenses/`](./licenses/gradient-orb.md).

**The conversation, end to end.**

```
capture → measure → POST /api/agent/ask → recognise → answer → speak
 browser                                    server              browser
```

Press the mic and the orb moves to your voice. Press it again and the capture is
reduced to five numbers — duration, voiced time, peak, mean, energy per band —
and those are what get posted. **No audio leaves the browser;** a test reads the
request body and asserts it.

Recognition sits **behind the API**, where a transcription service would live in
production. `server/mock/recognise.ts` stands in for one and does not pretend to
understand, having been given no audio to understand: every utterance it can
hear resolves to the question the deck is showing, with a confidence taken from
how much there was to go on. **The words are a stand-in; the boundary, the
measurements and the failure modes are not.**

> **Why her voice is a file.** `speechSynthesis` exposes no audio node, so
> nothing can analyse what it says. Her answers are pre-rendered and play
> through `createMediaElementSource` into **the same `AnalyserNode` the
> microphone uses**, so the orb moves to her voice by the same four numbers it
> moves to yours. The clips are macOS `say` output, standing in for a TTS vendor.

She answers out loud, and only in reply — arriving by link is reading. The
header's second line asks for a question before there is one and holds what was
said afterwards; **Clear** stops her mid-sentence and puts it back. Three
failures, three screens: unheard is a toast that leaves the answer alone, no
answer on file is the empty state, a dead connection is the error state with a
way back. The question she heard goes into the URL.

**Mock server.** Six Nitro routes, every input validated with Zod; a slot taken
between loading the form and submitting it returns a real 409. Asking is a
discriminated union, so a spoken question and a typed one cannot be confused,
and an utterance's measurements are bounded on every field.

A chapter's arrow opens the deck at that chapter's own slide, named in the
address by the panel's id rather than its position, so the slide survives a
reload and can be shared. Each chapter also carries its own question and earns
as many panels as it deserves:
the opening question is the whole briefing, seven chapters and seven panels,
while *"how does the payment plan work"* earns the schedule and the arithmetic
behind it. Panels are held once and shared between answers, each titled for what
it holds rather than for its shape.

**Every state.** Skeletons in the shape of what is coming — never a spinner,
never the word "Loading". Permission is three outcomes (refused, unsupported, no
device) and is *followed* rather than sampled, because it changes from the
address bar and from other tabs. No backend message reaches the interface.

**Accessibility.** axe-core over every screen at two widths, plus the states
that are easy to forget — the booking form mid-complaint, a failed briefing, an
empty one. Zero violations, no rule disabled. Semantic markup enforced by lint;
keyboard paths tested on every screen; one `h1` per screen; targets clear 44px.

## Departures from the design

Five inconsistencies corrected rather than reproduced, each noted where it
occurs in [`server/mock/data.ts`](./server/mock/data.ts):

1. *"Investment from AED 2.8M"* sat above a unit list topping out at 2.016M —
   2.8M is the estimated value; the floor is 1.68M.
2. Handover read Q3 2025 on one panel, Q3 2026 on the card naming the project.
3. Two different units were both numbered #528.
4. *"Berkley Square North"* is spelt Berkeley everywhere else.
5. The Amenities chapter repeated the Returns chapter's rental yield.

Two more, both type. The smallest steps are drawn on a 400px artboard — a 10px
eyebrow, an 11px caption — and those floors are raised to 12 and 13. And the
design fades the greeting's last line into the black at roughly 2:1; the
gradient still takes the orb, but the words sit above it at 4.5:1.

## Structure

```
app/
  components/{deck,feed,orb,ui}/   panels · chapters · the WebGL orb · primitives
  composables/                     microphone, her voice, API, mock scenario
  utils/                           pure logic: formatting, orb maths, validation
public/audio/                      her seven answers, pre-rendered
server/{api,mock}/                 routes, seed data, recognition, state switch
shared/types/                      the domain, so the two sides cannot drift
```

Money is integer fils, never a float — 1.97M as a float is not 1.97M. Panels are
a discriminated union, so a panel carrying units cannot also claim a schedule.

**Tests: 152 unit, 418 end-to-end** across Chromium (microphone granted and
refused) and mobile Safari. They are written to be able to fail: the swipe tests
drive real touch through the browser's input pipeline, and the voice loop runs
against Chromium's real capture device — which immediately caught two seconds of
speech being measured as thirty-four milliseconds of it.
