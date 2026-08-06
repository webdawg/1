# Starsystem — CODEBOT

Instruction document for general principles and foundational items when
generating code in this repository — the "how to write it," as distinct
from `SCOPE.md` (the *why*), `SPEC.md` (the *what*, how the engine
currently works), `ROADMAP.md` (the *what's next*), and `DEVELOPMENT.md`
(how to run and verify it). Applies to any code generation in this repo,
human or AI. Like the other docs, this is a living document — update it
when a new principle gets established, not just when asked.

## Real data, always cited

Every fact presented as real must actually be real, and cited with its
source (collaboration/paper/year) the way `relativity.ts`'s constants
already are (GRAVITY collaboration 2019, Bennett & Bovy 2019, EHT
Collaboration 2022, ...). Never fabricate a plausible-looking number for
something presented as real data — where a real value genuinely isn't
known (a moon's dilation inputs, a fictional planet's gravity), show it
as unknown (`null`, `"—"`) rather than inventing one.

The one deliberate exception is `randomSystem.ts`'s generated
star/planet/civilization content, and it's exempted *loudly*, not
silently: its own file header states plainly that this is the one
fictional corner of the engine, so it's never mistaken for another
curated `*Facts.ts` file. Any new fictional content follows the same
rule — say so, in the code, where anyone reading it will see it.

## No premature abstraction

Build the minimum the current request actually needs. Three similar
lines beat a shared helper built for one caller; don't add
configuration, flags, or hooks for hypothetical future needs. When a
simpler design and a more "complete" one are both viable (a flat
generated-planet list vs. a full recursive tree level, say), default to
the simpler one unless the task specifically calls for the deeper one.

## Comments explain why, not what

Names should already say what code does. A comment earns its place by
capturing something a future reader can't get from the code itself: a
non-obvious invariant, a past incident, a workaround for a specific bug,
a design decision that looks arbitrary until you know why. See almost
any comment in `layout.ts` or `relativity.ts` for the pattern.

## Proper comments as industry/language standard

Beyond the why-not-what guidance above, every file carries the comment
coverage its language ecosystem treats as standard practice — for this
codebase, that's TypeScript/TSDoc convention: a doc comment on exported
functions, types, and interfaces; module-level context at the top of a
file where its purpose isn't obvious from the filename alone; inline
comments on any logic dense enough that a first-time reader would
otherwise have to trace it by hand. This is a floor, not a substitute
for the why-not-what guidance above — a comment that only restates a
function's name in prose satisfies neither bar.

## Cold-open file explainers

At the end of every source file, include a commented-out block — a
"cold explainer" — that summarizes everything the code in that file
does, written for a reader who has opened only this one file with no
other context. Not a duplicate of the module-level comment at the top
(which orients a reader *before* they start reading), and not a copy of
the project's other documentation (this project deliberately isn't
folding everything into one master file — see the doc list in
`README.md`) — a self-contained account of this specific file's own
responsibilities, written last, once the file's actual final shape is
known, and kept current whenever the file's behavior changes.

## One source of truth for anything read from two places

If two systems need to agree (`SolarView`'s rendering and `spatialNav`'s
direction-picking both need the same on-screen positions), they call the
*same* function (`layout.ts`'s `computeGridPositions`) rather than each
computing their own version that could drift apart.

## Pure functions for anything that isn't UI

Physics, generation, and world-model logic (`relativity.ts`,
`randomSystem.ts`, `worldTree.ts`) stay framework-free and
side-effect-free — no React, no session state, callable and testable in
isolation. React components own state and rendering; everything else is
a pure function of its inputs.

## Verify visually, not just via typecheck

`tsc --noEmit` catches type errors, not rendering bugs — this Ink TUI
has repeatedly hit *silent* corruption (a border character replaced by
blank space, a row's content bleeding into the one below it) that only
shows up by actually looking at the rendered output. Any change that
touches layout, sizing, or new text content gets checked live via tmux,
at **both** a narrow floor (80 columns) and a wider terminal — see
`DEVELOPMENT.md`'s Testing section for the exact pattern, and its Known
Ink gotchas section for the specific failure modes already found.

## Update the docs in the same change as the code

`SPEC.md` and `CLAUDE.md`'s Current status section get updated alongside
any behavior change, not as an afterthought — a design decision, a
discovered gotcha, or a reverted approach is worth exactly as much as
the reasoning behind it, and that reasoning is cheapest to capture the
moment it happens, not reconstructed later.

## Git discipline

Commit and push only when explicitly asked. Never force-push, skip
hooks, or amend a shared commit without being told to. Prefer a new
commit over rewriting history.
