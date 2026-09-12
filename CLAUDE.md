# Sprite Gubbins — working conventions

Sprite Gubbins is a browser PWA that composes model-targeted prompts for generating game sprite
sheets and texture atlases, and quantises the sheets a model returns. It has no server, makes no
model calls, and keeps history, presets and settings in browser SQLite (WASM + OPFS).

The specification is [docs/todo/sprite-gubbins-spec.md](docs/todo/sprite-gubbins-spec.md). When it
and this file disagree about *what* to build, the spec wins; this file governs *how*. Every rule
below is mandatory. Many are also held by a test whose docblock carries the detailed rationale, so
when one fails, read it rather than working around it.

## Work in a git worktree, and land it

Several agents work in this repository at once, and a shared checkout mixes their edits, index and
branch without failing loudly. Make every change in its own worktree; the primary checkout is for
reading and merging only.

```bash
git worktree add .claude/worktrees/<topic> -b worktree-<topic>
# inside the tree: npm install, make the change, run the gate below, then
git status --short                  # every ?? line is work too
git add -A && git diff --cached     # the secrets self-audit, on what will actually be committed
git commit -F <message-file>
# from the primary checkout
git merge worktree-<topic>
git worktree remove .claude/worktrees/<topic>
git branch -d worktree-<topic>
```

- **One worktree, one branch, one task.** Never adopt or land another agent's tree, never switch the
  primary checkout's branch, and never run `git clean -ffdx`: the second `-f` deletes the other
  agents' trees.
- **`node_modules` is per tree**, so install and run the gate inside the tree you edited.
- **A task is done when it is merged into `main`** and its tree and branch are removed, not when the
  gate is green. If `main` moved, merge `main` into your branch, re-run the gate there, then merge
  back. `main` and the `v*` tags reject force pushes and deletion.
- **If `git worktree remove` refuses, something is uncommitted**: look at it, never `--force`. Stop
  any dev server running in the tree first.
- **If the work cannot land**, leave the tree and say so plainly, naming the branch and the blocker.
- **Tools that walk the project root must skip `.claude/worktrees/`.** Git, Prettier and Tailwind
  take that from the rule in `.gitignore`. ESLint's flat config and Vitest do not read `.gitignore`,
  so both carry an explicit `.claude/**`. A new root-scanning tool needs the same exclusion in the
  same change.

## No secrets, and public-repository hygiene

This repository is public, and a committed secret is permanent.

- Never write an API key, token, password, private key, certificate, session cookie or connection
  string into any tracked file, including tests, fixtures, docs, comments and commit messages. Use a
  placeholder such as `<YOUR_API_KEY>` or `sk-xxxx`. Secrets belong in the git-ignored `.env`. If
  something might be a secret, leave it out and ask.
- **The app never handles a model API key.** A change proposing a key field, an image-generation
  request or a proxy is a new architecture: stop and raise it.
- No real personal data: use `BootBlock@users.noreply.github.com`, `example.com` / `*.test` and
  `localhost`. Never commit `*.sqlite` / `*.db`, dumps, exported prompt archives, keys or keystores.
- **If a secret is ever committed, stop and say so.** It must be revoked and the history scrubbed; a
  later commit deleting it is not enough.
- Everything committed is world-readable: stay professional and neutral, with no internal ticket IDs,
  URLs or hostnames and no TODO naming a person. Option labels, tooltips and preset names are
  user-facing copy.
- The licence is MIT. Never paste code whose licence is incompatible or unknown: write it, or use a
  properly attributed, compatible dependency. Vet a new dependency's licence and upkeep, and keep the
  dependency list small.
- Before committing a new kind of generated or local file, confirm it belongs in the repository. A
  build artefact, a local cache, or anything that could hold real data goes in `.gitignore` instead.

## GitHub issues and pull requests

- **Attribution.** Every issue or PR body and comment you write or edit ends with a `---` rule and
  `This <issue|pull request> was <actioned|opened|updated> by an agent on behalf of @BootBlock.`
  Commits carry the `Co-Authored-By` trailer instead.
