# Sprite Gubbins — working conventions

Sprite Gubbins is a browser PWA that composes prompts for generating game sprite sheets and
quantises the sheets a model returns. It has no server, makes no model calls, and keeps its data in
browser SQLite. [The specification](docs/todo/sprite-gubbins-spec.md) decides *what* to build and
wins a disagreement; this file decides *how*. Every rule is mandatory. When a guard test fails, its
docblock explains the rule.

## This file stays small

Every session loads this file whole, so it holds only rules that apply to every change, each in a
few lines. `tests/instruction-file-budget.test.ts` fails when it passes 8,000 characters, a section
passes 1,250, or `AGENTS.md` passes 400; never raise a cap to fit a change. Shorten or replace a rule
instead, and do not restate what lint, a test or a hook enforces. A rule for one kind of change is a
note in `P:/Source/!Memories/SpriteGubbins/`, named in the table below, and a review that finds such
a rule missing restores it there.

## Before one of these changes, read its notes

| Change | Notes |
| --- | --- |
| Styling | *Which design token paints each role*, *Design tokens for special-purpose surfaces*, *A floating surface goes in the top layer* |
| A control, or user-facing copy | *Every control carries guidance*, *Accessibility wiring beyond jsx-a11y* |
| Prompt text, sheet plans, model wrappers | *Changing the compiled prompt's text* |
| Storage, `src/sw.ts`, a new subresource | *A database change works on both storage backends*, *The app never loads a cross-origin subresource* |
| A calibration, or a real sheet in a test | *The test sprite sheets and what each is for* |
| A tool that walks the project root | *A root-scanning tool must skip the agent worktrees* |
| A GitHub issue or pull request | *Sign what you write on a Sprite Gubbins issue*, *Reconcile a Sprite Gubbins issue's labels*, *Close a Sprite Gubbins issue once its work has landed* |

## Work in a git worktree, and land it

Several agents work here at once, and a shared checkout mixes their edits without failing loudly.
Make every change in its own worktree; the primary checkout is for reading and merging only.

```bash
git worktree add .claude/worktrees/<topic> -b worktree-<topic>
# inside the tree: npm install, make the change, run the gate below, then
git status --short                  # every ?? line is work too
git add -A && git diff --cached     # the secrets self-audit, on what will be committed
git commit -F <message-file>
# from the primary checkout
git merge worktree-<topic>
git worktree remove .claude/worktrees/<topic>
git branch -d worktree-<topic>
```

- One worktree, one branch, one task. Never adopt or land another agent's tree, never switch the
  primary checkout's branch, and never run `git clean -ffdx`, which deletes the other agents' trees.
- A task is done when it is merged into `main` and its tree and branch are removed. If `main` moved,
  merge it into your branch and re-run the gate there first.
- If `git worktree remove` refuses, look at what is uncommitted; never `--force`. If the work cannot
  land, leave the tree and say so, naming the branch and the blocker.

## No secrets, and public-repository hygiene

This repository is public, and a committed secret is permanent.

- Never write a key, token, password, certificate, cookie or connection string into a tracked file
  or a commit message. Use `<YOUR_API_KEY>` or `sk-xxxx`; real values go in the git-ignored `.env`.
  If something might be a secret, leave it out and ask. If one is committed, stop and say so: it
  must be revoked and the history scrubbed.
- The app never handles a model API key. A key field, an image-generation request or a proxy is a
  new architecture: stop and raise it.
- No real personal data: use `BootBlock@users.noreply.github.com`, `example.com` and `localhost`.
  Never commit `*.sqlite`, `*.db`, dumps, prompt archives or keys, and judge a new kind of generated
  or local file before committing it.
- Everything committed is world-readable: professional and neutral, with no internal ticket IDs,
  URLs, hostnames or TODO naming a person. The licence is MIT: never paste code under an incompatible
  or unknown licence, and vet a new dependency's licence and upkeep.

## Do the whole fix, never the cheap one

Fix the cause where it lives and every instance of it, update every call site, type, test, tooltip
and document the change makes untrue, add a test that would have caught it, and delete what it
supersedes. This is not a licence for scope creep. If the whole fix is too large or needs a
decision, say so and leave the defect documented; "minimal change" is not a reason to do less.

## No backwards compatibility before 1.0.0

While `package.json` says `0.x`, a change replaces what it supersedes: update every call site, let a
stored value naming a retired option fall back to its default, and discard an incompatible database.
No aliases, forwarding re-exports, `@deprecated` wrappers, dual read paths, migrations, repair
passes, legacy fixtures, or a `v2` beside a `v1`. Guards against corrupt storage (written against
each union's `as const` array), the localStorage fallback, cross-origin isolation and `showPopover`
detection are not compatibility and stay. The commit message says what the change breaks.

## Architecture: the structural laws

- Under 150 lines of code per file (`tests/module-size.test.ts`), and one thing per file, named for
  what it exports.
- Directories are concerns. `src/utils/` is pure domain and compiler logic, with no store, DOM or
  I/O, and its tests establish its correctness. State goes in `src/stores/`, persistence in
  `src/db/`, constants in `src/constants/`, types in `src/types/`, and hooks that need React, the
  DOM or a store in `src/hooks/`, never one that only wraps a `useState`. `src/workers/` holds
  threads and their protocols, not logic, and no component owns a thread. Primitives go in
  `src/components/common/`, panels in `studio/`, `quantise/` and `projects/`.
- Reuse the primitives (the fields, `ComboBox`, `Tooltip`, `ControlTooltip`, `ColorSwatch`, `Badge`,
  `Toast`, `Modal`, `ExternalLink`) rather than restyle a bare element.
- No speculative layers, stubs, `TODO: add remaining fields` or truncated option lists.
- Lint and the compiler reject the other banned patterns. Review catches the rest: `as unknown as T`,
  an effect that registers anything without a cleanup, selecting a whole store, and prop-drilling
  past three levels.

## Design tokens are mandatory

A colour the app paints with is a token from the `@theme` blocks of `src/index.css`, the one place a
colour value is written down. Never write a raw hex, `rgb()` or `oklch()`, a stock palette class, a
bracketed `text-[…px]`, an inline `cubic-bezier` or inline `@keyframes`. A colour the app only names
is domain data under `src/constants/`. Text on a solid role fill takes `text-foundry-950`: `text-ink`
on `accent` measures 2.04:1. An unknown Tailwind utility emits nothing and raises no error, so
confirm a new one in the built CSS.

## Copy and guidance

Every control ships guidance: `Tooltip` on a control that holds a value, `ControlTooltip` on one
that acts, never a `title` attribute. User-facing strings and prompt text use British spelling,
plain declarative sentences addressed to "you", and typographic punctuation (`’`, `“ ”`).

## Verifying a change

```bash
npm run type-check
npm run lint
npm run test:run
npm run build
npm run format
```

All five run clean before a change lands. Drive a change with a runtime surface in a browser with
the `verify` skill, then run `/auto-review high` over the diff and fix every confirmed finding.
Tests import `describe`, `it` and `expect` from `vitest` explicitly. A plan under `docs/todo/` keeps
the status banner its [README](docs/todo/README.md) defines, the spec's banner changes in the change
that ships a phase, and a plan's record of what it did is never rewritten.
