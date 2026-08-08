---
name: auto-review
description: >-
  Review the current working-tree diff (against main) for correctness bugs, CLAUDE.md
  violations, and the structural artefacts machine-written code characteristically leaves
  behind (phantom APIs, half-applied parallel edits, re-implemented seams, test theatre,
  suppressed errors, scope creep), reporting only high-signal findings. Model-invocable
  stand-in for the built-in /code-review, for use before merging or handing off work.
  Accepts an effort argument: low | medium | high (default medium).
argument-hint: "[low|medium|high]"
allowed-tools:
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(git merge-base:*)
  - Bash(git log:*)
  - Bash(git rev-parse:*)
  - Bash(git show:*)
  - Agent
  - Task
  - ReportFindings
  - Read
  - Grep
  - Glob
---

# auto-review — agent-invocable working-diff review

This skill is a **model-invocable stand-in** for the bundled `/code-review`, which cannot be
called by the agent (it ships `disable-model-invocation: true` and is not on the Skill-tool
allowlist). It reproduces the bundled reviewer's **find → validate → high-signal-only** rubric,
adapted to review the **local working-tree diff** rather than a GitHub PR — the exact need
here, where a change is reviewed *before* it is merged or a PR exists.

> **What it is not.** This is a faithful single-orchestration approximation, not the real
> `/code-review`. It does **not** run the bundled reviewer's cloud/`ultra` multi-agent machinery,
> and its depth depends on the effort you pass. When a maintainer-run `/code-review high` is
> available, that remains the stronger, authoritative pass. Use this to catch issues *before* that
> gate — not to replace it.

**Provenance / maintenance.** The rubric below is adapted from the public Anthropic source at
`github.com/anthropics/claude-code`, path `plugins/code-review/commands/code-review.md`
(the `code-review@claude-code-plugins` plugin), by way of the sibling Gubbins project's copy.
Drift from the bundled reviewer is expected and acceptable. **Re-sync this file from that public
source whenever the Claude Code VS Code extension is updated** — fetch the latest
`code-review.md`, diff it against this rubric, and fold in any changes, keeping the
working-tree adaptation below.

Two things here are **local additions with no upstream counterpart** — a re-sync must preserve
them rather than overwrite them: the working-tree (rather than PR) diff scope, and the
**machine-artefact lane** (step 4's third agent type, the A–H checklist, and its false-positive
list). The latter exists because the upstream bar — won't compile / definitely wrong / rule
violation — is tuned for human-authored code, and is close to orthogonal to how machine-authored
code fails. Machine-written code compiles; it goes wrong by referring to things that were never
written, changing one of six places that had to change together, re-solving a solved problem, and
asserting completion it hasn't reached. None of those trip the upstream bar.

## Agent assumptions (applies to all agents and subagents)

- All tools are functional and will work without error. Do not test tools or make exploratory
  calls. Make this clear to every subagent launched.
- Only call a tool if it is required to complete the task. Every tool call has a clear purpose.

## Effort

Read the argument (`low` | `medium` | `high`, default `medium`). It scales the review breadth:

- **low** — 2 review agents (1 CLAUDE.md compliance, 1 combined bug/logic + machine-artefact).
  Skip the summary agent; you summarise the diff yourself.
- **medium** (default) — a summary agent + 4 review agents (1 CLAUDE.md compliance, 2 bug/logic,
  1 machine-artefact).
- **high** — a summary agent + 6 review agents (2 CLAUDE.md compliance, 2 bug/logic,
  2 machine-artefact — one taking the *mechanical* checks A–D, one the *intent* checks E–H).

## Steps — follow precisely

1. **Establish the diff scope.** This reviews *local, uncommitted-and-committed* work against
   `main`, not a PR.
   - `BASE=$(git merge-base main HEAD)`.
   - The review target is everything from `BASE` to the working tree: `git diff BASE` (this
     includes committed *and* uncommitted changes — the full delta a merge into `main` would
     introduce). Use `git diff BASE --stat` for the file list and `git diff BASE` for the hunks.
   - If the diff is empty, stop and report: "No changes to review against main."

2. **Collect relevant CLAUDE.md files** (paths only, not contents): the root `CLAUDE.md`, plus any
   `CLAUDE.md` in a directory containing a file the diff modifies. When judging a file's compliance,
   only consider CLAUDE.md files that share its path or a parent of it.