- **Labels.** Whenever you open, action, comment on or close an issue or PR, reconcile its whole label
  set against `gh label list --limit 200`, removing what no longer applies as well as adding. `type:`
  and `area:` take one or more. `status:` (`triage` → `ready` → `in-progress` → `needs-review`) takes
  exactly one, and none once closed. `effort:` is judged in agent wall-clock, and `epic` means split
  the issue. `priority:` only where it informs, and `critical` only for a broken app, a leaked secret
  or user data at risk. Never create a label: propose it in a comment.
- **Closing.** Once your work on an issue has landed, comment what was done and close it. Leave it
  open only with the reason in that comment: part of it remains, it tracks open children, or it needs
  someone else's decision. A comment on a closed issue does not reopen it: do the follow-up and add a
  new comment, or open a linked new issue for genuinely new work. Reopen only when the fix failed or
  the issue was closed on a false premise, saying why in a comment and putting a `status:` label
  back.
- **Multi-line text goes through a file**: `git commit -F <file>`, `gh … --body-file <file>`.

## Do the whole fix, never the cheap one

Take the correct root-cause fix, never the quick or narrow one. Fix the cause where it lives, fix
every instance (grep for the pattern), update every call site, type, test, tooltip and paragraph of
documentation the change makes untrue, cover it with a test that would have caught the original, and
delete what it supersedes. This is not a licence for scope creep or speculative generality. If the
whole fix is too large or needs a decision, say so and leave the defect documented. "Minimal change"
and "out of scope for this bug" are not accepted reasons to do less.

## No backwards compatibility before 1.0.0

While the version in `package.json` is `0.x`, a change replaces what it supersedes: rename and update
every call site, let a stored value naming a retired option fall back to its default, and let an
incompatible database be discarded. Banned: aliases and forwarding re-exports, `@deprecated`
wrappers, dual code paths reading an older shape, migrations or repair passes over stored data,
legacy fixtures, and a `v2` beside an undeleted `v1`. These are not compatibility and stay: guards
against corrupt storage (written against the `as const` array defining each union), the localStorage
fallback, cross-origin isolation, and the `showPopover` feature detection. Being pre-1.0 removes only
the duty to keep the old shape working: say plainly in the commit message what a change breaks.

## Architecture: the structural laws

- **Under 150 lines of code per file.** Comments and blank lines are not counted, and
  `tests/module-size.test.ts` measures it. Pure declarations (option pools, presets, sheet plans, the
  prompt template, calibration records) are exempt through that test's `DECLARATION_PATHS`. A long
  file of logic has a second responsibility: split it.
- **One thing per file**, named for what it exports.
- **Directories are concerns.** Domain and compiler logic goes in `src/utils/`, which is pure: no
  store, no DOM, no I/O, and the tests are where its correctness is established. State goes in
  `src/stores/`, persistence in `src/db/`, constants in `src/constants/`, types in `src/types/`.
  Browser-effect and shared-interaction hooks go in `src/hooks/`, because they need React, the DOM
  or a store and so cannot live in the pure `src/utils/`; a hook that only wraps one `useState` is
  banned wherever it is filed. UI primitives go in `src/components/common/`, panels
  in `src/components/studio/`, `quantise/` and `projects/`, with `modals/`, `tabs/` and `layout/`
  beside them.
- **`src/workers/` holds threads, not logic**: worker entry points, their protocols, and the near side
  that owns each one. No component owns a thread, and state that must outlive a view lives in a store.
- **Reuse the primitives** rather than restyling a bare element: `TextField`, `NumberField`,
  `SelectField`, `CheckboxField`, `FilePickerField`, `ComboBox`, `Tooltip`, `ControlTooltip`,
  `ColorSwatch`, `Badge`, `Toast`, `Modal`, `ExternalLink`.
- **YAGNI and completeness.** No speculative layers or configuration nobody asked for, and no
  `TODO: add remaining fields`, stub or truncated option list.

