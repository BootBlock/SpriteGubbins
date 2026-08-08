# Sprite Gubbins — working conventions

> 🔒 **NEVER COMMIT SECRETS.** This repository is **public**. No API keys, tokens,
> passwords, private keys, connection strings, or personal data may ever enter the working
> tree, a commit, or git history. Read the section below before adding any credential-shaped
> value or committing changes.

> ⚠️ **USE DESIGN TOKENS, NOT HARD-CODED VALUES.** This is the one rule that is easy to
> break and hard to spot in review. Read the section below before adding any colour,
> spacing, radius, easing, or other visual value.

> 🌿 **WORK IN A GIT WORKTREE.** Several agents typically work in this repository at the same
> time, and a shared checkout gives them one working tree to fight over. Create a worktree on
> its own branch before you touch a file. Read the section below.

> 🏁 **A GREEN GATE IS NOT A FINISHED TASK.** Work left sitting in a worktree has shipped
> nothing. Commit everything the change touched, merge the branch into `main`, and remove the
> worktree — in the session that did the work, before reporting it done. Read the section below.

> 🚧 **NO BACKWARDS COMPATIBILITY BEFORE `1.0.0`.** This project is pre-1.0, so every release
> may break anything and users are told to expect exactly that. Never add a compatibility shim,
> alias, dual code path or data migration to keep an older shape working. Read the section below.

Sprite Gubbins is a browser PWA that composes precise, model-targeted prompts for generating
game sprite sheets and texture atlases. It is offline-capable, has no server, and persists its
prompt history and custom presets in browser-embedded SQLite (WASM + OPFS).

**The specification is [docs/todo/sprite-gubbins-spec.md](docs/todo/sprite-gubbins-spec.md)** —
the five-phase implementation blueprint, the full field/option/tooltip inventory, and the
architectural guardrails this file operationalises. When the two disagree about *what to
build*, the spec wins; this file governs *how* it gets built.

## All work happens in a git worktree (mandatory)

Several agents typically work in this repository **concurrently**. A checkout has exactly one
working tree, one index and one `HEAD` — so two agents sharing it overwrite each other's edits,
stage each other's files into a commit, and disagree about which branch is checked out. None of
that fails loudly; it surfaces as a diff nobody can account for. Worktree isolation is what makes
concurrent work safe, so it is a precondition of every rule below, not an optimisation.

**The rule:** before making any change, add a worktree at `.claude/worktrees/<topic>` on a
`worktree-<topic>` branch and do the work there. The primary checkout is for reading, reviewing
and integrating — never for edits.

```bash
git worktree add .claude/worktrees/<topic> -b worktree-<topic>
# … install, edit, type-check, lint, test, build and commit inside that tree …
git merge worktree-<topic>                             # from the primary checkout
git worktree remove .claude/worktrees/<topic>          # once the work has landed
git branch -d worktree-<topic>
```