3. **Summarise the changes** (skip the dedicated agent at `low` effort — do it inline). Capture the
   author's intent: infer it from the branch name, commit messages (`git log BASE..HEAD`), and the
   diff. This intent is context every review agent receives. Note which spec phase the change
   belongs to — `docs/todo/sprite-gubbins-spec.md` is the blueprint the work is executing.

4. **Launch the review agents in parallel** (count per effort above). Give every agent the change
   summary + inferred intent, the diff, and the relevant CLAUDE.md paths. Each returns a list of
   issues; each issue has a **description** and the **reason** it was flagged (e.g. "CLAUDE.md
   adherence", "bug", "logic", "security", or the machine-artefact check letter it matched).

   - **CLAUDE.md-compliance agent(s):** audit the changed code against the applicable CLAUDE.md
     rules. Only consider CLAUDE.md files sharing the file's path or a parent. Quote the exact rule
     broken. Rules most worth checking here:
     - **Design tokens** — a raw hex, `rgb()`/`oklch()` literal, or an ad-hoc Tailwind palette
       class (`bg-slate-900`, `text-cyan-400`) where a `foundry-*` / `neon` / `gold` / `emerald` /
       `rose` / `ink-*` token exists. The **only** sanctioned raw-hex sites are
       `src/constants/colors.ts` (domain data) and `ColorSwatch`'s inline `style` (it renders a
       *user's* colour). Anything else is a violation.
     - **The structural laws** — a file over ~150 lines, more than one component/store/util
       exported from one file, or a file in the wrong directory for its concern
       (domain logic outside `src/utils/`, persistence outside `src/db/`, constants inlined into a
       component instead of `src/constants/`).
     - **The banned patterns** — derived state computed via `useState` + `useEffect` instead of
       during render or in `useMemo`; `as any` / `as unknown as T` / `@ts-ignore`; an
       `eslint-disable` comment (which `noInlineConfig` ignores anyway, so it is pure noise
       *and* a rule violation); `forEach(async …)` or a floating promise; a `useEffect` that
       registers a listener/timer/worker callback without returning cleanup; unchecked array
       indexing; prop-drilling past 3 levels when a Zustand store exists; a non-atomic store
       selector (`useSubjectStore()` wholesale rather than `useSubjectStore((s) => s.category)`).
     - **No backwards compatibility before `1.0.0`** — the project is pre-1.0, so a
       compatibility surface is a rule violation, not caution: an alias or forwarding re-export
       kept so an old name still resolves, a `@deprecated` wrapper, a second code path that reads
       a previous shape (`typeof value === 'string'` for a field that is now an object,
       `oldKey ?? newKey`), schema-migration or row-repair machinery in `src/db`, a fixture or
       test whose purpose is to prove a retired format still loads, or a `v2` parked beside an
       undeleted `v1`. The fix is always to delete it and update the call sites. **Not** findings:
       the type guards in `src/db/configParsers.ts` (they defend against *corrupt* storage, which
       is a different problem), the localStorage fallback, the cross-origin-isolation apparatus,
       and the `showPopover` feature detection in `useAnchoredSurface` — those support the
       browser a user has today, not an older version of this app.
     - **Completeness** — the spec's zero-truncation mandate. `// TODO: add remaining fields`,
       `/* rest of options here */`, an option array that is visibly a subset, or a stubbed
       function body is a direct violation, not a nit.
     - **Accessibility** — an interactive `<div>`/`<span>` without role + keyboard handling, an
       icon-only button with no `aria-label`, a decorative element missing `aria-hidden`, a toast
       outside a live region, a removed focus ring, a `ComboBox` change that breaks listbox
       semantics.
     - **No-secrets / public-hygiene** — anything credential-shaped, any real personal data, or
       any outbound model-API surface (this app makes no model calls by design).
   - **Bug/logic agent(s):** scan for obvious bugs **visible from the diff itself**, without reading
     wide context. Flag only significant, valid-in-the-hunk problems — inverted conditions, wrong
     operators, off-by-one, missing await, unhandled null, security issues, incorrect logic. Do not
     flag issues you cannot validate without context outside the diff.
   - **Machine-artefact agent(s):** work the **Machine-artefact checks (A–H)** checklist below,
     reproduced in full in the agent's brief. Unlike the bug/logic lane, this one **must read the
     repo** — `Grep`/`Glob`/`Read` are the whole point, because every check here is confirmed or
     killed by evidence outside the hunk.

   **CRITICAL: only HIGH-SIGNAL issues.** Flag an issue only when one holds:
   - The code will fail to compile or parse (syntax/type errors, missing imports, unresolved
     references).
   - The code will definitely produce wrong results regardless of inputs (clear logic errors).
   - A clear, unambiguous CLAUDE.md violation where you can quote the exact rule broken.
   - A machine-artefact check A–H matches **and** you can cite the concrete counter-evidence it
     demands — a `file:line` for the thing that doesn't exist, the sibling site left un-updated, the
     existing seam that was re-implemented, the assertion that cannot fail. No citation, no finding.

   Do **NOT** flag: code style/quality, issues that depend on specific inputs or state, or
   subjective suggestions. If you are not certain an issue is real, do not flag it — false positives
   erode trust and waste reviewer time.

5. **Validate every flagged issue with a second, independent pass.** For each issue from step 4,
   launch a subagent whose sole job is to confirm — with high confidence — that the issue is real
   in *this* code. Give it the summary + intent + the issue description. For a bug like "variable
   not defined", it verifies that is actually true; for a CLAUDE.md issue, it verifies the cited
   rule is in scope for that file **and** actually violated. This is adversarial: default to
   "not confirmed" when the evidence is thin.

   For a **machine-artefact** finding the validator must *independently re-derive* the cited
   evidence, not take it on trust — re-run the search for the "missing" symbol (including
   re-exports and barrel files), open the sibling site claimed to be un-updated, read the seam
   claimed to be re-implemented and confirm it actually covers this case. These findings assert
   *absence*, and absence is the easiest thing to get wrong from a partial grep. Confirm only if
   the evidence reproduces exactly.

6. **Filter to validated issues only, then de-duplicate.** Discard anything step 5 did not confirm.
   The lanes overlap by design (a `TargetModelId` arm added without a compiler branch is both a
   CLAUDE.md completeness violation and a half-applied parallel edit) — collapse findings that
   share a root cause into one, keeping the phrasing that names the rule or evidence most
   precisely. What remains is the high-signal result set.

7. **Report.**
   - **Report the confirmed findings via the `ReportFindings` tool** if it is available — one call,
     ranked most-severe first (empty array if nothing survived). Do not also print them as prose.
   - If `ReportFindings` is not available, print a terminal summary instead: list each confirmed
     issue with a one-line description and its `file:line`; or, if none survived, state exactly:
     "No issues found. Checked for bugs, CLAUDE.md compliance, and machine-artefact checks A–H."

This skill **reports** findings; it does not edit code. Fix anything it surfaces before continuing,
then re-run if the change was substantial.

## Machine-artefact checks (A–H)

Code written by a model fails differently from code written by a tired human. It compiles, it reads
fluently, it is plausibly shaped — and the bug/logic lane above, which deliberately looks only at the
hunk, is blind to most of it. These failures are **structural**: something the diff asserts exists
doesn't, something that had to change in six places changed in one, something already solved got
solved again slightly differently. Each check below therefore names the **evidence required** to flag
it; that requirement is what keeps this lane high-signal rather than a code-quality free-for-all.

**Mechanical checks (A–D) — verified by searching the repo.**

- **A. Phantom surface.** The diff references something that does not exist: a function, method,
  prop, hook, type, exported const, config field, npm script, CLI flag, dependency version,
  environment variable, or file path. Fluent invention is this failure mode's signature — the call
  reads perfectly and the callee was never written. Project-specific instances:
  - An **unknown Tailwind utility emits no CSS and no error** (CLAUDE.md says so explicitly). A
    `bg-foundy-800`, a `text-ink-subtle`, or an `animate-*` with no matching `--animate-*` in
    `src/index.css`'s `@theme` block renders unstyled and silently.
  - A colour name passed to `parseColorFromText` / expected in a swatch that has no entry in
    `COLOR_HEX_MAP` (`src/constants/colors.ts`).
  - A store action called from a component that the store never defines (`src/stores/*.ts`).
  - A field key read out of `subject` that no category in `CATEGORY_OPTIONS` defines.
  - A `TargetModelId` or `SubjectCategory` member used that the union in `src/types/` doesn't have.
  - A `lucide-react` glyph name that isn't exported by the installed version.
  - A column read in `src/db` that the DDL in `schema.ts` never creates.

  *Evidence:* a search for the symbol that returns nothing (having also checked barrels and
  re-exports) — quote the search and the referencing `file:line`.

- **B. Half-applied parallel edit.** This codebase is full of lists that must change together; a
  model reliably updates the one it was looking at:
  - A new `SubjectCategory` union member without its entry in `CATEGORY_OPTIONS`, and without its
    tile in `CategorySelector`.
  - A new field added to a category's option pool without its tooltip, or with an options array
    that the spec's fidelity mandate says must be complete.
  - A new `TargetModelId` added to `TARGET_MODELS` without its wrapping branch in
    `promptCompiler.ts` (and vice versa) — the dropdown offers a model whose output is unwrapped.
  - A new `OutputConfig` field added to the type without a default in `useOutputStore` **and** a
    control in `OutputConfig.tsx` **and** a read in `promptCompiler.ts`.
  - A new column in a `CREATE TABLE` in `schema.ts` without the matching insert/select mapping in
    `database.ts`, or without the field on the corresponding type in `src/types/`.
  - A preset added to `PRESETS` whose `subject` doesn't cover the fields its category declares.
  - A renamed symbol updated at the definition but not every call site.

  *Evidence:* the sibling site, by `file:line`, that still reflects the old shape.

- **C. Re-implemented seam.** The diff hand-rolls something the repo already owns a canonical seam
  for — colour parsing outside `src/utils/colorParser.ts`, power-of-two / grid / cell-size maths
  outside `src/utils/atlasCalculator.ts`, prompt assembly or model-wrapping outside
  `src/utils/promptCompiler.ts`, a direct SQLite call outside `src/db/`, a bare styled `<input>`
  or `<button>` instead of `ComboBox` / `Badge` / `Tooltip` / `Toast` from
  `src/components/common/`, a second toast mechanism beside `useUIStore.showToast`. The give-away
  is a *second*, subtly different implementation of a solved problem.
  *Evidence:* the existing seam's path, plus a one-line statement that it genuinely covers this
  case. If the seam does **not** fit, that is not a finding.

- **D. Dead on arrival.** Code added in this diff that nothing reaches: an exported helper, prop,
  option, branch or parameter with no caller; a flag that is only ever passed one value; a
  superseded implementation left beside its replacement (`fooV2` next to `foo`); an unreachable
  branch after an early return; an import used nowhere. This is also where **YAGNI** violations
  surface — a speculative abstraction nobody calls is dead on arrival by definition.
  *Evidence:* a repo-wide search for the identifier showing the definition is its only mention.

**Intent checks (E–H) — verified against the change summary and inferred intent from step 3.**

- **E. Test theatre.** A test that cannot fail: asserting on the mock rather than the subject,
  a mocked-out unit under test, `expect(true).toBe(true)`, an `await` with no assertion after it, a
  fresh snapshot accepted as the assertion. Also **assertions weakened or deleted** to get green —
  a specific expectation loosened to `expect.any(…)`, a case rewritten to match the new (possibly
  wrong) output rather than the intended behaviour, `it.skip` / `.only` / a commented-out case left
  behind. Watch the prompt-compiler tests especially: an assertion that merely checks the output is
  a non-empty string proves nothing about the compiled prompt.
  *Evidence:* quote the assertion and say why no realistic breakage would trip it.

- **F. Suppression instead of fix.** A type or lint error silenced rather than resolved:
  `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`, a widened `any` or `as unknown as`, a non-null
  `!` on something that can genuinely be null, an `eslint-disable` comment, a new blanket override
  bolted onto `eslint.config.js`, or a `try`/`catch` that swallows the error (empty block, bare
  `console.error`, `catch { return null }`) so a real failure now passes silently. A `?? fallback`
  that papers over a value which should never have been missing counts. Note that `noInlineConfig`
  means an `eslint-disable` doesn't even work here — finding one means someone tried.
  *Evidence:* the suppression's `file:line` and what it is hiding. The database layer's documented
  OPFS→localStorage fallback is **not** a finding: it is the specified behaviour for browsers that
  block cross-origin isolation. A suppression with a comment explaining a genuine, specific reason
  is likewise not a finding.

- **G. Scope creep.** Changes outside what the stated intent asked for: drive-by renames or
  refactors of untouched code, reformatting whole files around a two-line fix, speculative
  configuration knobs or abstraction layers nobody requested, backwards-compatibility shims for a
  version that never shipped, an unrelated dependency added. The spec pins a deliberately small
  dependency list — a new runtime dependency needs a stated reason.
  *Evidence:* the hunk, plus why the intent from step 3 doesn't cover it. Genuinely required
  incidental changes (a call site that *had* to move) are not scope creep.

- **H. Unbacked claim / leftover placeholder.** Prose in the change asserting something the code
  doesn't do — a comment, doc, or commit message claiming behaviour, coverage or completion the
  diff does not deliver. Plus the artefacts of an unfinished pass: `TODO` / `FIXME` / "implement
  later", a stub returning empty, hard-coded sample data on a real path, `console.log` /
  `debugger`, a commented-out block. Also **change-narrating comments** — `// now uses X instead of
  Y`, `// Added for the new flow` — which describe the *edit* rather than the code, and read as
  stale noise the moment they land (and, per public-repo hygiene, must never reference the agent or
  the process that produced them).
  *Evidence:* the claim and the code that contradicts it, or the placeholder's `file:line`.

When reporting via `ReportFindings`, use a `category` slug that names the check — `phantom-api`,
`parallel-edit-drift`, `reimplemented-seam`, `dead-code`, `test-theatre`, `suppressed-error`,
`scope-creep`, `unbacked-claim` — so the class of problem is visible at a glance.

## Known false positives — do NOT flag (from the source rubric)

- Pre-existing issues (not introduced by this diff).
- Something that looks like a bug but is actually correct.
- Pedantic nitpicks a senior engineer would not raise.
- Issues a linter would catch (do not run the linter to verify).
- General code-quality concerns (missing test coverage, generic security posture) unless a relevant
  CLAUDE.md rule explicitly requires it.

## Known false positives — machine-artefact lane specifically

This lane asserts *absence* — "that doesn't exist", "that wasn't updated", "that's already solved" —
and absence is the easiest claim to get wrong from an incomplete search. Do **not** flag:

- A symbol you failed to find because you searched too narrowly. Re-export barrels, `*.d.ts`,
  string-keyed lookups and dynamic imports all hide definitions from a naive grep. Search the whole
  repo before claiming something is phantom.
- Code that is unreferenced *within the diff* but reached from elsewhere — a registry entry consumed
  by iteration (every `CATEGORY_OPTIONS` and `PRESETS` entry is reached this way, never by name), a
  test helper, a public export, a props field spread into a child. "No caller in the hunk" is not
  "no caller".
- The long option arrays, tooltips and preset definitions themselves. The spec **mandates** complete
  fidelity, so volume in `src/constants/` is the requirement, not bloat — and a `<150`-line target
  is a rule about responsibilities, not a licence to truncate a data file the spec says must be
  whole. Flag a constants file only if it mixes in logic that belongs in `src/utils/`.
- Deliberate divergence from a seam where the seam genuinely doesn't apply. The finding is a
  *duplicate* implementation, not any implementation you'd have written differently.
- A pre-existing `TODO`, suppression, `any`, or narrating comment the diff merely moved, reindented,
  or left untouched nearby. The trigger is introduction, not existence.
- Type suppressions and loose types in test files and fixtures where they are idiomatic.
- Missing tests, thin tests, or tests you would have written differently — only tests that
  **cannot fail** or whose assertions this diff **weakened** are in scope.
- Ordinary explanatory comments. Only comments describing the *edit itself* ("now uses…", "changed
  to…", "added for…") are findings; a comment explaining *why* the code is the way it is is good.
- A scope judgement you are inferring rather than reading. If the intent from step 3 is vague, the
  benefit of the doubt goes to the author — flag scope creep only when the extra change is clearly
  unrelated to a clearly stated intent.
- Anything you would phrase as "consider", "might be cleaner", or "could be simplified". That is the
  `/simplify` skill's job, not this one.