| Banned | Caught by |
| --- | --- |
| Derived state through `useState` + `useEffect` | `react-hooks` compiler rules |
| `as any`, `@ts-ignore`, `@ts-nocheck` | typescript-eslint |
| `eslint-disable` comments | `noInlineConfig`, which ignores them |
| Floating promises, `forEach(async …)` | type-aware lint on every TypeScript file ESLint lints |
| Unchecked array indexing | `noUncheckedIndexedAccess`, in both tsconfigs |
| `as unknown as T` | review: use a type guard or a narrower union |
| An effect that registers anything without a cleanup | review; Strict Mode double-invokes effects in dev |
| Selecting a whole store (`useSubjectStore()`), prop-drilling past three levels | review |
| Compatibility shims while `0.x` | review |

## Design tokens are mandatory where one exists

A colour the app paints with comes from a token in the `@theme` blocks of
[src/index.css](src/index.css), the only place a colour value is written down. Never a raw hex,
`rgb()` or `oklch()`, a stock Tailwind palette class (`bg-slate-…`, `text-cyan-…`), a bracketed
`text-[…px]` size, an inline `cubic-bezier`, or inline `@keyframes`. If no token fits a new role, add
one there. A colour the app merely *names* (domain data under `src/constants/`, listed in
`tests/raw-colour-literals.test.ts`) is not a token. `ColorSwatch` is the only component that shows
such a colour, through an inline `style`. A list item claims a stop on the hue wheel by setting
`--color-tab` inline from `spectrumStopAt`.

| Role | Use |
| --- | --- |
| Page ground / inset well / panel / control / border and hover | `foundry-900` / `foundry-950` / `foundry-800` / `foundry-700` / `foundry-600` |
| Glass panel, and a surface floating above one | `glass-panel`, `glass-float` |
| Primary action, focus, selection | `accent`, `accent-strong`, `accent-soft` |
| Something live: auto-sync, generating, recomputing as you type | `neon`, `neon-deep`, never an ordinary control |
| Belonging to the active view; a primary action inside a view | `bg-tab` / `text-tab` / `border-tab` / `ring-tab`; `action-tab` |
| Needs attention / success / error | `gold` / `emerald` / `rose` |
| Body, secondary and faint text; prompt text and metrics | `text-ink`, `text-ink-muted`, `text-ink-faint`; `font-mono` |
| Type: scanned labels and chips / body, the default / a panel's opening line / bold headings | `text-2xs` / `text-xs` / `text-sm` / `text-base` and up |
| Motion | the `animate-*` and `ease-*` tokens; a bare `transition-*` already runs at 390ms on `ease-emphasized`, and any `duration-*` is one of 293, 390, 585, 975, 1365, 1440 |

- **Text on a solid role fill takes `text-foundry-950`**, set once on the ground for its whole
  subtree. No ink tone reaches 4.5:1 on any solid role fill; `text-ink` on `accent` measures 2.04:1.
- **The accent is the reader's choice**, applied by `data-accent` on the shell. Write `bg-accent`;
  never read `accentHue` from the store to pick a colour.
- **Unknown Tailwind utilities emit nothing and raise no error**, so confirm a new one in the built
  CSS. The reverse also holds: a whole class name written in a comment or test string ships CSS, and
  the build's dead-utilities guard fails on it.
- **A floating surface** (dropdown, tooltip, popover) goes in the top layer through
  `useAnchoredSurface`, never up a `z-index`: every glass panel is a stacking context. A surface with
  no anchor to place against, such as `ImageDropVeil`, calls `showPopover()` itself behind the same
  feature check.

## Every control carries guidance

A control ships with guidance or does not ship: what it is, what it changes (the compiled prompt,
stored data, or nothing at all), and why someone would use it.

- **A control holding a value** (field, select, checkbox, search box) takes `Tooltip`, the ⓘ every
  field primitive offers through its `tooltip` prop.
- **A control that does something** (button, link, chooser, `FilePickerField`) takes `ControlTooltip`,
  which shows the same card on hover or keyboard focus. Never put an ⓘ beside a button, and never use
  a `title` attribute for guidance.
- **A few controls carry no card on purpose**: a disclosure's `<summary>`, the toast's ✕, one value of
  a setting (a segmented pill, a combo-box option), the skip link and the combo-box chevron. Each
  says why in its own file, and a new exception must do the same.
