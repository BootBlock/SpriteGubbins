# Sprite Gubbins — working conventions

> **Six rules break the build, the repository or someone else's work when they are missed, and
> every one of them is easy to miss. Read the section behind each before you edit.**
>
> - 🔒 **NEVER COMMIT SECRETS.** This repository is **public**, and a committed secret is
>   permanent.
> - ⚠️ **USE DESIGN TOKENS.** No raw colour or easing value, and no ad-hoc Tailwind palette class.
> - 🌿 **WORK IN A GIT WORKTREE.** Agents work here concurrently; a shared checkout loses edits.
> - 🏁 **LAND THE WORK.** A green gate is not done — commit, merge to `main`, remove the tree.
> - 🎯 **DO THE WHOLE FIX.** Never the quick, narrow or low-surface one.
> - 🚧 **NO BACKWARDS COMPATIBILITY BEFORE `1.0.0`.** Replace what you supersede; build no shims.

Sprite Gubbins is a browser PWA that composes precise, model-targeted prompts for generating
game sprite sheets and texture atlases. It is offline-capable, has no server, and persists its
prompt history, custom presets and interface settings in browser-embedded SQLite (WASM + OPFS).

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
- **The last three lines above are where the work ships**, not tidying — the section below says
  when and how.
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
- **A *locked file* is a different failure, and it does not look like one.** If anything still holds
  a handle inside the tree — a dev server left running from the `verify` skill is the usual one, and
  it holds `node_modules` — the removal fails partway with `failed to delete '…': Invalid argument`
  rather than a refusal. By then it has already **unregistered** the worktree, so the directory is
  still on disk while `git worktree list` no longer mentions it and a second `remove` answers
  `fatal: '…' is not a working tree`. Read the message: the refusal above names uncommitted work,
  this one names a path. Stop the process, then finish the removal by hand:

  ```bash
  # after stopping the dev server, from the primary checkout
  rm -rf .claude/worktrees/<topic>     # the leftover the failed removal could not delete
  git worktree prune                   # clear the stale administrative entry
  git branch -d worktree-<topic>
  ```

  `git branch -d` still refuses anything unmerged, so this recovers the tidy-up without giving up
  the check that matters. **Stop the dev server before removing the tree** and none of it arises.
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

## Close the issue you actioned (mandatory)

The open issues are the queue. An issue whose work has shipped but which nobody closed is
indistinguishable, from the list, from work still waiting to be done — so it gets re-triaged,
re-estimated, and eventually picked up by someone who does the whole thing again. It also makes
every count drawn from that list wrong. The agent that actioned the issue is the only one who
knows it is finished, and the moment that knowledge exists is the moment it has to be recorded.