Those last three lines are not optional tidying — they are where the work actually ships, and
they have their own section: [work is not done until it has landed](#work-is-not-done-until-it-has-landed-mandatory).

**The worktrees live inside the repository on purpose**, and that only works because every tool
walking the project root is kept out of them. Three different mechanisms do that, and they are
not interchangeable:

| Walks the root | Kept out by |
| --- | --- |
| `git status` / `git add`, `prettier --write .`, Tailwind's content scan | the `.claude/worktrees/` rule in [.gitignore](.gitignore) — Prettier 3 and Tailwind v4 both honour it |
| `eslint .` | an explicit `.claude/**` in `ignores`, because **flat config does not read `.gitignore`** |
| `vitest run` | an explicit `.claude/**` in `test.exclude`, for the same reason |
| `tsc -b` | nothing needed — `include: ["src"]` resolves to the root `src` alone |

Losing any one of those is silent and expensive: a root `eslint .` starts reporting thousands of
errors from a minified bundle in another branch's `dist/`, and `vitest run` collects another
branch's tests and reports their failures as this branch's. **If a tool that scans the project
root is ever added, give it the same exclusion in the same change.**

- **One worktree, one branch, one task.** Don't adopt a tree another agent is working in, and
  don't run two tasks in one — the point of the isolation is that each tree's diff is
  attributable to a single change.
- **Verify inside the worktree.** `node_modules` is not shared between trees, so run
  `npm install` there, then the full gate from [Verifying a change](#verifying-a-change). A
  build that passed in the primary checkout says nothing about the tree you actually edited.
- **Never switch the primary checkout's branch to do work.** `git checkout <other-branch>` there
  pulls the tree out from under everyone reading it, and it is the one tree all of them assume
  is stable.
- **Never run `git clean -ffdx`.** A single `-f` is safe even with `-x`: git refuses to descend
  into a nested repository and reports `Would skip repository .claude/worktrees/…`. The second
  `-f` removes exactly that protection, and takes every other agent's uncommitted work with it.
- **Remove the worktree once the work lands.** A stale tree keeps its branch checked out — which
  blocks anyone else from checking that branch out — and leaves `git worktree list` describing
  work that finished days ago. The section below says when and how.
- **Nothing else in this file relaxes inside a worktree.** The secrets audit, the design tokens,
  the verification gate and the review pass all apply to the commit you make there, because that
  is the commit that reaches the public history.

## Work is not done until it has landed (mandatory)

A green gate is not a finished task. A change that has been type-checked, linted, tested, built,
driven in the browser and reviewed — and then left sitting in a worktree — has shipped nothing:
`main` doesn't have it, no other agent can build on it, and the tree it lives in holds its branch
hostage. Nothing about that fails loudly. The session ends reporting success, and the loss only
surfaces later, when someone asks why a feature that was "done" isn't in the app.

**The rule:** the session that does the work also lands it. Commit everything the change touched,
merge the branch into `main`, and remove the worktree and its branch — **before** reporting the
task complete.

```bash
# inside .claude/worktrees/<topic>, with the verification gate green
git status --short                        # every ?? line is work too — nothing may be left behind
git add -A
git diff --cached                         # the secrets self-audit, on what will actually be committed
git commit -F <message-file>              # multi-line messages go through a file, never inline quoting

# then from the primary checkout — the one tree that exists for integrating
git merge worktree-<topic>
git worktree remove .claude/worktrees/<topic>
git branch -d worktree-<topic>
```

- **Untracked files are the commonest way half a change lands.** A new component, hook or test
  that was never `git add`ed looks complete in the worktree and arrives on `main` missing the file
  everything else imports — and the build that proves it was green ran against the tree that still
  had it. Read `git status --short` before committing, every time; `??` lines are work, not noise.
- **Committing is not landing.** A branch nobody merged is still invisible: `main` is what the app
  builds from, what deploys, and what every other worktree branches off. Merging is part of the
  task.
- **`main` may have moved while you worked.** Several agents land into it. If the merge isn't a
  fast-forward, resolve it *on your branch* — merge `main` into the worktree branch, re-run the
  full gate there, then merge back — so what reaches `main` is a combination that has actually
  been verified, not one assembled during a conflict resolution.
- **Remove the tree and delete the branch together.** `git worktree remove` leaves the branch
  behind, and a pile of merged `worktree-*` branches turns `git branch` into a graveyard where
  nobody can tell live work from finished work. `git branch -d` (not `-D`) refuses anything
  unmerged, which is the check you want.
- **`git worktree remove` refusing is information, not an obstacle.** It fails when the tree still
  holds uncommitted or untracked changes — which means the commit step missed something. Go and
  look at what. Never reach for `--force`, which destroys precisely the work the refusal is
  protecting.
- **Land only your own tree.** `git worktree list` will show trees other agents are working in
  right now, and from the outside their in-progress work is indistinguishable from abandoned work.
  Leave them alone — this is the same rule as never adopting someone else's tree.
- **If the work genuinely can't land, say so in as many words.** A conflict that isn't yours to
  resolve, a gate you can't get green, a decision that needs the maintainer — those are real. The
  answer is to leave the worktree in place and **report the work as unlanded**, naming the branch
  and what blocks it, so someone can pick it up. What is banned is silence: reporting a task done
  while its only copy sits in a tree nobody has been told about.

## No secrets in the repository (mandatory)

This is a **public** repository. Committing a secret is treated as a build-breaking error —
secrets are effectively permanent once pushed (they live in history and may be scraped within
seconds), so the only safe rule is to never let one in.

**Hard rules — these are not negotiable:**

- **Never** write an API key, token, password, secret, private key, certificate, OAuth
  client secret, session cookie, or connection string into any tracked file — including
  source, tests, fixtures, docs, comments, config, and commit messages. Use an obvious
  placeholder (`<YOUR_API_KEY>`, `sk-xxxx`) when an example is genuinely needed.
- **This app never handles a model API key.** It composes prompt *text* for the user to paste
  into ChatGPT / Midjourney / Stable Diffusion themselves — it makes no outbound model calls.
  If a change proposes an API key field, an image-generation request, or a proxy, that is a
  new architecture, not an increment: stop and raise it rather than introducing a credential
  surface this app has deliberately never had.
- **Never** commit real personal data: private email addresses, phone numbers, real names
  tied to private accounts, internal hostnames, or IP addresses. Use the GitHub `noreply`
  identity (`BootBlock@users.noreply.github.com`), `example.com` / `*.test` domains, and
  `localhost` in examples and tests.
- **Secrets belong in `.env` only.** `.env` and `.env.*` are git-ignored. Read configuration
  from the environment at runtime — never inline it.
- **Never** commit data artefacts that may carry real content: `*.sqlite`/`*.db`, database
  dumps, exported prompt archives, `.pem`/`.key`/`.pfx`/`.p12`/keystores, or `id_rsa*`.
- **Before every commit, self-audit the diff.** Run `git diff --cached` and scan for
  anything credential-shaped or personal. If a secret is in doubt, leave it out and ask.
- **If a secret is ever committed, stop.** Treat it as compromised: it must be rotated/revoked
  at the source, and the history scrubbed — removing it in a later commit is **not**
  sufficient. Surface this immediately rather than quietly continuing.

## Public-repository hygiene (mandatory)

Everything here — code, comments, commit messages, branch names, docs, and history — is
**world-readable and permanent**. Write it as if a stranger will read it tomorrow, because
they can.

- **Stay professional and neutral.** No profanity, disparaging remarks, jokes at anyone's
  expense, or venting in code, comments, or commit messages. No TODOs that name or blame a
  person.
- **No internal-only references.** Don't embed private ticket IDs, internal wiki/Jira/Slack
  URLs, internal hostnames, server names, or other infrastructure details a stranger
  shouldn't see. Describe the *what* and *why*, not internal plumbing.
- **Prompt content is user-facing copy.** Field options, tooltips and preset names ship in the
  bundle and are read by strangers. Keep them descriptive and neutral — this is a tool for
  making game art, and the vocabulary should stay squarely there.
- **Dependency & IP hygiene.** Don't paste code from sources with an incompatible or unknown
  licence; prefer writing it or using a properly-attributed, licence-compatible dependency.
  Vet new dependencies (popularity, maintenance, licence) before adding them, and keep the
  dependency surface minimal — the spec pins a deliberately small list. This repo is licensed
  **MIT** (see [LICENSE](LICENSE)) — keep `package.json`'s `license` field and any added
  licence headers consistent with it, and don't introduce text implying a different licence.
- **Keep the ignore rules tight.** Before committing a new kind of generated or local file,
  confirm it belongs in the repo; if it's a build artefact, local cache, or could contain
  real data, add it to `.gitignore` instead.

## Agent attribution on GitHub content (mandatory)

Anything **you** post or edit on GitHub on the maintainer's behalf must carry an attribution
trailer disclosing that an agent wrote it for @BootBlock. This applies to **every** GitHub
issue and pull-request **comment** *and* every issue/PR **description or body** you author or
edit — not just issues you action end-to-end. Attribution is disclosure, not internal process,
so it always stays (unlike the process/plumbing that must never leak — see
[public-repository hygiene](#public-repository-hygiene-mandatory)).

Append it as the **last lines**, after a `---` rule, wording the verb to match what you did:

```markdown
---
This <issue|pull request> was <actioned|opened|updated> by an agent on behalf of @BootBlock.
```

- **Comment on an issue you actioned end-to-end** → `This issue was actioned by an agent on
  behalf of @BootBlock.`
- **Issue/PR you opened** → use `opened`; a **body you edited** → `updated`; a **pull request**
  → `pull request` in place of `issue`.

The only time to omit it is when GitHub gives you no body to sign (e.g. adding a label). If in
doubt, include it. This does **not** apply to git commit messages — those carry the
`Co-Authored-By` trailer instead.

## Reconcile an issue's labels whenever you touch it (mandatory)

The labels on an issue are how this repository is navigated: what kind of work it is, where in the
app it lands, whether anyone can pick it up. They are also the first thing to rot, and they rot in
one direction — an agent adds a label when it opens an issue, does the work, and leaves
`status: triage` sitting on something that shipped a week ago. A stale label is worse than a
missing one, because it is read as current.

**The rule:** whenever you open, action, substantively comment on, or close a GitHub issue — and a
pull request, which draws from the same list — **reconcile its whole label set in the same visit**.
Reconciling is not "add a label": it is making the set true, which means **removing what no longer
applies** as much as adding what now does.

Choose only from the labels the repository actually has, and read them rather than recalling them:

```bash
gh label list --limit 200                                   # the taxonomy, with descriptions
gh issue view <n> --json labels -q '.labels[].name'         # what it carries now
gh issue edit <n> --add-label "type: bug,area: quantise" --remove-label "status: triage"
```

**What "reconciled" means, family by family.** The taxonomy is five prefixed families plus three
standalone modifiers:

| Family | How many | Reconciled means |
| --- | --- | --- |
| `type:` | one or more | Every kind of work the issue actually contains — an accessibility fix that is also a design change carries both. |
| `area:` | one or more | Every part of the app the work touches. The list maps onto the tabs, the compiler, the stores, the persistence layer and the tooling. |
| `status:` | **exactly one, or none** | The only label that *moves*, so the only one that reliably goes stale: `triage` → `ready` → `in-progress` → `needs-review`, and then off entirely when the issue closes. Remove the old one in the same edit that adds the new one — never leave two. |
| `effort:` | one, once it can be judged | `small` / `medium` / `large` / `epic`, **calibrated to agent wall-clock, not human days** — minutes for a `small`, an hour or two for a `large`. Add it as soon as the scope is understood, and correct it if the work turns out bigger than it looked. An `epic` exceeds one session or one context window, so it is a signal to split the issue rather than start it. |
| `priority:` | at most one | Only where it carries information; most issues need none. `critical` is reserved for a broken app, a leaked secret, or user data at risk. |
| `breaking change` | when it applies | Pre-1.0 this is **not** an exception report — see [no backwards compatibility before 1.0.0](#no-backwards-compatibility-before-100-mandatory), which says any release may break anything. It is how the changes that touch stored data, an exported format or established behaviour stay findable when someone writes up what a release did to them. |
| `good first issue` / `help wanted` | when it applies | An invitation to a stranger, so only where the issue is genuinely self-contained and its description is enough to start from. |

**Never create a label as a side effect of working an issue.** If nothing in the list fits, say so
in a comment and propose the label — adding one changes the taxonomy for every issue in the repo,
which is a decision, not a step. Equally, don't force a poor fit: an issue with no honest `effort:`
yet is better than a guessed one.

A label-only edit is the one GitHub write with no body to sign, so it carries no attribution
trailer — but if you also comment, that comment does (see
[agent attribution](#agent-attribution-on-github-content-mandatory)).

## Design tokens are mandatory where one exists

Every colour and motion value in the UI must come from a **design token**, never a raw
hex / `rgb()` / `oklch()` literal or an ad-hoc Tailwind palette class (`text-cyan-400`,
`bg-slate-900`, …). Tokens are defined in the `@theme` block of
[src/index.css](src/index.css) and Tailwind generates the utilities from them.

This is the spec's own "**NO Hardcoded Magic Values**" guardrail, made concrete: a `#060911`
or a `bg-slate-900` scattered through a component is exactly the magic value the spec bans.

| Need | Use | Not |
| --- | --- | --- |
| The page ground | `bg-foundry-900` | `bg-slate-950`, `#060911` |
| An inset or well *below* the page (prompt box, code panel) | `bg-foundry-950` | `bg-slate-950` |
| A panel resting on the page | `bg-foundry-800` | `bg-slate-900` |
| A **glass** panel — header, studio panel, card, modal shell | `glass-panel` | `bg-foundry-800/80` + a hand-rolled `backdrop-blur` |
| A surface **floating above** a panel — tooltip card, combo-box list | `glass-float` | a bespoke translucent panel with its own border and shadow |
| A control or row inside a panel | `bg-foundry-700` | `bg-slate-800` |
| A border, or a hover/pressed state | `border-foundry-600` / `bg-foundry-600` | `border-slate-700` |
| **Primary** action, focus, selection, ambience | `accent` / `accent-strong` / `accent-soft` | `bg-indigo-500`, `#6366f1` |
| **Live** state — auto-sync, generating, updating as you type | `neon` / `neon-deep` | `text-cyan-400`, `#22d3ee` |
| "Needs attention" chips and badges | `gold` | `text-amber-400` |
| Success / valid / power-of-two clean | `emerald` | `text-emerald-400` |
| Error / invalid / destructive | `rose` | `text-red-500` |
| Body, secondary and faint text | `text-ink` / `text-ink-muted` / `text-ink-faint` | `text-slate-300` |
| Prompt text, metrics, JSON | `font-mono` | a raw font stack |
| Panel entrance, live pulse, ambience, loading | `animate-fade-in` / `animate-pulse-glow` / `animate-float-orb` (+ `-slow`) / `animate-shimmer` | inline `@keyframes`, one-off durations |
| A **tile in a grid** arriving (a preset card, a button that comes and goes) | `animate-pop-in` | `animate-fade-in`, which is for a full-width panel |
| A **cascade** across a grid of those | `stagger-children` on the list | per-child `animation-delay` at the call site |
| A **notification** arriving from off the bottom edge | `animate-toast-in` | `animate-fade-in` |
| An **overlay opening** — the panel, and the ground dimming behind it | `animate-modal-in` + `backdrop:animate-backdrop-in` | one fade on the `<dialog>`, which takes the backdrop with it |
| A glass surface materialising | `animate-tooltip-in` | a bespoke fade, or a keyframe on `filter` that flattens a nested `glass-*` surface |
| A **timed notification's countdown** | `animate-toast-timer` + the duration from `TOAST_DURATION_MS` | a `3s` written into the token, free to drift from the timer that dismisses it |
| A **display heading**, and the sheen travelling it | `heading-gradient` (+ `animate-gradient-pan`) | `bg-gradient-to-r … bg-clip-text text-transparent`, restated per heading |
| The ambient wash breathing, and the live-compile beam | `animate-aurora` / `animate-scan-beam` | one-off durations at the call site |
| Signature easing | `ease-emphasized` | `cubic-bezier(...)` inline |
| The ambient dot backdrop | `bg-grid-pattern` | a hand-rolled repeating gradient |
| The ambient colour wash behind the page | `bg-aurora` | a stack of hand-written `radial-gradient()`s |
| A loading placeholder's sheen | `shimmer-surface` + `animate-shimmer` | a bespoke gradient |

**`accent` and `neon` are not interchangeable.** Indigo is the primary — actions, focus,
selection, the background glow. Cyan marks something *live*: auto-syncing, generating,
recomputing as the user types. The `pulse-glow` animation deliberately blooms from one to the
other because that transition is the signal. Using cyan for an ordinary button, or indigo for a
live badge, quietly destroys that distinction.

**Rules of thumb**

- If a token *doesn't* exist for a genuinely new semantic role, **add the token** to the
  `@theme` block in [src/index.css](src/index.css) rather than hard-coding the value at the
  call site. One definition, restyleable in one place.
- **The colour-swatch surface is the deliberate exception.** `ColorSwatch` renders whatever
  hex `parseColorFromText` resolved — a *user's* colour, not the app's — so it takes its value
  as a prop via inline `style`. `COLOR_HEX_MAP` in `src/constants/colors.ts` is likewise the
  one place raw hex literals belong: it is domain data (the vocabulary the prompt compiler
  understands), not app styling. Nothing else gets to claim that exemption.
- A raw colour/easing literal anywhere else is a smell — it bypasses the palette and the
  reduced-motion catch-all at the bottom of `index.css`.

**Unknown Tailwind utilities fail silently** — no CSS, no error, no warning. A typo'd
`bg-foundy-800` simply renders unstyled. When a change introduces a token-based utility,
verify it actually emits: build and grep the output CSS for the class name before trusting it.

**A keyframe animates `transform`; a utility sets `translate` / `scale` / `rotate`.** Tailwind v4
compiles `-translate-y-1`, `scale-105` and `rotate-45` to the **independent** properties of those
names, which the engine composes with `transform` rather than replacing it. So a keyframe written
against `transform` layers over a component's own hover lift, and one written against `translate`
silently cancels it — `tooltip-in` is the one that animates `scale`, and nothing may put a
`scale-*` utility on the card it runs on. Two other traps live in the same place: an animated
`filter` makes an element a backdrop root for its descendants (so a nested `glass-*` surface goes
flat), and a `forwards` fill latches the end frame, where any non-`none` `transform` makes the
element a containing block for fixed-position descendants. Prefer `backwards`, which holds the
*start* frame for a delayed animation and latches nothing — as the four entrance tokens do.

**A floating surface goes in the top layer, not up a `z-index`.** `glass-panel` is on every panel
in the app, and its `backdrop-filter` makes each one a **stacking context** — so a `z-index` on
anything inside is only ever compared with that panel's own contents, and the next panel down the
page paints straight over it. No value fixes that, because the two are no longer being compared;
the reported symptom is a dropdown sliced in half by the card below it. The same ancestor is also a
containing block for fixed-position descendants, so `position: fixed` doesn't escape it either, and
an `overflow` ancestor (the atlas calculator's scrolling panel) clips the surface whatever it is
positioned against.

`showPopover()` answers all three, and is how `ComboBox`'s suggestion list and `Tooltip`'s guidance
card reach the page: the top layer is not clipped, paints above the whole document including an open
modal `<dialog>`, and resolves `position: fixed` against the viewport. `useAnchoredSurface` owns
that — a new floating surface uses it rather than a fourth spelling of the same problem — and **the
lift is applied entirely from the hook**, attribute included. The call site still positions its
surface inside its own panel the ordinary way, so a browser without the API keeps the surface it
always had rather than losing it: an unguarded `showPopover()` throws inside React's commit phase,
and with no error boundary above these components that unmounts the app. Two traps live in the
user-agent popover stylesheet, which only applies once the attribute is on: `overflow: auto` clips
anything drawn outside the padding box (hence `overflow-visible` on the tooltip's caret), and
`color: CanvasText` takes the surface out of the palette unless it carries a `text-*` of its own.

**The hook flips and clamps, and it has to.** A top-layer surface contributes nothing to any scroll
region and is re-pinned to its anchor on every scroll, so a surface hanging past an edge is not
off-screen, it is *unreachable* — which makes staying inside the viewport a correctness property
rather than a polish one. It opens downwards by preference, goes above only where it genuinely does
not fit below and there is more room there, and is clamped to the viewport either way. The gap
between anchor and surface stays the call site's own `mt-*` class — so it remains a spacing token,
and stays right in the un-lifted fallback — which is why the hook reads that margin back off and
positions without it. The resolved side is published as `data-placement`, which is how the tooltip's
caret knows to turn round, and `--caret-shift` gives back however far the card was pulled off an
edge so the caret still points at the control it explains.

**The popover API does not throw on a state mismatch.** Measured in Edge: showing a popover that is
already showing, hiding one that was never shown, and hiding one already removed from the document
all return silently — HTML's *check popover validity* returns false rather than raising. What
**does** throw is either call on an element carrying no `popover` attribute: `showPopover()` and
`hidePopover()` alike raise `NotSupportedError` there, from the same step of that algorithm. So the
attribute and the call belong together — which is why `useAnchoredSurface` sets both, from one
place. Don't write a guard, a comment or a test that assumes a state mismatch throws; happy-dom
implements none of this, and the no-op stubs in `src/test/setup.ts` deliberately model that silence
rather than inventing an invariant.

## Architecture: the spec's structural laws

These are the spec's guardrails, restated here because they govern every change, not just the
initial build. They are not stylistic preferences.

- **No monolithic files.** Target **under 150 lines**. A file heading past that is telling you
  it has taken on a second responsibility — split it.
- **One thing per file.** Every component, hook, store, utility and type definition lives in
  its own dedicated file, named for the thing it exports.
- **Separation of concerns is directory-enforced.** Domain and compiler logic in `src/utils/`;
  state in `src/stores/`; persistence in `src/db/`; browser-effect and shared-interaction hooks in
  `src/hooks/`; constants in `src/constants/`; types in `src/types/`; UI primitives in
  `src/components/common/`; studio panels in `src/components/studio/`; the quantiser's image panels
  in `src/components/quantise/`; modals in `src/components/modals/`; tab views in
  `src/components/tabs/`; chrome in `src/components/layout/`. A file in the wrong directory is a
  design error, not a filing error.
- **`src/hooks/` exists because `src/utils/` must stay pure.** The clipboard, file downloads and
  the combo box's keyboard state machine are all impure — they touch `navigator`, the DOM, or a
  store — so they cannot live in `src/utils/`, and they are not components. A hook belongs there
  when it is genuinely shared (two or more call sites) and needs React or store access; a hook that
  only wraps a single `useState` is the "abstraction soup" the spec bans, wherever it is filed.
- **Utilities are pure.** Everything in `src/utils/` is a plain function of its arguments — no
  store reads, no DOM, no I/O. That is what makes the prompt compiler and the atlas maths
  testable, and the tests are where their correctness is actually established.
- **YAGNI.** Build what the spec describes and nothing else. No speculative abstraction
  layers, wrapper hooks around a single `useState`, factory functions for simple transforms,
  or configuration knobs nobody asked for.
- **DRY.** Reuse the primitives in `src/components/common/` (`ComboBox`, `Tooltip`,
  `ColorSwatch`, `Badge`, `Toast`) rather than re-styling a bare `<input>` or `<button>`. A
  second, subtly-different implementation of a solved problem is the failure mode to watch for.
- **Completeness.** Never write `// TODO: add remaining fields`, `/* rest of options here */`,
  or a stubbed function body. Every category, field, option, tooltip and compiler rule ships
  whole or not at all.

## No backwards compatibility before 1.0.0 (mandatory)

The `version` in [package.json](package.json) is **0.x**, and everything below `1.0.0` is
explicitly unstable: **there is no backwards-compatibility surface to preserve, and none may be
built.** Anyone on a pre-1.0 build should expect any release to break anything — stored history and
presets, option identifiers, exported names, the wording of the compiled prompt. That expectation
is what buys the freedom to get the design right while changing it is still cheap.

This is already the policy the shipped code assumes: `src/db/schema.ts` carries no migration
machinery because "a schema change is made here and an incompatible database is discarded rather
than translated", and `src/db/configParsers.ts` states that its validation "is not a compatibility
layer and must not become one". This section is the rule those comments are citing.

**The rule:** while the version starts `0.`, a change *replaces* what it supersedes. Rename the
symbol and update every call site in the same commit; delete the retired option and let a stored
value naming it fall through to its default; change the DDL and let an incompatible database be
discarded. Nothing is kept alive to spare an older shape.

**Concretely banned until 1.0.0:**

- **Aliases and forwarding re-exports** that keep an old name resolving — `export { newThing as
  oldThing }`, a `@deprecated` wrapper, a module left behind to re-export from its replacement.
- **Dual code paths** whose second branch exists only to read a previous shape: a
  `typeof value === 'string'` arm for a field that is now an object, an `oldKey ?? newKey` read, a
  prop accepted in two forms.
- **Migration machinery** — schema-version columns, upgrade steps, translating a retired identifier
  into its replacement, a one-off repair pass over stored rows.
- **Legacy fixtures and tests** that exist to prove an older shape still loads. A test named for a
  format this version no longer writes is asserting a promise the project has not made.
- **Feature flags that stage a rename**, or a `v2` implementation parked beside a `v1` nobody has
  deleted.

**Three things look adjacent to this and are not:**

- **Robustness against corrupt storage stays.** The type guards in `src/db/configParsers.ts` exist
  because browser storage is hand-editable and can be truncated — not because an older version of
  this app wrote it. They stay, and they stay written against the `as const` array that *defines*
  each union, never a list of retired values.
- **Platform and browser support is a different axis entirely.** The localStorage fallback in
  `src/db`, the cross-origin-isolation apparatus, and the `typeof surface.showPopover !==
  'function'` guard in `useAnchoredSurface` all serve the browser a user has *today* — not a
  version of this app they had yesterday. Deleting one of them citing this section is a misreading.
- **It is not a licence to break things carelessly.** The verification gate, the tests and the
  review pass are unchanged. Being pre-1.0 removes the obligation to keep the *old* shape working;
  it removes nothing about making the new one correct, nor about saying plainly in the commit
  message what a change breaks.

**At 1.0.0 this policy ends** — deliberately, in a change that says so and rewrites this section.
Until that release exists, don't add compatibility *now* in anticipation of it: a shim written
against a stability guarantee nobody has made yet is dead on arrival, and the diff introducing it
is the one to reject.

## Banned patterns, and which ones the build catches

The spec's anti-pattern list, with the enforcement that backs each one. Where a rule is
machine-enforced, the build fails — don't go looking for a way around it.

| Banned | Enforced by |
| --- | --- |
| Deriving state via `useState` + `useEffect` (word counts, token estimates, compiled prompts) | `react-hooks` v7 compiler rules (`set-state-in-effect`, …), enabled in full in `eslint.config.js` |
| `as any`, `@ts-ignore`, `@ts-nocheck` | `@typescript-eslint/no-explicit-any`, `ban-ts-comment` |
| `eslint-disable` comments | `linterOptions.noInlineConfig` — inline disables are **ignored**, so the rule still fires |
| `forEach(async …)`, floating promises | `@typescript-eslint/no-floating-promises`, `no-misused-promises` |
| Unsafe array indexing (`array[0].prop`) | `noUncheckedIndexedAccess` in `tsconfig.app.json` |
| Missing effect cleanup (listeners, timers, worker callbacks) | **Not machine-enforced.** Every `useEffect` that registers anything returns a cleanup function; React 19 Strict Mode double-invokes in dev, which is how you find the ones that don't. |
| Prop-drilling through 3+ levels when a store exists | **Not machine-enforced.** Consume Zustand directly with atomic selectors — `useSubjectStore((s) => s.category)`, never `useSubjectStore()` wholesale, which re-renders on every unrelated field edit. |
| Hardcoded magic values | See [design tokens](#design-tokens-are-mandatory-where-one-exists); non-visual constants live in `src/constants/`. |
| Compatibility shims, aliases, dual code paths and data migrations while the version is `0.x` | **Not machine-enforced.** See [no backwards compatibility before 1.0.0](#no-backwards-compatibility-before-100-mandatory) — treat one as a review finding and delete it, updating the call sites instead. |

`as unknown as T` is banned by the spec but has no rule that catches it — treat it as a review
finding. The fix is a type guard or a narrower union, never a wider cast.

## Cross-origin isolation, and what actually depends on it

The app makes itself cross-origin isolated, **two different ways**:

- **Dev and preview** — `server.headers` / `preview.headers` in `vite.config.ts` send
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- **Production** — GitHub Pages sends no custom headers, so [src/sw.ts](src/sw.ts) injects them
  onto every response instead, and [public/coi-bootstrap.js](public/coi-bootstrap.js) reloads
  the page once after that worker first takes control. **The first visit is never isolated**;
  it becomes so on the reload.

That apparatus was built on the understanding that the database needed it. It does not — see the
first point below — so isolation is a property this app maintains rather than one it currently
depends on. Removing it would be a decision about the COEP subresource posture, not about
persistence; leaving it costs one reload on a first visit.

Four consequences to hold on to:

- **What SQLite actually needs is a worker, not isolation.** The SAH-pool VFS this app installs
  requires `FileSystemFileHandle.prototype.createSyncAccessHandle`, which browsers expose **only
  inside a worker** — on the main thread the property is simply absent, so
  `installOpfsSAHPoolVfs` throws `Missing required OPFS APIs` however isolated the page is. That
  is why the database lives in [src/db/sqliteWorker.ts](src/db/sqliteWorker.ts) behind the message
  bridge in `sqliteBackend.ts`, and why moving it back onto the main thread would silently return
  the whole app to the localStorage fallback — which is exactly what it did before the worker
  existed.

  It does **not** need `SharedArrayBuffer`, and therefore does not need cross-origin isolation:
  verified by installing the pool and writing a row from a worker on a host sending no COOP/COEP,
  with `crossOriginIsolated === false` and `SharedArrayBuffer` undefined. That check belongs to the
  *plain* `opfs` VFS, which this app does not use. So the isolation apparatus below is not what
  makes the database work — treat the two as separate concerns, and verify each by running it
  rather than by reasoning from the other.
- **The localStorage fallback in `src/db` is a specified behaviour, not a safety net.** It runs
  wherever OPFS itself is unavailable — a private window, a browser without it, an exhausted
  quota — which is a narrower set of cases than "before the first reload", now that isolation is
  not what the database waits for. Changes to the database layer must work in both modes; the
  fallback is the path nobody exercises by accident, which is why it has its own tests.
- **The app must not load a cross-origin subresource.** Under COEP `require-corp` anything from
  another origin that doesn't opt in is blocked outright — which is why the fonts fall back to
  system faces rather than fetching a webfont, as the original single-file app did.
- **`sw.ts` is not a generated file.** The build uses vite-plugin-pwa's `injectManifest`
  strategy precisely so the worker can carry this custom fetch logic; a `generateSW` worker
  cannot express it. Treat it as app code.

Verify isolation with `globalThis.crossOriginIsolated` in the page, not by reading the config —
the `verify` skill covers this.

## Accessibility is not optional

`eslint-plugin-jsx-a11y` runs at error severity, but it only catches the mechanical half.

- No interactive `<div>` / `<span>` without a role and a keyboard handler. The `ComboBox` is
  the one to get right: it needs real listbox semantics (`role`, `aria-expanded`,
  `aria-activedescendant`, arrow/Escape/Enter handling), not a styled `<input>` with a
  click-to-open panel.
- No icon-only button without an `aria-label` — the header's atlas, history and copy actions
  are all icon-first.
- Decorative icons and the ambient backdrop get `aria-hidden="true"`.
- Toasts announce through a live region; a copy confirmation nobody can hear is not a
  confirmation.
- Every screen keeps its `<main id="main-content">` landmark.
- The global `:focus-visible` ring in `index.css` covers the whole app — don't remove it
  per-component, and don't re-implement it either.

## Verifying a change

```bash
npm run type-check     # tsc -b --noEmit, across the app and the Vite config
npm run lint           # eslint . — 0 errors, and inline disables cannot silence it
npm run test:run       # vitest run — the pure utilities are where correctness lives
npm run build          # tsc -b && vite build — must emit dist/ + a valid service worker
npm run format         # prettier --write . before committing
```

The spec's Phase 5 gate is `lint` and `build` clean. Run all four — types, lint, tests, build —
before considering a change done.

**Where the change has a runtime surface, drive it** rather than trusting types alone; the
`verify` skill covers running the app and the cross-origin-isolation gotcha that decides
whether SQLite gets OPFS or falls back. **Then run `/auto-review high`** (the `auto-review`
skill) over the diff and fix every confirmed finding.

**A green gate is the second-to-last step, not the last one.** Once it passes, land the change —
commit, merge into `main`, remove the worktree and delete its branch — as described in
[work is not done until it has landed](#work-is-not-done-until-it-has-landed-mandatory). A verified
change nobody merged is indistinguishable, from `main`, from a change that was never made.

Tests import `describe` / `it` / `expect` from `vitest` explicitly — Vitest runs without
`globals`, which is what keeps test files inside the app's TypeScript program so `tsc -b`
type-checks them too.

## Plan docs carry a status (`docs/todo/`)

The plan and specification documents in [docs/todo](docs/todo) are long-lived and
world-readable, and a **finished** plan reads exactly like a live one unless it says so. That is
how stale guidance gets followed.

**The rule:** every `.md` under `docs/todo/` opens with a status banner directly after its
heading, and finished work is archived:

```markdown
> **Status:** 🟢 ACTIVE — Phase 1 shipped; Phase 2 next.
```

- **`🟢 ACTIVE`** / **`📘 REFERENCE`** stay in `docs/todo/`; **`✅ COMPLETE`** /
  **`⛔ SUPERSEDED`** move to `docs/todo/done/`. Full definitions in
  [docs/todo/README.md](docs/todo/README.md).
- **When a phase ships, update the spec's banner in the same change.** It is the one place a
  reader learns how far the implementation has actually got.
- **Never rewrite a plan's history to match current practice.** A record of what a phase did is
  evidence; editing it to name today's command asserts something that never happened.
- A unit test ([tests/docs-todo-status.test.ts](tests/docs-todo-status.test.ts)) enforces the
  banner and the placement, so drift fails the build rather than review. It can't judge whether
  "COMPLETE" is *true* — that's yours.

### Multi-line text goes through a file, not inline quoting

Multi-line commit messages, PR bodies, and issue/PR comments must be passed via a **file**, not
inline shell quoting: write the text to a file, then `git commit -F <file>` and
`gh … --body-file <file>`. Inline quoting for multi-line text is error-prone — a wrong
here-string delimiter can silently wrap the whole message in stray characters, and by the time
it reaches a pushed commit or a posted comment it is expensive or impossible to fix cleanly. A
file sidesteps all shell-quoting rules regardless of which shell runs the command.