- **Guidance copy lives in `src/constants/`**: a setting's `*_TOOLTIPS` beside the options it
  explains, an action's in `src/constants/tooltips/`. A sentence true of two controls is written once
  in `src/constants/guidanceSentences.ts` and imported.
- **Every user-facing string and all prompt text** uses British spelling, plain declarative sentences
  addressed to "you", and typographic punctuation (`’`, `“ ”`). No marketing register, rhetorical
  triads or "not just X but Y". A straight quote stays only where it is syntax, such as the JSON
  manifest example a model must reproduce as parseable JSON. The tests check shape and punctuation;
  whether the words are true is yours.

## Prompt text is the product

The compiled prompt is a contract: one changed sentence changes the artwork every user gets back.

- **Where the words live.** The template is `src/constants/promptTemplate.ts`, mirrored character for
  character into §3 of `docs/todo/baseline-prompt-new.md`, so change both in one commit. Per-option
  prose is in `src/constants/promptText/`, sheet contents in `src/constants/sheetPlans/`, and
  per-target wrappers in `src/utils/modelWrapperText/`, where every line traces to the vendor's own
  documentation.
- **Derive every fact two places state** (counts, facings, series lists); never write one twice by
  hand.
- **Every Output Configuration control reaches the compiled prompt** as stated, or it is not on
  screen.
- **State geometry, not adjectives**: a yaw in degrees and what it occludes, and a part by where it
  ends.
- **One prompt never disagrees with itself.** Check a new rule against the sections that state its
  neighbours, under every category and direction set.
- **Respect the limits**: `PRACTICAL_COMPONENT_CEILING` (43) components, at most five views per sheet,
  and sections gated on the target's declared capabilities in `src/constants/models.ts`.

## Platform and accessibility

- **SQLite runs in `src/db/sqliteWorker.ts`**, because its OPFS VFS needs a worker. Every database
  change must also work on the localStorage fallback.
- **The app is cross-origin isolated** (Vite headers in dev, `src/sw.ts` in production), so it never
  loads a cross-origin subresource. `src/sw.ts` is app code.
- **Accessibility** beyond what `jsx-a11y` catches: no interactive `<div>` or `<span>` without a role
  and keyboard handling (`ComboBox` needs full listbox semantics), an `aria-label` on every icon-only
  button, `aria-hidden` on decoration, toasts through a live region, `<main id="main-content">` on
  every screen, and the global `:focus-visible` ring left alone.

## Real sprite sheets are in `test_sprites/`

Anything that needs a real generated sheet (a browser check, a calibration, a screenshot) uses one of
the sheets there; tests load them through `tests/sheetCorpus.ts`. `armour.png` is the reference that
every calibration figure in `src/constants/quantiser.ts` and `src/constants/autoTune.ts` is measured
on. A figure measured on another sheet says which, and a recalibration states what it did to every
sheet. Never assume a sheet has a flat key colour, an alpha channel, or a grid that divides it.

## Verifying a change

```bash
npm run type-check
npm run lint
npm run test:run
npm run build
npm run format
```

All five run clean before a change lands. Where the change has a runtime surface, drive it in a
browser with the `verify` skill, then run `/auto-review high` (the `auto-review` skill) over the diff
and fix every confirmed finding. Tests import `describe`, `it` and `expect` from `vitest` explicitly.

`.github/workflows/tests.yml` runs the same gate on every push to `main` and every pull request. It
catches the case a local gate cannot see, the combination several agents' merges produce, but it runs
after the commit is already on `main` and never opens a browser.

## Plan docs carry a status

Every `.md` under `docs/todo/` opens with a status banner directly after its heading, such as
`> **Status:** 🟢 ACTIVE — Phase 1 shipped; Phase 2 next.` Documents marked `🟢 ACTIVE` or
`📘 REFERENCE` stay in `docs/todo/`; `✅ COMPLETE` and `⛔ SUPERSEDED` move to `docs/todo/done/`
([README](docs/todo/README.md)). Update the spec's banner in the change that ships a phase. Never
rewrite a plan's history to match current practice: a record of what a phase did is evidence.