**The rule:** when you have actioned an issue and [the work has
landed](#work-is-not-done-until-it-has-landed-mandatory), close it in the same visit — with a
comment saying what was done. Closing an issue whose work is still sitting in a worktree is worse
than leaving it open, because it asserts something untrue; land first, then close.

```bash
gh issue comment <n> --body-file <file>    # what was done — multi-line goes through a file
gh issue close <n>
gh issue edit <n> --remove-label "status: in-progress"   # reconcile the whole set, not just this
```

Closing is a label event too: `status:` comes **off entirely** when the issue closes, and the rest
of the set gets reconciled in the same visit — see [reconcile an issue's
labels](#reconcile-an-issues-labels-whenever-you-touch-it-mandatory). The comment carries the
attribution trailer, as every issue body you write does.

**Not closing is the exception, and it has to be argued in the comment.** If there is a genuinely
good reason to leave an issue open, **say what it is in the comment you just posted** — an issue
left open with no explanation reads as forgotten, which is the failure this rule exists to stop.
Reasons that qualify are ones where the issue is honestly not finished:

- **You actioned part of it.** The issue asks for four things and you did two. Say which two
  landed and which two remain — or split the remainder into its own issue and close this one
  against it.
- **It is a tracking or `epic` issue** whose children are still open.
- **It needs a decision, or verification, that is not yours to make** — a maintainer's call on
  behaviour, or a check on hardware you don't have.

Reasons that do **not** qualify: leaving it open "for visibility", leaving it for the maintainer to
close, or hedging because you are unsure the fix works. That last one is a verification problem,
not a closing problem — run the gate and drive the app, then close it.

**A comment on a closed issue does not reopen it.** Follow-up arriving on something already
actioned is normal, and it is how the record of a piece of work stays in one place. Do the extra
work, land it, and add a **new comment** on that same issue describing what you did — a new
comment, not an edit of the old one, because editing rewrites the record rather than extending it.
The issue stays closed.

Reopening is a claim that the work is outstanding again, and everyone reading the list will act on
it. So it takes a **very good** reason, and there are essentially two:

- **The fix did not work, or regressed.** What was closed was not actually done.
- **The issue was closed on a false premise** — the wrong thing was fixed, or the report was
  misread.

If the follow-up is genuinely *new* work rather than a continuation, open a new issue and link it
to the closed one instead. That keeps the closed issue's record honest about what it covered. When
you do reopen, say why in a comment in the same visit, and put a `status:` label back on — a
reopened issue with no status is back to being invisible.

## Design tokens are mandatory where one exists

Every colour and motion value in the UI must come from a **design token**, never a raw
hex / `rgb()` / `oklch()` literal or an ad-hoc Tailwind palette class (`text-cyan-400`,
`bg-slate-900`, …). Tokens are defined in the two `@theme` blocks of
[src/index.css](src/index.css) — one `static` for the hue wheel, one for everything else — and
Tailwind generates the utilities from them. **That file is the only place a colour value is
written down**, and it writes them in `oklch()` because the palette's structure ("one lightness,
one chroma budget, ten hues") is only expressible in a perceptual space; the equivalent hexes are
ten unrelated numbers with no way to place an eleventh.

This is the spec's own "**NO Hardcoded Magic Values**" guardrail, made concrete: a `#0a0c12`
or a `bg-slate-900` scattered through a component is exactly the magic value the spec bans.

| Need | Use | Not |
| --- | --- | --- |
| The page ground | `bg-foundry-900` | `bg-slate-950`, `#0a0c12` |
| An inset or well *below* the page (prompt box, code panel) | `bg-foundry-950` | `bg-slate-950` |
| A panel resting on the page | `bg-foundry-800` | `bg-slate-900` |
| A **glass** panel — header, studio panel, card, modal shell | `glass-panel` | `bg-foundry-800/80` + a hand-rolled `backdrop-blur` |
| A surface **floating above** a panel — tooltip card, combo-box list | `glass-float` | a bespoke translucent panel with its own border and shadow |
| A view whose backdrop is **not the app's own** — the quantiser, showing the user's image | raise `--glass-float-opacity` on that view's `[data-tab]` rule | leaving the default, where guidance over a white sheet measures 1.19:1 |
| A **single control** whose card lands on that image — the quantiser's keying tooltip, at 2.03:1 | set `--glass-float-opacity` on the control, which the card inherits through the top layer | raising the whole view, which spends the glass on the two cards that never needed it |
| A control or row inside a panel | `bg-foundry-700` | `bg-slate-800` |
| A border, or a hover/pressed state | `border-foundry-600` / `bg-foundry-600` | `border-slate-700` |
| **Primary** action, focus, selection, ambience | `accent` / `accent-strong` / `accent-soft` | `bg-indigo-500`, `#6366f1`, or a hue read off the settings store into a `style` |
| **Live** state — auto-sync, generating, updating as you type | `neon` / `neon-deep` | `text-cyan-400`, `#22d3ee` |
| Anything belonging to the **active view** — panel edge, section heading, step chip, hover bloom | `bg-tab` / `text-tab` / `border-tab` / `ring-tab` | `accent`, which pins it to the primary in every view |
| A **primary action inside a view** — Save, Load preset, Download PNG, the file chooser | `action-tab` | `accent`, which the chrome's Copy Prompt keeps and a panel's own action does not |
| The **whole hue wheel, neat** — the hairline under the chrome, and nothing broader than one | `bg-spectrum` (+ `animate-spectrum-pan`) | a hand-written ten-stop `linear-gradient()`, or a panel, tile or block filled with the wheel |
| The **wordmark** — ink with the wheel drifting behind it | `heading-spectrum` (+ `animate-spectrum-pan`) | `bg-spectrum` poured through the type, which out-shouts every control in the chrome |
| One **member of an open-ended list**, coloured by position | `spectrumStopAt(index)` assigned to `--color-tab` | a runtime `` `text-spectrum-${name}` ``, which the scanner never sees and which emits nothing |
| "Needs attention" chips and badges | `gold` | `text-amber-400` |
| Success / valid — it fits, it parsed, it is clean | `emerald` | `text-emerald-400` |
| Error / invalid / destructive | `rose` | `text-red-500` |
| Body, secondary and faint text | `text-ink` / `text-ink-muted` / `text-ink-faint` | `text-slate-300` |
| Prompt text, metrics, JSON | `font-mono` | a raw font stack |
| Body type — a label, an input, a button, a guidance paragraph, a list row, prompt text | `text-xs` (13px), the app's default rung | a bracketed `text-[…px]`, which no longer moves when the scale does |
| An uppercase eyebrow or legend, a badge pill, a mono metadata chip (timestamp, word count, dimensions) | `text-2xs` (11px), the floor | a bracketed size, or `text-xs` for something only ever scanned |
| The paragraph or value that opens a panel | `text-sm` (15px) | `text-base`, which is the bold-heading rung |
| Panel entrance, live pulse, ambience, loading | `animate-fade-in` / `animate-pulse-glow` / `animate-float-orb` (+ `-slow`) / `animate-shimmer` | inline `@keyframes`, one-off durations |
| A **tile in a grid** arriving (a button that comes and goes) | `animate-pop-in` | `animate-fade-in`, which is for a full-width panel |
| A **view's own content** arriving on navigation — a tab's root, a studio panel, a preset card | `animate-view-fade-in` / `animate-view-pop-in`, the page-transition speed | the plain entrances, which are for a surface that turns up mid-session |
| A **cascade** across a grid of those | `stagger-children` on the list | per-child `animation-delay` at the call site |
| A **notification** arriving from off the bottom edge | `animate-toast-in` | `animate-fade-in` |
| An **overlay opening** — the panel, and the ground dimming behind it | `animate-modal-in` + `backdrop:animate-backdrop-in` | one fade on the `<dialog>`, which takes the backdrop with it |
| A glass surface materialising | `animate-tooltip-in` | a bespoke fade, or a keyframe on `filter` that flattens a nested `glass-*` surface |
| A **timed notification's countdown** | `animate-toast-timer` + the duration from `TOAST_DURATION_MS` | a `3s` written into the token, free to drift from the timer that dismisses it |
| A **notification leaving** — the only exit in the app | `animate-toast-out` + the duration from `TOAST_EXIT_MS`, and `inert` while it runs | unmounting it, which leaves the surface nothing to animate away with |
| A **section heading**, and the sheen travelling it | `heading-gradient` (+ `animate-gradient-pan`) | `bg-gradient-to-r … bg-clip-text text-transparent`, restated per heading |
| A **`<details>` easing open and shut** | `section-reveal` | a keyframe on the content, which a `content-visibility: hidden` subtree plays exactly once |
| The ambient wash breathing, and the live-compile beam | `animate-aurora` / `animate-scan-beam` | one-off durations at the call site |
| A `transition-*` at the ordinary speed, on a colour, an opacity or a bloom | nothing — the `@theme` default is the base rung, 390ms on `ease-emphasized` | a `duration-*` restating it, except where the call site is one end of a pair the other end also states |
| Signature easing — an entrance, where the travel is not the point | `ease-emphasized` | `cubic-bezier(...)` inline |
| Something changing **size**, where the travel *is* what is being read | `ease-decelerate` | `ease-emphasized`, 83% travelled in its first quarter, which reads as a jump |
| Something **leaving** — an exit, which has to hold before it goes | `ease-exit` | either ease-*out* above run backwards, half gone before the eye catches it starting |
| The ambient dot backdrop | `bg-grid-pattern` | a hand-rolled repeating gradient |
| The ambient colour wash behind the page | `bg-aurora` | a stack of hand-written `radial-gradient()`s |
| A loading placeholder's sheen | `shimmer-surface` + `animate-shimmer` | a bespoke gradient |
| What a **transparent pixel** shows through — the quantiser's two preview canvases | `bg-checkerboard` | leaving the pane's `bg-foundry-950` behind it, where keyed-out reads as painted black |
| A **measurement drawn over the reader's own artwork** — the sprite preview's bounding boxes | the two achromatic stops in `src/constants/spriteMarker.ts`, mirrored from `index.css` | any hue from the wheel, which would claim a meaning a bounding box does not have |
| The **scrollbar** — set once in `index.css`, for both engines | `--color-scrollbar-track` / `-thumb` / `-thumb-hover` | `foundry-700` on `foundry-900`, which measures 1.19:1 |

**The scrollbar's three tokens are the one row here no component reaches for.** They are consumed
only by the base-layer rules in `index.css` — `scrollbar-color` for Firefox and the
`::-webkit-scrollbar-*` rules for Chromium — because a scrollbar is painted by the engine and has no
element to put a class on. They exist as tokens anyway, and outside the foundry ramp, because WCAG
1.4.11 wants 3:1 against the track and the ramp cannot reach it: it tops out at L 0.286 where the
ratio needs L ≥ 0.48. `accent` and `neon` clear it and are spoken for — indigo is primary, cyan is
*live* — and a scrollbar is neither. `tests/design-tokens.test.ts` recomputes the ratio from the
token values and fails below 3:1, in both the resting and the hover state, so the next palette change
cannot quietly undo it.

**`accent` and `neon` are not interchangeable.** Indigo is the primary — actions, focus,
selection, the background glow. Cyan marks something *live*: auto-syncing, generating,
recomputing as the user types. The `pulse-glow` animation deliberately blooms from one to the
other because that transition is the signal. Using cyan for an ordinary button, or indigo for a
live badge, quietly destroys that distinction. It is also why **no view owns the cyan stop** —
`--color-tab` resting there would make every panel in that view look like it was recomputing, and
a unit test asserts it never does. **The settings dialog cannot reach it either**: the accent is
the one role colour a user may repoint, and cyan is missing from the nine hues it offers, for
exactly this reason.

**The accent is settable, and that changes nothing a component does.** A reader picks one of nine
hues in the settings dialog; `App` puts it on the shell as `data-accent`, and the `[data-accent]`
rules in `index.css` repoint the three `--color-accent*` tokens there. So a component still writes
`bg-accent` and `ring-accent-soft` and knows nothing about it — **reading `accentHue` out of the
settings store to choose a colour at a call site is the mistake this arrangement exists to prevent**,
and it would also miss the swatches, which set the attribute on themselves and paint `bg-accent` to
show the hue they offer.

Two properties make that safe to hand to a user, and both are asserted rather than intended:

- **The accent cannot reach a view's colour.** `--color-tab` is not among the tokens these rules
  set, so the Studio stays violet and Quantise jade whatever the accent is — which is what keeps the
  page able to say *where you are* independently of what the primary looks like. A `--color-tab`
  added to one of those rules would win over the `[data-tab]` rule on the same element, and every
  view would light up in the accent.
- **The accent cannot change a contrast ratio.** Every hue is the default's *luminance*, not its
  lightness: OKLCH lightness is perceptual and its relationship to luminance depends on hue, so nine
  hues at one lightness would be nine different ratios against every panel and against the near-black
  every coloured fill carries its label in — `text-foundry-950` sits on `accent-strong` in the app's
  loudest button. Chroma is then the same fraction of each
  hue's own gamut maximum as the default is of its, per the wheel's rule. Derive a new hue by
  bisecting lightness against a gamut search, never by eye: the test that guards this fails on a
  0.003 nudge.

**The palette is one OKLCH hue wheel: ten stops, 36° apart, all at L 0.76.** Every colour in the
app is a position on it. That is a structural claim and it has to stay true, so three things follow:

- **Identity follows the view; interaction and status do not.** `--color-tab` is the active view's
  stop, and the surfaces that *belong* to a view take it — panel edges, section headings, the step
  chips, hover blooms, the dot grid, the ambient wash, the switcher's pill, and the primary action
  *inside* a panel (`action-tab`). Everything that means the same thing wherever it appears keeps
  its fixed role colour: form focus, the focus ring, the two floating glass surfaces, the chrome's
  own Copy Prompt, and `gold`/`emerald`/`rose`. Moving one across that line is how a page ends up
  with no stable vocabulary at all. **A button is on both sides of it**, which is the distinction to
  hold: "Copy Prompt" in the header is reachable from every view and is fixed indigo, while "Save",
  "Load preset" and "Download PNG" are local to the panel they sit in and take its colour.
- **Chroma is per-hue, and it is not a free parameter.** sRGB is much narrower in some hues than
  others, so one chroma across the wheel clamps the narrow ones onto the gamut surface and returns
  near duplicates. Each stop is 90% of the largest chroma its hue sustains at L 0.76. Adding or
  moving a stop means re-running the gamut search, not nudging a number until it looks right.
- **Lightness is what makes the stops interchangeable**, which is why a test pins all ten to 0.76.
  It is also why the selected tab's label is `text-foundry-950` and not `text-ink`: every stop is a
  *light* colour, so ink on one is two light tones a shade apart (~1.8:1), where near-black measures
  8.7:1 at the wheel's worst stop. Any new surface painted `bg-tab` needs dark text for the same
  reason.

**The rule is about the *ground*, not about the wheel, and `accent` is where it was missed.** Measure
every solid role fill this app paints — the three accent stops, `gold`, `rose`, `emerald`, the two
`neon`s and all ten stops on the wheel — and **no tone on the ink ramp reaches 4.5:1 on any of them**.
The best of the eighteen pairings is `text-ink` on `accent-strong` at 3.07:1; `text-ink` on `accent`
is 2.04:1 and `text-ink-muted` on it is 1.14:1, which is what the toast's dismiss ✕ wore, where it is
not dim but invisible. `text-foundry-950` clears AA on every one of them, its worst being 5.34:1 on
`accent-strong`. So the near-black is not the better of two workable choices — it is the only half of
the palette that can sit on a role colour at all, and **anything painted on a solid role fill takes
it**. None of those figures move with the accent the reader picked, because every hue holds the
default's luminance.

**A ground declares the ink once, for its whole subtree.** The toast is the case that shows why: its
message, its ✕ and its countdown bar all sit on the gradient, and each had been choosing a tone of
its own. `text-foundry-950` goes on the card and the three inherit it, which is the arrangement
`action-tab` already has — the utility sets `color`, and no call site restates it. A *translucent*
role fill is a different question and is not covered by this: at the alphas the app uses (10–30%)
the composite is mostly panel, and `text-ink` on one measures between 5.9:1 and 10.4:1.

`tests/design-tokens.test.ts` holds both halves, and it sweeps `src/` twice because one pass cannot
see both shapes. An element whose class string names a ground **unconditionally** must carry no ink
tone anywhere in its subtree — that is the toast, whose gradient is on the card while the offending
glyph was three children away. And a class string that names a ground must carry none *itself* — that
is one branch of a ternary at a time, which is how `SegmentedChoice`'s selected pill and a hoisted
class constant get checked at all. Run against the code before the fix, the first reports twelve
tones across nine components and the second reports eight.

**A view's colour is assigned on the element the `var()`s resolve against** — `data-tab` on the
shell in [src/App.tsx](src/App.tsx), and nowhere else. Custom properties are substituted at
computed-value time, so a `--color-tab` declared on `:root` in terms of another variable resolves
*there* and inherits down already resolved; a descendant re-declaring the input would change
nothing. That is also the mechanism a preset card uses to claim its own stop: it sets `--color-tab`
inline, and every `*-tab` utility inside it follows without one of them being told — and the one
the settings dialog's swatches use, each carrying `data-accent` so it paints in the hue it offers.
**Three attributes now sit on that shell for the same reason** — `data-tab`, `data-accent` and
`data-motion` — and a fourth thing decided by a custom property belongs there too, not on `:root`.

**The type scale is three rungs, and a component picks one — it does not name a size.** Tailwind's
stock ladder bottoms out at 12px, so for a long time anything this app wanted smaller was written at
the call site as a bracketed arbitrary value: 39 of them, 18 at 10px and 21 at 11px, sitting beside
70 uses of the stock `text-xs` at 12px. Three sizes within 2px of each other, only the largest of
them named, and nothing to consult about which a new component should take — so the guidance card's
paragraph landed on 11px while the label of the field it explains landed on 12px, and the
explanation rendered *smaller* than the thing being explained. The rungs are now defined in the
`@theme` block instead, 2px apart because 1px is not a hierarchy: **`text-2xs` (11px)** for what is
scanned, **`text-xs` (13px)** for what is read — the default — and **`text-sm` (15px)** for what
opens a panel. `text-base` and up are Tailwind's own and are the headings; **`base` is the
bold-heading rung and nothing else wears it**, which is the only reason it can sit 1px above the
lede without the two competing — so a bold heading goes on `base`, never on `sm`. **A bracketed
`text-[…px]` anywhere in `src/` fails a test** — not because the size is wrong, but because a call
site that names its own size stops moving when the scale does.

**An option label in a `SelectField` is at most 50 characters, and the layout owes it 442px.** A
native `<select>` sizes the selected option's box from its container and truncates rather than
wrapping, so a label the control cannot fit loses its *tail* — which in this app is the parenthetical
marking the standard choice, the half a first-time user is choosing by. The identifier is the
prompt's own term and cannot move, so the parenthetical is what gives; whatever doesn't fit belongs
in the tooltip, which has no width to run out of. 50 characters of `font-mono` at `text-xs`, plus the
42px the control keeps back for its border, padding and dropdown arrow, is **442px** — and
[tests/selectLabelBudget.ts](tests/selectLabelBudget.ts) is where both numbers live.

**The budget is the anchor and the layout follows it, never the reverse.** Deriving the budget from
whatever width a column happens to *settle* at says nothing about the widths it passes through on the
way, and that is exactly how the studio's split came to engage at `lg` while the column it produced
there was 434px: every select in the tab 8px short of its own longest option, at the one viewport
where the second column first appears. So a stock device breakpoint is the wrong instrument for a
split whose columns hold a select — `--breakpoint-studio` in [src/index.css](src/index.css) derives
1040px from the budget instead, and every class that decides whether those columns exist is prefixed
with it, the sticky preview included. Two tests keep the halves honest:
[select-option-labels.test.ts](tests/select-option-labels.test.ts) fails on an overlong label or a new
select nobody budgeted, and [studio-column-width.test.ts](tests/studio-column-width.test.ts) re-derives
the column from the grid, page and panel classes themselves and fails if the split engages before it
reaches 442px. **A new two-column layout that lands a select in a column needs its own derivation** —
1040px is this grid's answer, not a general one.

**The quantiser is the second split, and it derives a different number from the same budget.** Its
control column is beside a sticky preview column for the reason the studio's form is, and
`--breakpoint-quantise` lands at **1224px** rather than 1040px because the two tabs share out the
width differently: both of the studio's columns hold a select, so an even split has to clear 442px
twice, while all three of the quantiser's are on the left and the preview column holds none — which
is what pays for a 5/7 split, and why the tab spends the whole of `main`'s cap instead of holding
itself to `max-w-6xl`. The derivation is shared rather than copied
([columnSplit.ts](tests/columnSplit.ts) parses the grid, page, span and panel classes; each tab's own
test states which column has to clear the budget), and
[quantise-column-width.test.ts](tests/quantise-column-width.test.ts) adds the claim the asymmetry
rests on — it follows the preview column's imports and fails if a `SelectField` ever appears in
there, because that would invalidate the breakpoint without breaking anything visible.

**A panel that becomes a column stops being described by a viewport breakpoint.** The derivation
above measures a column; a `sm:`/`lg:`/`xl:` class *inside* one measures the page, and the two
parted company the moment the quantiser split — the comparison panel's two-up pane grid was on `lg:`,
reading a 1400px viewport while the box it governed was 674px. Nothing looked broken, because both
numbers fall the same side of 1024; the class had simply stopped measuring what it decides. **A
layout class inside a split column belongs on a container query**, as
[SubjectForm](src/components/studio/SubjectForm.tsx) already had it and
[ImageComparison](src/components/quantise/ImageComparison.tsx) now does. Its threshold is bounded
rather than picked: the narrowest that box ever gets is the column at its own breakpoint, which
`quantise-column-width.test.ts` re-derives and holds the threshold under.

**A category's option pool is written in title case, and `NONE` is the only value that may shout.**
The pools in `src/constants/categories/` are two things at once: the suggestions a `ComboBox`
offers, and the text section 1 of the prompt carries verbatim. That makes casing visible in the
studio, where one field's values sit directly under another's — and the `anatomy` pool was in full
capitals in all nine categories, so `STANDARD HUMANOID` sat one row under `Athletic & Slender` in
the same column. Five of those nine pools came over from the original single-file app
([docs/todo/sprite-gubbins.html](docs/todo/sprite-gubbins.html)) carrying the capitals, and the four
categories this app added later followed the four already there. `NONE` is exempt because it is a
**sentinel** standing for "this subject has none" rather than a description of anything — the two
`clothing` pools that offer no harness or holster spell the same word for the same reason, and
`additional_anatomy` names it as `NO_ADDITIONAL_ANATOMY`. The exclusions pools are the other
deliberate departure: each option is a negative statement rather than a name, so they stay sentence
case.

**Every word takes a capital — the function words included.** `Head And Shoulders Only`,
`Nautical Age Of Sail`, `Tower With Detachable Roof`, `Primary Call To Action`. Both spellings are
defensible in isolation, and for a while the pools carried both: eighteen mid-title function words
capitalised against five that were not, so `Relic of Lost Era` sat forty-seven lines from
`Nautical Age Of Sail` in the same file. Only that one came over from the original single-file app —
the other four were written for `effect` and `terrain`, two of the categories this app added later,
which is the direction this drifts if nothing checks it. **A hyphenated compound capitalises both
halves** for the same reason and by the same lopsided count — `Pocket-Sized`, `Battle-Scarred`,
`Nine-Slice`, 101 of the 103 that existed when the rule was settled.

The majority spelling is what decided it, but the tie-breaker was that this half of the choice is
the one a test can hold: capitalising everything has no judgement in it, whereas lower-casing short
function words needs a hand-kept list and *still* cannot tell a preposition from the particle of a
phrasal verb — `Frozen Over` and `Charging / Spooling Up` keep their capitals under either style.

**Both halves are machine-enforced, and the second one is easy to miss.**
`src/constants/categories/categories.test.ts` fails on an all-capitals option that is not the
sentinel, and on any option whose word opens in lower case. Three positions are not words for that
purpose and need no exemption: the rest of a word, the `s` of a possessive (`Surgeon’s`), and
anything opening with a digit (`#06B6D4`, `16-Bit`, `(20s)`).

The second half is in `src/constants/presets/presets.test.ts`, because **a pooled value is written
down twice**: once in the pool that offers it and once in every preset that names it. All eight
options re-cased for this rule were pinned in a preset too, and a preset left behind still loads and
still compiles — the combo boxes are unfiltered — it just carries the retired spelling into section
1, which is the inconsistency the re-casing was for. So a preset value that matches a pooled option
in every respect *but* case is a failure. Deliberately not membership: sixty-two preset values are
free text no pool offers, and `Domed lid over a banded body` is sentence case because it is a worked
example's own wording rather than a name the app suggests.

**Four rules of thumb**

- If a token *doesn't* exist for a genuinely new semantic role, **add the token** to the
  `@theme` block in [src/index.css](src/index.css) rather than hard-coding the value at the
  call site. One definition, restyleable in one place. A literal written at the call site also
  bypasses the two reduced-motion catch-alls at the bottom of that file — the media query for a
  system preference, and the `[data-motion='reduced']` block for the in-app setting. **Those two
  carry the same declarations and have to keep carrying the same declarations**: CSS offers no way
  to write them once, so a test compares the sets rather than trusting that whoever edits one will
  remember the other.
- **The colour-swatch surface is the deliberate exception.** `ColorSwatch` renders whatever
  hex `parseColorFromText` resolved — a colour that is not the app's, so it takes its value as a
  prop via inline `style`. **It is the only component that may**, and the way to show any other
  colour is to hand it this one: `PaletteField`'s swatch strip passes a bare `#0F380F`, which
  `parseColorFromText` resolves to itself, rather than reaching for a second inline `style`.
  Files under `src/constants/` hold raw hex for the same reason, and **the exemption is what the
  colour *is*, not which file it sits in**: a colour the app **names but never paints with** is
  **domain data** — the vocabulary the prompt compiler understands — and it cannot be a token,
  because a token is a value this app renders and each of these is a value it *talks about*. Six
  paths hold them, and they are one rule applied six times rather than six exemptions:

  - `COLOR_HEX_MAP` in `src/constants/colors.ts` — the colour names a subject field may use.
  - `src/constants/palettes/` — the colours real hardware could display.
  - `src/constants/categories/` — the colour options each category's own fields offer.
  - `src/constants/presets/` — the pooled values a preset pins.
  - `src/constants/output/choices.ts` and `src/constants/promptText/sheet.ts` — the background key,
    named to the reader and stated verbatim in the compiled prompt.

  **A new colour option goes beside the field that offers it**, in that category's own pool — not
  in `colors.ts`, which is the shared vocabulary `parseColorFromText` resolves rather than a drawer
  for every colour in the app. That is the rule the guidance copy already follows, for the reason it
  gives: an option list and the thing that names it drift apart the moment they are filed apart.
  [tests/raw-colour-literals.test.ts](tests/raw-colour-literals.test.ts) holds the boundary. It
  blanks the comments out of every file under `src/` — most of the hex in this repository is prose
  explaining a key colour — and fails on a literal outside those six, so a component reaching for
  one is caught when it is written rather than in review. A colocated `*.test.ts` is outside it
  too, because a fixture pixel never renders; the component that pixel exercises is still scanned,
  which is the half that decides whether the app took a token. It also fails if one of the six
  stops carrying any, which is what stops the list rotting into a permission nobody uses.
- **The two files that paint into pixel data are the third, and they are exempt on a different
  ground.** The two above are colours that are not the app's; `src/constants/differenceRamp.ts` holds
  four that **are** — the page ground, `emerald`, `gold` and `rose` — and
  `src/constants/spriteMarker.ts` holds two more — the ground again and `ink` — because both are
  painted into **pixel data**. A pixel has no element to carry a class, and the code that writes it
  is a pure function in `src/utils/`, where reading a computed style is banned outright. So the
  exemption is only from the *mechanism*, never from the palette: each stop names the token it
  mirrors and states the same `oklch()` triple `index.css` states, `oklab.ts` resolves it to bytes,
  and `tests/design-tokens.test.ts` reads the stylesheet and fails if the two part company. **A new
  colour chosen here rather than mirrored is the thing this row forbids**, and so is a third file
  claiming the exemption for something that does have an element to put a class on.
- **A colour written into another application's document is the fourth, and it is the first row's
  ground rather than a new one.** `ASEPRITE_TAG_COLOR` in `src/constants/aseprite.ts` is the colour
  every tag of an exported `.aseprite` file carries, and it is a colour that is **not the app's** —
  the same footing `src/constants/palettes/` stands on. A tag bar in another editor's timeline is not
  a surface this app is styling, and there is no element for it to be a class on, so it deliberately
  mirrors **no** token: pinning it to the palette would make an edit to `index.css` change the
  contents of a file somebody already exported. That is the test for anything joining this row —
  the colour has to leave the app inside a file, and mirroring a token has to be actively wrong
  rather than merely inconvenient. Nothing else gets to claim any of the four exemptions.

**Unknown Tailwind utilities fail silently** — no CSS, no error, no warning. A typo'd
`bg-foundy-800` simply renders unstyled. When a change introduces a token-based utility,
verify it actually emits: build and grep the output CSS for the class name before trusting it.

**The motion layer is deliberately slow, and it moves as one.** Every duration in the app — the
`--animate-*` tokens, `section-reveal`, and every `duration-*` at a call site — has been taken
through two whole-layer passes, **1.5× and then a further 1.3×**, so it now runs at **1.95×** what
it first shipped with. This is a tool for making game art, and motion that is over before it is seen
buys none of that. The figures are therefore *relative* to each other and not independently chosen:
a new transition written at the stock 200ms would run at roughly twice the speed of everything
beside it. Pick a duration by finding the nearest thing that already moves and matching it. Two
pairs have to stay equal — the tab pill and the `[data-tab]` sweep are one event at 1440ms, and the
disclosure's height and its caret are one gesture at 585ms — and each says so at both ends.

**The layer has a default, and a bare `transition-*` is now correct rather than fast.** Tailwind's
own `--default-transition-duration` and `--default-transition-timing-function` are set in the
`@theme` block to **390ms** and `--ease-emphasized`, so a `transition-colors` written with nothing
beside it runs at the base rung on the signature curve. Before that they were left alone, which put
**36 of the app's 121 transition class strings**, across 21 files, on the stock 150ms and the stock
`cubic-bezier(0.4, 0, 0.2, 1)` — every button in the history drawer, every row of `SegmentedChoice`,
the preset cards, the atlas calculator — 2.6× faster than the commonest figure in the app, inside
panels that eased. A default is the fix rather than 36 values, because **the value written at a call
site is the thing that goes missing**. So write a `duration-*` only where the base rung is the wrong
one — a panel answering a drag takes 585, as both drop zones do — and say at the call site why.

**The default is the entrance curve, so a transition whose *travel* is the information names its
own.** That is the `ease-decelerate` row above, and the disclosure is the one place in `src/` it
applies: the caret turns with a height that runs on that curve, so **both ends state it**, exactly as
the tab pill and the `[data-tab]` sweep both state `ease-emphasized`. That pairing is the one reason
a call site may restate what the default already gives it. Everything else that scales is a hover
bloom or a press — decoration, where the travel is felt rather than read — and the signature curve is
what those should have had all along.

`tests/design-tokens.test.ts` holds the mechanical half: the two theme variables are asserted by name
against the stylesheet **with its comments blanked**, so the paragraph explaining them cannot satisfy
the assertion that they exist; and **every `duration-*` under `src/` has to be one of the six rungs**
(293 / 390 / 585 / 975 / 1365 / 1440). The reduced-motion catch-alls still win over the default, since
it and a `duration-*` compile to the same declaration and both blocks carry `!important`.

**A whole class name may not be spelled in a comment.** Tailwind scans `src/` and `tests/` without
caring what is code, so a class written in prose is a candidate the build emits — which is how a
*retired* figure puts itself back into the bundle as dead CSS, as `.duration-500` did from
`TabSwitcher`'s note on the pill's old speed. The rung scan therefore reads the **raw** source rather
than blanking comments, which is what lets it catch that at all; the record stays honest by writing
the figure and the utility in two halves, as that note and the test's own docblock now do.

**A page transition is the app's second speed, and it is a `view-*` token rather than a number.**
Navigating is worth dwelling on, so the second pass gave it 1.6× where everything else took 1.3× —
putting the view entrances, the `[data-tab]` colour sweep, the tab pill and the preset grid's
stagger at **2.4×** the shipped figure against the 1.95× above. That distinction is about *when* an
animation fires, not what it looks like, which is why it could not be carried by `fade-in` and
`pop-in` themselves. Each of those
lands on two different kinds of moment: a panel fades in when you navigate to the studio **and**
when a budget notice appears mid-edit; a tile pops in as the preset library fills **and** as the
"Split into sheets" button turns up. `animate-view-fade-in` and `animate-view-pop-in` run the same
keyframes at the slower figure, and the test of which one a surface takes is not where it sits but
what makes it appear: **anything that can turn up while the user is working takes the ordinary
entrance.** `ComboBox`'s suggestion list is the case that proves it — it wears `fade-in`, and at the
page-transition speed it would simply be a slow dropdown.

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

**The wheel is a hairline, not a fill — and there is exactly one image of it.** `--spectrum-wheel`
in the base layer is the gradient; `bg-spectrum` paints it neat and `heading-spectrum` paints it
under a veil of `ink`, and neither restates the eleven stops. Volume is the reason for the split:
the spectrum reads as a signature at one pixel high and as noise at forty, so the wordmark and the
logo tile both used to shout — a rainbow behind the app's own name, in the corner the eye lands on
first, cycling every 32 seconds. The veil is an **image layer over** the wheel, never a
`background-color`, which is painted under every image and would show through nothing. A surface
that wants the palette without the volume takes the veiled form or takes `--color-tab`; filling a
block with the neat wheel is the mistake this row exists to name.

**A `background-position` percentage is not a fraction of the image.** It resolves against
*(positioning area − image size)*, so a gradient sized `S%` of its box travels `P/100 × (S − 100)/S`
of its own width as the position runs to `P%`. A pan loops seamlessly when that comes to **exactly
one image width**, and `spectrum-pan` — sized `200%` — ended at `100%`, which is half of one: the
wheel restarted five stops round from where it finished, a one-frame flick in the chrome's hairline
every 32 seconds, which is why it survived so long. At `200%` the seamless end position is also
`200%`, and those two numbers agree at that size and no other (`300%` closes at `150%`, and would
turn the wheel twice a cycle if written `300%`) — so reach for the formula, never the coincidence.
Two further conditions are cheap to meet and silent to lose: the image must be **wider than its
box**, or the range is zero and nothing moves at all; and the gradient must **repeat its first stop
at the end**, because `background-repeat` is `repeat` and each tile's right edge sits against its
own left edge. Both were already true of the broken version — they are necessary, not sufficient.
`tests/design-tokens.test.ts` computes the travel from `bg-spectrum`'s own `background-size` and
fails unless it is one image width.

**A floating surface goes in the top layer, not up a `z-index`.** `glass-panel` is on every panel
in the app, and its `backdrop-filter` makes each one a **stacking context** — so a `z-index` on
anything inside is only ever compared with that panel's own contents, and the next panel down the
page paints straight over it. No value fixes that, because the two are no longer being compared;
the reported symptom is a dropdown sliced in half by the card below it. The same ancestor is also a
containing block for fixed-position descendants, so `position: fixed` doesn't escape it either, and
an `overflow` ancestor (the atlas calculator's scrolling panel) clips the surface whatever it is
positioned against.

`showPopover()` answers all three, and is how `ComboBox`'s suggestion list and the guidance card that
`Tooltip` and `ControlTooltip` share both reach the page: the top layer is not clipped, paints above
the whole document including an open modal `<dialog>`, and resolves `position: fixed` against the
viewport. `useAnchoredSurface` owns
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

## Every control carries guidance, and there are two ways to show it

A control this app puts on screen is a control it owes an explanation. The vocabulary is technical
by necessity — `CORE_DIRECTIONAL_VARIANTS`, a pixel grid, an identity lock — and a reader who
cannot tell what a button will do to their configuration will not press it, or will press it once
and lose work. So **a new control ships with comprehensive guidance or it does not ship**, and
"comprehensive" is three things in one paragraph: what the control *is*, what it changes — the
compiled prompt, the studio, stored data, or nothing at all — and why anyone would reach for it.
Naming what a control does **not** touch is worth as much as naming what it does; half the
questions a prompt tool raises are "does this end up in the text I paste?".

**Which form a control takes is decided by what the control *is* — never by how much room is left.**

- **Anything holding a value takes `Tooltip`**, the ⓘ beside its label: a field, a select, a
  checkbox, a search box, a name box. A value is worth an affordance a reader can *see* before they
  know they need it, and worth a target a finger can tap. Every field primitive carries one already,
  so it comes free — `TextField`, `NumberField`, `SelectField`, `CheckboxField` and `ComboBox` all
  take a `tooltip` prop and there is nothing to wire up.
- **Anything that *does* something takes `ControlTooltip`**, which hangs the same glass card off the
  control itself and shows it on hover or keyboard focus. Actions, navigation, confirmations,
  choosers — around fifty of them, and **an ⓘ beside each would be fifty more glyphs in rows that
  are already full**, in a header that wraps on a phone and card footers three buttons wide.
  Hovering a control is what a tooltip has always meant; that is the trigger, and the card is the
  same card. `FilePickerField` is on this side of the line and not the one above: it is a button
  that opens a file dialog, not a box holding a value.

**That line is load-bearing, not tidiness.** `ControlTooltip` reveals on focus only when
`:focus-visible` matches, because a press focuses what it lands on and an unconditional reveal would
undo the dismissal the press just latched — every button in the app answering a click by opening a
paragraph under itself. The selector answers "did the keyboard bring me here" for a control and
**does not answer it for a value box**: it matches a text field however that field was focused. So a
search box wrapped in `ControlTooltip` opens its card on a click and holds it over the results it is
filtering, and a box that is focused as it appears — `PresetDetailsForm`'s name box — opens one unasked. Put a
value on the ⓘ and none of that arises.

**Do not add a second ⓘ to a control that already reads as one thing.** The mistake this rule
exists to stop is a button growing an information glyph beside it, which doubles the number of
targets in every toolbar and reads as though the glyph were a second action.

**One card, one implementation.** `TooltipCard` is the surface, `useTooltipReveal` is the state
machine — hover, focus, the Escape latch, the outside press — and `useAnchoredSurface` puts the
card in the top layer and decides which side of the anchor it opens on. All three are shared by
both triggers, deliberately: WCAG 1.4.13 asks for *dismissible*, *hoverable* and *persistent*, and
a second implementation is where one of those quietly becomes "Escape works while the trigger has
focus". **Never re-style a floating panel to look like the guidance card**, and never reach for a
`title` attribute in its place — it is unreachable by keyboard, untouchable by pointer, and on the
platform's own timer. (`Wordmark` carries one, and is not the exception it looks like: it is a
*link*, it warns that following it leaves the app, and it pairs the attribute with the screen-reader
text saying the same thing. That is `ExternalLink`'s warning, not guidance about a control.)

Three details of `ControlTooltip` are worth knowing before using it:

- **It wraps the control in a `<span>` that takes the control's place in the layout.** So anything
  the control was saying about its own box in a flex or grid parent — `ml-auto`, `flex-1`, `w-full`,
  an absolute placement — moves out to the wrapper's `className`, and the control is told to fill
  it. That prop **replaces** the default `relative inline-flex` rather than adding to it, because
  two `display` or two `position` utilities on one element resolve by where they land in the
  generated stylesheet, which no call site can see.
- **A press dismisses.** The ⓘ toggles on a press because revealing its card is its only job; a
  wrapped control is the thing the press was *meant* for, so the guidance stands aside rather than
  sitting under the pointer describing a button already used.
- **It cannot be reached by touch**, because a tap on a control runs the control — the second reason
  a value keeps its ⓘ. The compensation is `aria-describedby`, which `ControlTooltip` puts on the
  control while the card is up, so a screen reader announces the guidance on focus however the
  pointer situation stands. A **`disabled`** control is thinner still: it dispatches no pointer
  events and is out of the tab order, so the wrapper takes the pointer events off it to recover the
  hover, and nothing recovers the keyboard route.

**Everything else on screen carries a card, and the exceptions are these — each for a reason
recorded at the control itself, which is the treatment anything added to the list needs too:**

| What | Why it carries none |
| --- | --- |
| `CollapsibleSection`'s section headers, `SheetSplitRun`'s prompt disclosure | A `<summary>` has to be the **first child** of its `<details>`, so a wrapper round it stops it being the disclosure's control. Both already name and describe themselves through `aria-labelledby` / `aria-describedby`. |
| `Toast`'s ✕ | The surface is on a three-second timer and goes `inert` for its exit, so a card anchored to it outlives its anchor — and a ✕ on a notification needs no explaining. |
| `SegmentedChoice`'s pills, `ComboBoxOption`'s options | Each is one **value** of a setting, not a control; the ⓘ on the setting above explains all of them at once, and a card per value is one explanation in ten places. |
| `SkipLink` | Its own text is the whole explanation, and `ControlTooltip` reveals on `:focus-visible` — which is the only way this link is ever reached, so a card would open on the first Tab of every keyboard session, over the chrome the reader is leaving. |
| `ComboBox`'s chevron | Not a control at all — `tabIndex={-1}`, `aria-hidden`, and a pointer-only duplicate of what the field it sits in already does. |

**The copy is content, so it lives in `src/constants/` and is written like content.** A setting's
guidance sits with the options that setting offers — `constants/output/tooltips.ts` beside
`choices.ts`, `SETTINGS_TOOLTIPS` beside the defaults — because an option list and the sentence
explaining it drift apart the moment they are filed apart. An action has no option list to sit
beside, so those live in `src/constants/tooltips/`. Two rules on the writing itself:

- **Natural English, in the voice the rest of the app is written in.** Plain declarative sentences,
  British spelling, concrete nouns, and the reader addressed as "you". No marketing register, no
  rhetorical triads, no "not just X but Y", no sentence that exists to introduce the next one.
  Read it back as though a stranger were reading it over your shoulder, because on a public site
  one is.
- **Typographic punctuation**, as every other string in the bundle uses: `’` and `“ ”`, never the
  straight ASCII forms.

`src/constants/tooltips/tooltips.test.ts` holds the mechanical half — a length floor that catches a
three-word stub, prose shape, the punctuation above, and that no two controls share a sentence,
which is the copy-paste that leaves one of them describing the other and is invisible in review.
Whether the words are *true* is still yours.

**It finds the guidance rather than listing it**, because guidance is filed in two places and a
hand-kept walk only ever tracked one. Its imports were the six sets in `src/constants/tooltips/`,
which left 190 entries unchecked — every setting's guidance, filed beside its options — and two
`ATLAS_TOOLTIPS` entries reached the bundle carrying three straight apostrophes between them, past
the assertion written to catch them. So every `*_TOOLTIPS` record under `src/constants/` is
discovered by an `import.meta.glob`,
and a set named that way which is *not* a record of sentences fails rather than being skipped. **A
new set is checked the moment it is named**, wherever it is filed — but only the record shape is
discoverable, so guidance that comes from a function or hangs off a list (`accentSwatchGuidance`,
`APP_TAB_CHOICES`, `TARGET_MODELS`, a category's sixteen fields) is still named in that file, and a
new shape of guidance has to be added to the walk by hand.

**What counts as guidance is the surface, not the prop.** `TARGET_MODELS[].description` is walked
because it is a control's own explanation rendered under the control instead of behind its ⓘ — the
same words held to the same rules, shown a second way. The quantiser's `QUANTISE_SCALE_GUIDANCE` and
`QUANTISE_RESULT_PLACEHOLDER` are not, and they read as though they should be: they describe the
state of *the user's image* — what the scale reader found, what the empty pane is waiting for — and
one of them is an ellipsis rather than a sentence. A control is what this suite is named for.

## Prompt text is the product, and it is written to rules

The app's whole output is prompt text for image-generation models, and that text is a **contract,
not copy**: editing one sentence changes the artwork every user gets back. The reported failures
this section exists to prevent are real ones — trunk sheets coming back wearing limbs the inventory
never listed, and "directional" views delivered at one angle with the details moved. Every rule
below was bought with one of those.

- **Where the words live.** The template skeleton is `src/constants/promptTemplate.ts` (mirrored
  verbatim into `docs/todo/baseline-prompt-new.md` §3 — a test compares them character for
  character, so change both in one commit). Per-option prose lives in `src/constants/promptText/`
  (`[DEFINE:FOO_DESCRIPTION]` is filled from `FOO_TEXT`; a test walks the pairing). What a sheet
  *contains* lives in `src/constants/sheetPlans/`, keyed by category **and** mode. Per-target
  wrappers live in `utils/modelWrapperText/`, one file per target, and every wrapper line must trace
  to something the target's **vendor documents** — a flag syntax, a negative-prompt channel, a
  documented rewrite — never to symmetry or vibes. A target being re-checked touches only its own
  file, which is what keeps the vendor citations that justify each clause readable in a diff.
  **Every one of those four writes typographic punctuation** — `’` and `“ ”`, the same rule the
  guidance copy follows. The one exception is the JSON manifest example, which a model is asked to
  reproduce rather than to read: a curly quote in a key produces a document that does not parse.
  **The check is on the compiled prompt, not on the four files**, because that is the one place all
  of them meet — `promptCompiler.test.ts` sweeps every category, target, mode, direction set, sheet
  index, render style, rig mode, resolution profile and surface detail, plus the presets, and fails
  on a straight apostrophe or double quote anywhere but that example. A per-file check is a list
  somebody has to remember to extend, which is exactly how the sheet plans went unchecked while the
  template was being fixed. `promptTemplate.test.ts` keeps a static half beside it, because the
  template holds conditional blocks no configuration in that sweep necessarily reaches.
- **Derive every fact that two places state; hand-write none of them.** The component count is
  summed from the inventory's own entries; a plan's facings, its counts and section 3's yaw list
  are all built from the one facing tuple; the series list in section 6 is enumerated from the same
  batch the split drawer shows. A number or facing name written twice by hand *will* drift, and the
  generator resolves the contradiction however it likes — that is what a "silently wrong sheet" is.
- **A setting the compiler discards is a defect, not a simplification.** Every Output Configuration
  control must reach the compiled prompt as stated, or not be on screen. The Directions control
  steers the directional core (the plans are functions of the chosen set) and is the run list for
  every `'run'` sheet; `resolveMode` / `resolveDirectionSet` / `resolveSheetIndex` /
  `resolveProjection` / `resolveStyleReference` degrade stored values a category cannot honour, and
  the digests report the resolved answer, never the raw field.
- **State geometry, not adjectives.** A direction is an object yaw in degrees beneath a fixed
  camera, plus what that yaw *occludes* — a name like "side view" is satisfiable by a three-quarter
  view with moved details. A part is defined by where it **ends**: the trunk-termination paragraphs
  in the character and creature plans name the joins (neck, shoulders, waist, hips) because a
  generator's prior for "torso" includes arms, and only the named boundary stops it.
- **One prompt must never disagree with itself.** Section 4 may not require what section 8 forbids
  (exclusions, guards and audits are per-category for exactly this reason); an inventory may not
  name views section 3 does not list; anatomy appears only on the sheet that counts it. When adding
  a rule, grep for the sections that state its neighbours and check the pair under every category
  and every direction set — `sheetPlans.test.ts` and `componentSet.test.ts` walk all of them.
- **Respect the ceiling and the reader.** `PRACTICAL_COMPONENT_CEILING` (43) bounds one generation;
  a multi-view sheet carries at most five views, and the eight-compass core splits into cardinals
  and diagonals (`coreFacingChunks`) because eight adjacent yaws on one page is exactly what a
  generator blurs together. Sections that a target cannot act on (self-audit, manifest, adherence
  report) are gated on its declared capabilities in `constants/models.ts`, never emitted on faith.

## Architecture: the spec's structural laws

These are the spec's guardrails, restated here because they govern every change, not just the
initial build. They are not stylistic preferences.

- **No monolithic files.** Target **under 150 lines**. A file heading past that is telling you
  it has taken on a second responsibility — split it.
- **One thing per file.** Every component, hook, store, utility and type definition lives in
  its own dedicated file, named for the thing it exports.
- **Separation of concerns is directory-enforced.** Domain and compiler logic in `src/utils/`;
  state in `src/stores/`; persistence in `src/db/`; browser-effect and shared-interaction hooks in
  `src/hooks/`; worker entry points, their protocols and the near side that speaks them in
  `src/workers/`; constants in
  `src/constants/`; types in `src/types/`; UI primitives in `src/components/common/`; studio panels
  in `src/components/studio/`; the quantiser's image panels in `src/components/quantise/`; modals in
  `src/components/modals/`; tab views in `src/components/tabs/`; chrome in
  `src/components/layout/`. A file in the wrong directory is a design error, not a filing error.
- **`src/workers/` holds threads, not logic.** A file there is a `new Worker(…)` target, the message
  protocol its two ends share, or the **near side** that owns the instance and files its replies — a
  thread to run work on and the vocabulary for asking, never the work itself. The quantiser's
  pipeline is the example: every line of the transform stays pure in `src/utils/`, everything the
  worker has answered is state in `src/stores/`, and `quantiseWorker.ts` and `quantiseSession.ts` are
  the two ends of the wire between them. (The database's worker is the exception that predates the
  directory and stays in `src/db/` with the rest of the persistence layer — near side and all —
  because it *is* that layer rather than a thread something else was moved onto.) **No thread is
  owned by a component**, and the quantiser's says why in its own file: `App` swaps the whole view on
  navigation, so a thread started by a `useEffect` is terminated and restarted on every trip, and a
  new thread holds nothing — so whatever it was given has to cross the boundary again.
- **A thread's *lifetime* is decided by whether it has anything worth keeping**, and the three in
  `src/workers/` answer that differently on purpose. The quantiser's is kept for a whole session
  because the sheet crosses once and every dial afterwards is three small numbers. The sheet writer's
  (`sheetWriteWorker.ts` / `sheetWriteSession.ts`, which runs `utils/writeSheet.ts` — a PNG, an
  `.aseprite` document, a sprite pack or a manifest) is started per download and ended by its own
  answer, because what it writes is the
  *result*, which changes under every dial — so it would cross the boundary on
  each press whatever the thread's lifetime, and a thread that ends with the job needs no correlation
  ids and no lifecycle to keep in step with the tab. The auto-tune sweep's
  (`autoTuneWorker.ts` / `autoTuneSession.ts`) is the same per-press shape for the same reason, and
  it is the one that says why the quantiser's is not simply *reused* even though it already holds the
  sheet: a sweep queued behind that thread's message loop stalls the preview the reader is watching,
  and a second clone of the sheet per press is tens of milliseconds against a sweep of seconds.
  **State that has to outlive the view it was started
  from belongs in `src/stores/`, never in the component that asked for the work** — `useSheetWriteStore` exists
  because a "writing" flag held in the download's own component came back false when a reader
  navigated away and back, offering a button that was already busy.
- **A per-press thread has to be *ended* by whatever disowns it, not merely forgotten.** The flag
  that says one is running is also what stops a second starting, so anything that clears the flag
  from outside — a new sheet arriving, the tab being cleared — has to stop the thread in the same
  breath, or it re-enables the button beside work that is still running and holding its own copy of
  the sheet. `abandonSweep` in `autoTuneSession.ts` is where that pair lives, called from
  `useQuantiseStore` exactly where `releaseSheet` is called for the quantiser's thread; the near side
  keeps a reference to the live worker for no other reason. A correlation number that only makes the
  answer *discardable* is the half that looks sufficient and is not.
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
- **DRY.** Reuse the primitives in `src/components/common/` rather than re-styling a bare element:
  `TextField` / `NumberField` / `SelectField` / `CheckboxField` / `FilePickerField` for form
  controls, `ComboBox` for a typed-or-chosen value, `Tooltip` and `ControlTooltip` for the two ways
  a control's guidance is shown, and `ColorSwatch`, `Badge`, `Toast`, `Modal`, `ExternalLink` for
  the rest. A second, subtly-different implementation of a solved problem is the failure mode to
  watch for.
- **Completeness.** Never write `// TODO: add remaining fields`, `/* rest of options here */`,
  or a stubbed function body. Every category, field, option, tooltip and compiler rule ships
  whole or not at all.

## Do the whole fix, never the cheap one (mandatory)

Every fix arrives with a cheap version attached. The review finds a bug in one branch and the
narrow patch fixes that branch; the bug is in the shared helper three of them call. A guard
suppresses the symptom where it was reported and leaves the other four call sites reaching the
same broken state. A special case handles the input in the failing test and the general case still
returns nonsense. The cheap version is always the one that is quicker to write, smaller to review
and easier to justify — and it is the reason the same defect gets found again a month later,
wearing a different symptom.

**The rule:** when you decide *how* to fix something — a review finding, a bug you tripped over, a
gap you noticed while working elsewhere — take the correct, complete, root-cause fix. Never choose
an approach because it is quick, easy, or touches fewer files. Surface area is not a cost worth
optimising against; a wrong or partial fix is.

**What "the whole fix" means in practice:**

- **Fix the cause, at the level it lives.** If the defect is in a shared utility, fix the utility
  and let every call site benefit — don't patch the one caller that reported it. If the type
  allowed the invalid state, narrow the type; if the invariant was never expressed, express it.
- **Fix every instance, not the reported one.** Grep for the pattern before you finish. A bug found
  in one component is a bug in the three that were written by copying it, and landing one of four
  is how a defect survives being fixed.
- **Update everything the change implies, in the same commit.** Call sites, types, tests, tooltips,
  constants, the token table, the docs paragraph that now describes the old behaviour. A change
  that leaves its own documentation lying is not finished.
- **Cover the new behaviour with a test that would have caught the original.** A fix with no test
  is a fix waiting to be re-broken.
- **Delete what the fix supersedes.** The pre-1.0 policy below is the same instinct: the old path
  goes, it does not linger behind a branch.

**Three things this rule is not:**

- **It is not a licence for scope creep.** "Complete" is measured against the defect, not against
  everything you noticed nearby. An unrelated improvement found on the way is raised, or done as
  its own change with its own commit — not smuggled in because the file was already open. Deciding
  *whether* to fix something is a scope judgement and stays one; this rule governs *how*, once the
  answer is yes.
- **It is not a licence for speculative generality.** The complete fix is the one that makes the
  code correct, not the one with the most abstraction. YAGNI above still holds: a factory, a
  config knob or a plugin seam added "while we're here" is a different failure with the same
  excuse. Powerful means the cause is gone, not that the machinery is bigger.
- **It is not "fix it badly rather than raise it".** If the correct fix is genuinely too large for
  this change, or needs a decision that isn't yours, say so plainly and leave the defect
  documented — an open issue naming the root cause beats a patch that hides it. What is banned is
  the third option: shipping the narrow version and describing it as fixed.

**When you catch yourself reaching for the cheap fix**, the tell is the justification. "Minimal
change", "safer to keep the blast radius small", "the rest is out of scope for this bug", "we can
generalise it later" — each is a reason to do less work, dressed as engineering judgement. In this
repository they are not accepted. Do it properly, and say what it cost.

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
  instead, onto **the responses this origin serves and no others**, and
  [public/coi-bootstrap.js](public/coi-bootstrap.js) reloads the page once after that worker first
  takes control. **The first visit is never isolated**; it becomes so on the reload.

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
  system faces rather than fetching a webfont, as the original single-file app did. **The worker
  must never hand out that opt-in**, and for a while it wrote
  `Cross-Origin-Resource-Policy: cross-origin` onto everything it proxied, including a live network
  response from a host that had set no CORP at all — the page's own worker answering a question
  that was asked of somebody else. **Measured, it granted nothing**: driven in Chromium against a
  host sending no COOP/COEP, a plain `<script src>` is blocked and a `crossorigin` one loads, both
  before and after the fix, because a no-cors response reaches the worker *opaque* (`status === 0`,
  already returned untouched) and a CORS-mode one is exempt from the CORP check altogether. So what
  the same-origin gate in [src/utils/isolationHeaders.ts](src/utils/isolationHeaders.ts) corrects is
  the posture, not a live hole — and it is one line of `respond()` away from mattering, because a
  fallback that re-fetched a no-cors request in CORS mode would hand the opt-in out for real. The
  app's own assets take `same-origin`, which is what a missing CORP already means for them.
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

## The test sprite sheets live in `test_sprites/` (mandatory)

Anything that needs a **real** sprite sheet — driving the quantiser in the browser through the
`verify` skill, a scratch decode that measures a dial, a screenshot for an issue — takes one of the
eight sheets in [test_sprites](test_sprites). They are generated output from the models this app
writes prompts for, so they carry what a reader's own sheet carries: a resampled grid, a noisy key
colour, and dimensions that divide into nothing.

**`armour.png` moved here from the repository root**, and it is still *the reference sheet*: every
calibration figure in `src/constants/quantiser.ts` and `src/constants/autoTune.ts` is measured on it
and each docblock names it as `test_sprites/armour.png`. A figure re-measured on a different sheet is
a different claim and has to say which sheet it came from. **Nothing else moves it** — the point of a
reference is that the ladders stay comparable across changes.

**The other seven exist so a recalibration can be checked against a sheet it was not tuned on.** A
dial fitted to fifteen armour pieces on a 1254² page is fitted to one layout, one palette and one
subject; the terrain tiles are flat colour with hard edges, the UI sheet is thin strokes and
gradients, and the vehicles are dense rust texture. Those are three different things to get wrong,
and they are on different sheets on purpose.

| Sheet | Size | What it holds |
| --- | --- | --- |
| `armour.png` | 1254² | The reference. Three rows of five: helmet, torso, hips, green and gold, five facings each. |
| `cyborg_black_red.png` | 1254² | The same three-by-five gear layout in a darker, higher-contrast palette with emissive green. |
| `character_space_marine_blue.png` | 1672 × 941 | Three rows of five gear pieces with a cloak — large soft cloth areas beside fine metal trim. |
| `cyborg_monk.png` | 1536 × 1024 | A whole character in parts — head, torso, arms, hands, legs — many facings each, and the rows are of uneven length. |
| `cyborg_healer.png` | 1536 × 1024 | The same, plus loose accessories (a rosary, bells, a robe) that belong to no row. |
| `three-quarter-view_tiles1.png` | 1254² | Terrain tiles, three rows of eight, with wide empty margins on all four sides. |
| `ui_elements1.png` | 1672 × 941 | Frames, bars, buttons and cursors — thin strokes, five rows of uneven length. |
| `vehicles_and_props.png` | 1672 × 941 | Vehicles, wheels, barrels and barricades in three-quarter view, four rows of six. |

**Three properties they all share, and each one breaks something that a synthetic fixture does not:**

- **The key colour is magenta, and it is not flat.** Measured over the outer border, `armour.png`
  runs `#e502e7` to `#f723fa` and `character_space_marine_blue.png` — the widest of the eight —
  runs `#db02d9` to `#ef25f5`. These sheets were resampled on the way out of the generator, so the
  key carries the resampler's ringing. That spread is what the keying tolerance is *for*, and a test
  or a measurement that assumes one exact background colour passes against a hand-built fixture and
  is wrong on all eight of these.
- **Every one is PNG colour type 2** — 8-bit truecolour, non-interlaced, **no alpha channel**.
  `src/test/decodePng.ts` reads that alongside the two `encodePng` writes, and
  [tests/sheetCorpus.ts](tests/sheetCorpus.ts) is what hands a test the eight sheets as
  `ImageData`. It still throws on anything else rather than guessing, which is the point of the
  refusal — a fourth colour type is added by implementing it, never by loosening the check.
- **No sheet's dimensions divide by its grid.** 1254², 1536 × 1024 and 1672 × 941 are what the
  generator returned, not what a cell count implies — which is the case the splitter and the
  bounding-box pass actually have to handle.
- **No sheet carries a global integer lattice, and the scale readings are measured against them.**
  The pitch of generated art *drifts*, so its boundaries leave any fixed lattice within a few dozen
  cells: measured across all eight, both axes and every candidate from 3 to 24, every phase class
  holds within one per cent of chance. That is why the two lattice readings answer on none of the
  corpus and cannot be recalibrated into answering, and why the correlation reading — which measures
  a repeat *distance* and never asks where the repeats sit — is the one that serves it.
  [tests/sheet-scale-corpus.test.ts](tests/sheet-scale-corpus.test.ts) pins what each of the four
  answers on each sheet, against the pitch each sheet was independently measured to hold. **A
  recalibration states what it did to all eight**, and the check on any new figure is what it does
  to the *wrong* candidates, not only to the right ones.

## Verifying a change

```bash
npm run type-check     # tsc -b --noEmit, across the app and the Vite config
npm run lint           # eslint . — 0 errors, and inline disables cannot silence it
npm run test:run       # vitest run — the pure utilities are where correctness lives
npm run build          # tsc -b && vite build — must emit dist/ + a valid service worker
npm run format         # prettier --write . before committing
```

All five run clean before a change is done — the first four prove it, `format` is what stops the
next diff being full of reflowed lines nobody wrote.

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

## Multi-line text goes through a file, not inline quoting

Multi-line commit messages, PR bodies, and issue/PR comments must be passed via a **file**, not
inline shell quoting: write the text to a file, then `git commit -F <file>` and
`gh … --body-file <file>`. Inline quoting for multi-line text is error-prone — a wrong
here-string delimiter can silently wrap the whole message in stray characters, and by the time
it reaches a pushed commit or a posted comment it is expensive or impossible to fix cleanly. A
file sidesteps all shell-quoting rules regardless of which shell runs the command.
