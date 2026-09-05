# Codebase audit plan — round two

> **Status:** 🟢 ACTIVE — Phase 1 (prompt corpus and the figure ledger) is complete; Phase 2 (Sol and GPT Image: vendor conformance) is next.

This is a living plan for the **second** full audit of the Sprite Gubbins codebase. Its output is
**GitHub issues** on <https://github.com/BootBlock/SpriteGubbins>, one per confirmed root cause —
not fixes. Each phase is one agent session, run from a prompt pasted into a fresh chat, and each
session ends by updating the [phase log](#phase-log) below and landing that update, so the plan
always records how far the audit has got and what it found.

The first round is [done/codebase-audit-plan.md](done/codebase-audit-plan.md). It ran ten phases
plus a wrap-up between 2026-08-30 and 2026-08-31 and filed fifty-nine issues, most of which have
since been fixed. This round is not a re-run of it. Three things are different:

- **The compiled prompt's effectiveness on ChatGPT 5.6 Sol is the centre of gravity.** The first
  round proved the prompt *consistent* — 46,464 compiled prompts with no contradiction — and left
  untested whether a consistent prompt *works*: whether what reaches the renderer on the reader's
  actual path still carries what the sheet is to be measured against. Phases 1–4 are about that,
  and one of them needs the maintainer to run real generations.
- **Every fix the first round produced is re-verified**, in the phase that owns its scope. A fix
  is a claim, and the closed issue is the only record of it. A closed issue whose defect is still
  present is reopened, per CLAUDE.md's reopening rule, rather than filed again.
- **Every phase attacks its scope from a different direction than the first round did.** Where
  the first round read a directory and fuzzed it, this round starts from the behaviour a reader
  sees — the prompt, the sheet, the download, the keyboard — and works back to the code. The two
  directions find different defects, which is the point of doing it twice.

The audit looks for five kinds of problem, and only these:

- **Mechanical** — code that is wrong: a bug, a broken invariant, an unhandled state, a defect a
  test would have caught, a violation of a rule CLAUDE.md marks as mandatory.
- **Functional** — behaviour that disagrees with the spec
  ([sprite-gubbins-spec.md](sprite-gubbins-spec.md)), with a control's own guidance copy, or with
  what the UI presents; a setting the compiler discards; a control that does not do what it says.
- **Performance** — measurable waste: needless re-renders from wholesale store subscriptions,
  quadratic work on the image pipeline's hot paths, main-thread work that belongs on a worker,
  bundle weight, memory held past its lifetime.
- **Prompt** — the compiled prompt contradicting itself, drifting from its mirror, stating a fact
  two places disagree on, naming geometry loosely, or carrying wording a target's vendor does not
  document. Prompt text is the product; these are functional defects of the highest order.
- **Effectiveness** — the compiled prompt is consistent and documented and *still* does not
  produce the sheet it specifies on its primary target: a figure that does not survive Sol's
  hand-off to the image tool, a rule the renderer satisfies with something other than what was
  meant, a section whose length costs more adherence than its content buys. This class is new in
  this round, and it is the only one whose evidence comes partly from outside the repository.

## How this plan is written for the agent that runs it

The phases are written for Claude Opus 5 running one session per phase in Claude Code. The plan
leans on what that agent does well and guards against what it does badly. Both halves are
explicit here so the session can check itself against them.

**What it does well, and the plan relies on:**

- **It reads long material accurately and reasons over it.** Each session opens by reading
  CLAUDE.md and this plan in full. Both are long, and that is intended: most of what looks odd in
  this codebase is a recorded decision with a docblock and a test behind it, and an auditor who
  has not read the record files the decision as a bug.
- **It runs code rather than reasoning about it.** Every phase's method is *demonstration* —
  a scratch test through the real function, a compiled prompt, a driven browser, a byte-level
  read of an emitted file — and the verification standard below accepts nothing else.
- **It fans work out to sub-agents.** Enumeration (list every call site, every class string,
  every closed issue in an area) is fanned out to `Explore` agents. **Verification never is**:
  a sub-agent's report is a candidate, not evidence, and the main session demonstrates every
  candidate itself before filing.
- **It follows a numbered procedure and a stop condition.** Each phase has one of each.

**What it does badly, and the plan guards against:**

| Tendency | Guard |
| --- | --- |
| Filing on inference — "this looks wrong" stated as "this is wrong". | The [verification standard](#what-counts-as-verified): a finding is filed with the demonstration pasted in, or it is a Notes entry marked *unproven*. |
| Drifting from auditing into fixing. | Ground rule 3: the audit changes no source file. Scratch tests live in the scratchpad directory, never in the tree. `git status --short` in the worktree must show only this document at the end. |
| Re-litigating a documented decision. | Every finding names the decision record it checked (CLAUDE.md section, docblock, closed issue) — and if the record justifies the behaviour, there is no finding. |
| Over-filing: one root cause split into an issue per symptom, or one issue per file. | Issue-filing protocol step 2: one issue per root cause, every affected site listed inside it. |
| Under-filing: bundling two defects that share a file. | The same step, read the other way. |
| Inflating a count or a measurement from memory. | Every number in an issue body was produced by a command the body quotes. |
| Running out of context with nothing landed. | Ground rule 7: a running notes file in the scratchpad from the first candidate onward, and a clean stop that lands a *partial* log row. |
| Asking the user a question mid-phase. | The plan decides. Where it does not, the session decides, records the decision in the log's Notes, and continues. The one exception is Phase 3B, which cannot run without the maintainer's generations and says so. |
| Reading a GitHub body back through a subprocess and re-posting it. | Issue bodies are written to a file in UTF-8 and posted with `--body-file`; nothing is round-tripped. |
| Citing a rendered documentation page for what it does *not* say. | A negative claim about a vendor page is made from the page's source (`<url>.md` on Mintlify-hosted docs, or the raw HTML), never from a rendered fetch. |

**The candidate funnel is the shape of every phase.** Enumerate broadly, then narrow: (1) list the
scope's files and the closed issues to re-check; (2) gather candidates — from reading, from
sweeps, from sub-agents, from the driven app; (3) for each candidate, search the decision record;
(4) for each survivor, build the demonstration; (5) for each demonstration that shows the defect,
dedupe and file; (6) log everything that fell out at steps 3–5 with the reason. A phase whose log
shows only step 5 has hidden its own working.

## Ground rules (every phase)

1. **Read [CLAUDE.md](../../CLAUDE.md) in full before auditing**, then this plan in full, then the
   memory notes the session's start hook lists whose titles touch the phase's scope. A finding
   that contradicts a documented decision is not a finding — unless the decision's own stated
   rationale no longer holds, in which case the issue must quote the rationale and show why it
   fails.
2. **Audit only your phase's scope.** A defect noticed outside it is written into the phase log's
   Notes column for the owning phase, not investigated now and not filed now.
3. **File issues; fix nothing.** The audit changes no source file. The only change a phase lands
   is its edit to this document. Scratch tests, compiled-prompt dumps, timings and downloaded
   files go in the session's scratchpad directory, never in the repository.
4. **Every finding is verified before it is filed**, to the standard in
   [What counts as verified](#what-counts-as-verified). A suspicion that cannot be proven within
   the session is recorded in the Notes column as unproven, never filed.
5. **All work happens in a git worktree**, including the phase-log edit. Before adding one, run
   `git worktree list` and check that no existing tree covers the same topic (another agent is
   often mid-flight). Use `.claude/worktrees/audit2-p<N>` on branch `worktree-audit2-p<N>`, and
   land it — commit, merge to `main`, push, remove the tree, delete the branch — before reporting
   the phase done.
6. **No time estimates anywhere.** Effort labels on issues use the repository's own agent-time
   taxonomy; the plan itself never scopes by time.
7. **Keep a running notes file** at `<scratchpad>/audit2-p<N>-notes.md` from the first candidate
   onward: every candidate, its status in the funnel, and the command that decided it. If the
   session runs short of room, stop cleanly: file what is verified, copy the notes file's open
   items into the log row, mark the phase **partial** with the exact point the sweep reached
   (directory and file), and land the log update. The same phase prompt resumes from that row.
8. **Re-verify the first round's fixes in your scope** before looking for new defects. The
   procedure is in [Re-checking a closed issue](#re-checking-a-closed-issue).

## What counts as verified

A finding is genuine when the session has **demonstrated** it, not inferred it. Acceptable
demonstrations, by kind:

- **A scratch test that fails.** A minimal test in the scratchpad exercising the real code (not a
  re-implementation), run with `npx vitest run --root <worktree> <file>` or by placing the file
  under the worktree's `src/` for the run and deleting it afterwards, with the failure pasted into
  the issue. The scratch file is evidence, not a deliverable; the issue records the repro so the
  fixing agent can rebuild it.
- **A compiled-prompt excerpt.** For prompt findings, compile the configuration that produces
  the defect (a scratch test calling `generatePrompt` from `src/utils/promptCompiler.ts` is the
  tool) and quote the clauses verbatim, with the configuration that reaches them — category,
  mode, direction set, sheet index, target, and every non-default field.
- **A hand-off transcript.** For effectiveness findings on Sol, the text Sol actually passed to
  the image tool for a given compiled prompt, captured per
  [the adherence runbook](#the-adherence-runbook), quoted beside the block of the compiled prompt
  it was meant to carry. A figure absent from the transcript is demonstrated absent; a figure
  paraphrased without its number is demonstrated lost.
- **A measured sheet.** For effectiveness findings about the rendered result, the sheet itself
  read through the app's own pipeline — the decoder in `src/test/decodePng.ts`, the scale reading,
  the sprite boxes, the duplicate and mirror passes — with the figure the prompt stated beside the
  figure the sheet measures. "It looks like eight facings at one angle" is an observation; "the
  duplicate pass pairs six of the eight boxes at a distance under the dial's floor" is a
  demonstration. The session also views the PNG directly (the Read tool renders images) and
  records what it sees, but a visual impression alone is an observation.
- **A measurement.** For performance findings: a number, with the method. React re-renders are
  counted with a render-count probe or the Profiler; pipeline hot paths are timed with
  `performance.now()` around the real function on a real sheet from
  [test_sprites/](../../test_sprites); bundle claims come from `npm run build` output or `dist/`
  inspection. "This looks O(n²)" is not a finding; "this is O(n²) and costs X ms on `armour.png`
  where the neighbouring pass costs Y ms" is.
- **A driven browser session.** For behavioural and accessibility findings that types and tests
  cannot reach, drive the built app (the `verify` skill covers launching it, confirming the port
  is yours, and the cross-origin-isolation gotcha) and describe the exact steps and the observed
  result. Keyboard and screen-reader claims name the keys pressed and what happened.
- **A build demonstration.** For token and Tailwind findings: build, then grep the emitted CSS
  for the class in question — an unknown utility fails silently, so absence from `dist/` is the
  proof.
- **A vendor citation.** For model-wrapper and capability findings: the claim that a line is
  undocumented is proven by quoting what the vendor's documentation does say, with the URL the
  wrapper or `models.ts` cites, fetched as source where the claim is a negative one.
- **An external consumer.** For file-format findings: the emitted file opened by software that
  shares no code with the writer — Python 3.10 is on this machine (`zipfile`, `struct`, and
  `zlib` are enough for PNG, zip and deflate checks without third-party packages); Aseprite and
  ImageMagick are **not** installed, so `.aseprite` claims rest on the format specification and the
  repository's own independent decoder in `src/test/decodeAseprite.ts`, and the issue says so.

Three proof obligations that are easy to skip and must not be:

- **Prove a repro against the defect.** A scratch test that fails must fail *because of* the
  defect: check that the assertion reads the real output, not a short-circuit. Where the finding
  is "a test cannot catch X", mutate the code to introduce X and show the test passing.
- **Check the decision record first.** Before filing, search CLAUDE.md, the file's own docblocks,
  `docs/todo/`, and open and closed issues for the behaviour. Deliberate behaviour, filed as a
  bug, costs a future session the work of rediscovering the rationale.
- **Say what was not verified.** Every issue separates what was demonstrated from what was
  inferred, in as many words. An inference presented as a finding is the failure the whole
  standard exists to prevent.

**Not findings, ever:** style preferences the repository's rules do not state; speculative
refactors; suggestions to add backwards compatibility (banned pre-1.0); missing features the spec
does not describe (YAGNI); anything whose only evidence is that another codebase does it
differently; a vendor's *general* prompting advice applied to this prompt without a demonstration
that following it changes the result.

## Re-checking a closed issue

Each phase's scope carries the first round's closed issues for that area. Before the new sweep:

1. List them:

   ```bash
   gh issue list --state closed --limit 200 --search "closed:>=2026-08-30 label:\"area: <area>\"" \
     --json number,title,closedAt,url
   ```

   Run it once per `area:` label the phase names, and include #151–#217 that fall in scope
   whatever their labels say — the first round's phase log in
   [done/codebase-audit-plan.md](done/codebase-audit-plan.md) lists which phase filed which.
2. For each, read the issue, its closing comment, and the commit that closed it (`git log
--grep "#<n>"`, or the commit the comment names).
3. Demonstrate that the defect is gone, by the same kind of evidence the issue used: re-run the
   scratch test the issue described, recompile the configuration it quoted, re-measure the figure.
4. If the defect is present again, **reopen the issue** with a comment carrying the demonstration
   and the attribution trailer, and put `status: ready` back on it — that is CLAUDE.md's first
   reopening ground, "the fix did not work, or regressed". Do not file a new issue.
5. If the fix holds, note the issue number in the log row's Notes as *re-verified*, with the
   method in a few words. Nothing else is written anywhere.

An issue still **open** in scope is not re-checked and not re-filed; if the sweep shows its
description is now wrong, comment on it (with the trailer) rather than filing a second one.

## Issue-filing protocol

For each confirmed root cause, in this order:

1. **Dedupe.** Search open *and* closed issues (`gh issue list --state all --limit 300 --search
"…"`, several phrasings), and read this plan's phase log for what earlier phases filed.
2. **One issue per root cause.** Five components copying one broken pattern is one issue listing
   all five sites, not five issues. Two unrelated defects in one file are two issues.
3. **Write the body to a UTF-8 file** in the scratchpad, then
   `gh issue create --title "…" --body-file <file>` — never inline quoting, never a round-trip
   through a subprocess read. Use the template below.
4. **Reconcile the full label set in the same visit**, choosing only from `gh label list --limit
200`: every `type:` that applies, every `area:` touched, one `effort:` calibrated to agent
   wall-clock, `status: ready` (the audit has verified and scoped it — `triage` would be false), a
   `priority:` only where it carries information, and `breaking change` where the fix would touch
   stored data or established behaviour. Effectiveness findings take `type: content` when the fix
   is wording, `type: research` when they need a decision the maintainer has to make, and
   `area: prompt-compiler` or `area: target-models` as the site dictates.
5. **End the body with the attribution trailer** after a `---` rule:
   `This issue was opened by an agent on behalf of @BootBlock.`

**Issue body template.** Prose under each heading, no bullet soup; the headings are fixed so a
reader can compare issues.

```markdown
## What is wrong

One paragraph: the defect, stated as behaviour a reader or a generator meets.

## Evidence

The demonstration, verbatim: the scratch test and its failure, the compiled-prompt excerpt with
its configuration, the hand-off transcript beside the block it was meant to carry, the
measurement with its method, the steps driven and what happened, the vendor text with its URL.

## Where

Every affected file, as a path with line numbers, and every affected site where a pattern is
copied. For a prompt finding, every configuration that reaches it (or the sweep that enumerated
them).

## Root cause, and the level the fix lives at

Why it happens, and where the whole fix goes per CLAUDE.md's "do the whole fix" rule — the shared
helper, the type, the template, the plan — not the reported symptom.

## What was verified, and what was not

Two short paragraphs, plainly separated. The decision record that was checked (CLAUDE.md
section, docblock, closed issue) and why it does not justify the behaviour.

---
This issue was opened by an agent on behalf of @BootBlock.
```

## Phase-completion checklist

Every phase ends with, in order:

1. All verified findings filed per the protocol; every closed issue in scope re-checked and
   either reopened or noted as re-verified; unproven suspicions and out-of-scope observations
   written into the log's Notes column.
2. This document's phase log row updated — status, date, issue numbers, notes — and the status
   banner at the top updated to name the next phase. Nothing else in the plan is rewritten:
   phase records are history, not documentation to polish.
3. `npx prettier --check docs/todo/codebase-audit-2-plan.md` and
   `npx vitest run tests/docs-todo-status.test.ts` green in the worktree.
4. The edit landed from its worktree: committed (message via `git commit -F <file>`), merged to
   `main`, **pushed**, worktree removed, branch deleted. `git status --short` in the worktree
   showed nothing but this document before the commit.
5. The next phase's session prompt printed for the user **in a raw fenced markdown block**,
   copied verbatim from this document. Phase 3A prints the runbook *and* the Phase 3B prompt.

## Phase log

| Phase | Status | Date | Issues filed | Re-verified / reopened | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 — Prompt corpus and the figure ledger | complete | 2026-09-05 | #220, #221, #222 | re-verified: #151 (recompiled every category's section 2 line), #154 (read the entry, compiled at that target), #158 (13 categories × 4 sheets at `CUTOUT_RIG`), #159 (compiled the six categories the fix named), #160 (PORTRAIT with `additional_anatomy` set), #161 (read the landmark sentence), #162 (OBJECT at `CUTOUT_RIG`/`FIVE_CLASSIC`), #165 (the CHARACTER core's trunk-termination paragraph), #166 (13 defaults against the nine retired option values), #170 (NES palette + NES hardware + Shovel Knight), #178 (five cell-framed categories), #203 (read the source), #216 (BACKGROUND on both plans), #217 (VEHICLE with and without the absence value). None reopened. | **Figure ledger.** Primary scenario (`CHARACTER` · `CORE_DIRECTIONAL_VARIANTS` · `EIGHT_COMPASS` · `THREE_QUARTER_TOPDOWN` · 35° · `CHATGPT_5_6_SOL`, defaults otherwise; identifiers unmoved). The pairing is a **ten-sheet series** — two cores of 12 components, eight articulation sheets of 34; sheet 1 is 28,171 characters, sheet 2 28,554. `HIGH_RESOLUTION` states its own scale and `palette: 'FREE'` pins none, so the Sol wrapper emits **no** section-2 paragraph and its must-carry list is section 0, section 3's object yaws and section 4 alone. 24 measurable figures. **Wrapper-carried and audited (10):** component count 12 (§0 · §4 · §6 · §9.1); key colour `#FF00FF` (§0 · §9.2); text ban (§0 · §8 · §9.3); one scale (§0 · §9.6); pixel grid (§0 · §9.8); object yaws 0/90/180/270° (§3 · §4 · §9, partly); one head/torso/pelvis per facing (§4); trunk terminations — neck, neck opening, two shoulder openings, waist, two hip openings (§4 · §9.5); reading order (§4 · §9.4); opposite-turn pair west/east (§3 · §9). **Wrapper-carried, unaudited (6):** annotation ban (§0.4 · §8); render at delivered resolution (§0.6); sheet 1 of 10 (§0 · §6); yaw count 4 (§3); turntable +90°×3 (§3); series length 10 (§0 · §6). **Neither (8):** accent `#06B6D4` (§1); 25–35% of sheet height (§2); 32–64 colours (§2); single-pixel contour (§2); 3×3 delivered pixels (§2); camera elevation 35° (§3); per-sheet series counts 12/12/34×8 (§6); wide 16:9 (§9). Sheet 2 differs only in the facings — yaws 45/135/225/315°, pairs SW/SE and NW/NE, sheet 2 of 10. Full ledger at `<scratchpad>/audit2-figure-ledger.md`. **Candidates for Phase 3B**, not findings: the camera elevation sits *inside* §3 but the directive names only its yaws; the 3×3 minimum feature size is the same shape of claim as the native-grid figure `sol.ts` records as lost on a real run; the wrapper's palette entry is gated on a *pinned* palette, so the default colour budget is protected by nothing. **Sweeps run, all negative:** 95,040 configurations for a figure stated twice with different numbers (component count four ways, yaw count four ways, sheet position and series total, leading-side ledger, native-grid factor, minimum feature size, palette counts, unresolved markers) — zero disagreements; 55,296 configurations for conditional-block reachability — all 25 gate keys reached both values; the contract sits at characters 794–4,463, so every numbered item is inside the first 2,000; the component map, adherence report and self-audit each track `emitsText`/`deliberates` at all 11 targets. **Not done:** no tokeniser is available offline (`tiktoken` absent for Python, none in `node_modules`), so `promptBudget.ts` was measured against the repository's own band instead — `MAX_BUDGET_SHARE` 0.8 in `src/test/promptFit.ts`, whose docblock states why a narrow margin cannot be claimed. Its reasoning holds; nothing to file. **Out of scope, for the owning phase:** Phase 2 — whether the wrapper's must-carry list should name §3's camera elevation, and whether Sol's 922,000-token ceiling (which no prompt approaches) tells the reader anything true. Phase 12 — the test that would close #222 is a documentation test. Running notes at `<scratchpad>/audit2-p1-notes.md`. |
| 2 — Sol and GPT Image: vendor conformance | not started | | | | |
| 3A — Adherence run pack | not started | | | | |
| 3B — Adherence scoring | not started | | | | |
| 4 — The other ten targets | not started | | | | |
| 5 — Domain data through the compiler | not started | | | | |
| 6 — Quantiser pipeline and its workers | not started | | | | |
| 7 — Downloads, encoders and atlas maths | not started | | | | |
| 8 — Stores, persistence, session and history | not started | | | | |
| 9 — UI primitives, chrome, modals, tabs | not started | | | | |
| 10 — Studio and quantise views | not started | | | | |
| 11 — Shell, PWA, tooling, CI, types | not started | | | | |
| 12 — Tests, documentation and the backlog | not started | | | | |
| Wrap-up | not started | | | | |

## The primary scenario

Every prompt phase measures this configuration first, because it is the one the app exists for:
the maintainer's own game is three-quarter top-down, its characters face all eight compass
directions and visibly change gear, engine mirroring is unacceptable because asymmetric gear flips
sides, and the prompts are pasted into ChatGPT with the 5.6 Sol model selected.

- Category `CHARACTER`, mode `CORE_DIRECTIONAL_VARIANTS`, direction set `EIGHT_COMPASS`,
  projection `THREE_QUARTER_TOPDOWN`, target `CHATGPT_5_6_SOL`, every other field at the studio's
  default. Both sheet indices — the eight-compass core splits into cardinals and diagonals
  (`coreFacingChunks`), so this scenario is two prompts.
- The identifiers are as `src/types/output.ts` and `src/types/subject.ts` spell them; if one has
  moved since this plan was written, the session finds the current spelling and records it in the
  log rather than guessing.

The reported failures that drove the prompt's August 2026 overhaul are the two things to watch
for on every sheet: trunk pieces (head, torso, pelvis) coming back wearing limbs the inventory
never listed, and directional views delivered at the same angle with the details moved.

## Phase 1 — Prompt corpus and the figure ledger

**Scope:** the compiled prompt as text, at Sol. `src/utils/promptCompiler.ts`,
`promptConditions.ts`, `promptFacts.ts`, `promptValues.ts`, `templateEngine.ts`,
`promptBudget.ts`, `promptMetrics.ts`, `modelWrappers.ts`, `modelWrapperText/sol.ts`,
`componentSet.ts`, `componentSlots.ts`, `componentTotal.ts`, `componentBudget.ts`,
`sheetFacts`' helpers (`sheetDirections.ts`, `sheetRuns.ts`, `sheetBatch.ts`, `sheetLayout.ts`,
`sheetPlanClothing.ts`, `sheetPlanValidation.ts`, `describeSeries.ts`, `turntableSequence.ts`,
`directionalRotation.ts`, `additionalAnatomy.ts`, `numberWords.ts`, `spriteOrdinal.ts`,
`sectionElementId.ts`, `resolveOutputForCategory.ts`, `studioDigests.ts`,
`styleReferencePatch.ts`, `identityDigest.ts`, `identitySubject.ts`); `src/constants/promptTemplate.ts`
and every file under `src/constants/promptText/`; the mirror in
[baseline-prompt-new.md](baseline-prompt-new.md) §3.

**Re-check:** closed issues in `area: prompt-compiler` from the first round (#151, #154, #158,
#159, #161, #162, #163 if closed, #164 if closed, #165, #178, #203, #216, #217 and any other with
that label closed since 2026-08-30).

**Build the figure ledger, and land it in the log.** Compile the primary scenario's two prompts
and, for each, list every **measurable figure** the prompt states — the component count, the key
colour hex, each yaw in degrees, the native pixel grid and its enlargement, every palette entry
or channel ladder, each named trunk termination, each ban (text, shadows, lettering), the views
per sheet, the cell layout. Against each figure record: the section it sits in; whether the Sol
wrapper's must-carry list names that block; and whether the prompt's own self-audit section asks
the renderer to check it. Write the ledger into the Notes column (compactly) and into
`<scratchpad>/audit2-figure-ledger.md` for Phase 3A to copy. **A figure the wrapper does not
protect and the self-audit does not check is a candidate**, not a finding: the finding comes in
Phase 3B when a run shows it lost.

**Look for:** figures stated twice in one prompt with different numbers (the first round's
sweeps checked count agreement; extend to every figure in the ledger); a rule whose figure is
only in prose the wrapper does not protect; the ordering of the prompt against what a reader
model attends to (what is in the first 2,000 characters, and whether the contract is there);
redundancy that is *not* the deliberate repetition the Sol docblock defends (the exclusions
restating section 0 stay; a third restatement of anything is a candidate); instructions aimed at
the reasoning model that the rendering model will also read, and vice versa; conditional blocks
no configuration in the shipped sweep reaches (enumerate the `[IF:…]` names and find a
configuration for each, or record that none exists); `promptBudget.ts`'s reading against a real
tokeniser figure if one can be obtained for a sample prompt, otherwise against its own stated
error band; the mirror test's blind spots (what the character-for-character comparison does not
cover — the §1–§2 prose around the template).

**Method:** scratch tests calling the real compiler over the primary scenario, then over every
category's default at Sol, dumping each prompt to the scratchpad and diffing; reading each
section against the figure ledger; `sectionOf` from `src/test/promptSections.ts` for slicing.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 1 — Prompt
corpus and the figure ledger** of the second codebase audit. Follow the plan's
"how this plan is written for the agent" section, ground rules, verification
standard, closed-issue re-check procedure, issue-filing protocol and
phase-completion checklist exactly: re-check the closed issues in Phase 1's
scope first, build the figure ledger for the primary scenario and land it in
the log and in the scratchpad, audit only Phase 1's scope, prove every finding
before filing it, file one GitHub issue per confirmed root cause with the body
template, a reconciled label set and the attribution trailer, fix nothing,
then update the plan's phase log in a worktree and land it (commit, merge,
push, remove the tree). Finish by printing the Phase 2 session prompt from
the plan in a raw fenced markdown block.
````

## Phase 2 — Sol and GPT Image: vendor conformance

**Scope:** the `CHATGPT_5_6_SOL` and `GPT_IMAGE` entries in `src/constants/models.ts`,
`src/utils/targetCapabilities.ts`, `src/utils/modelWrapperText/sol.ts` and `index.ts`, the
`DELIBERATES` / `RETURNS_TEXT` gating in `promptConditions.ts` and the sections it gates (the
self-audit, the manifest, the adherence report), `PromptBudgetNotice`, `TargetModelSelector`,
`GeneratorSiteLink`, and the guidance copy for the target selector; `tests/model-citations.test.ts`
and `tests/prompt-citations.test.ts`.

**Re-check:** #154, #157, and every closed issue in `area: target-models` since 2026-08-30.

**Look for:** every OpenAI page the two entries and the wrapper cite, fetched **as it reads
today** and as source where a negative claim rests on it; a claim in a docblock, a description or
the wrapper that the page no longer carries, or that was never on the page cited; the documented
maximum prompt length for GPT Image models on the Images API and the image-generation tool, set
against the compiled prompt's length at the primary scenario — if the hand-off can carry the whole
specification, that limit binds and nothing in the app states it; whether OpenAI now document the
ChatGPT surface's rewrite behaviour (the wrapper is worded to be true either way, and a page that
settles it changes what the wrapper may say); the GPT-5.6 prompt guidance applied clause by
clause to the *directive* the wrapper prepends (not to the template — see the Sol docblock for why
the two halves take different guidance); the ChatGPT image-prompting guidance applied to the
template; the capability flags (`deliberates`, `emitsText`, `promptBudget`) against the pages;
the budget notice's arithmetic and wording at Sol's 922,000-token ceiling, which no prompt
approaches, and whether that reading tells the reader anything true; the generator-site link's
target and the description's claims about the model picker.

**Method:** WebFetch with the `.md` source rule from the memory note "WebFetch drops tables from
docs sites"; the compiled prompt from Phase 1's dumps; a scratch test for any gating claim.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 2 — Sol
and GPT Image: vendor conformance** of the second codebase audit. Follow the
plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
2's scope first, fetch every cited OpenAI page as it reads today (as source
for any negative claim), audit only Phase 2's scope, prove every finding
before filing it, file one GitHub issue per confirmed root cause with the body
template, a reconciled label set and the attribution trailer, fix nothing,
then update the plan's phase log in a worktree and land it (commit, merge,
push, remove the tree). Finish by printing the Phase 3A session prompt from
the plan in a raw fenced markdown block.
````

## Phase 3A — Adherence run pack

**Scope:** no source auditing. This phase prepares the material the maintainer needs to run real
generations, and it ends by handing them the runbook.

**Do, in order:**

1. Read Phase 1's figure ledger from the log (and the scratchpad copy if the same machine still
   has it; otherwise rebuild it from the log row).
2. Compile the run pack's prompts with the real compiler and write each to its own file under
   `<scratchpad>/audit2-runpack/<scenario>/prompt.md`. The scenarios:
   - **S1** — the primary scenario, both sheets (`S1-cardinals`, `S1-diagonals`).
   - **S2** — S1's first sheet with a hardware profile and a `FIXED` palette pinned (pick the NES
     profile and its palette, or whichever pair the studio offers by default), which puts a
     palette block and a hardware block in section 2.
   - **S3** — `CHARACTER` in `CUTOUT_RIG` mode at `EIGHT_COMPASS`, first sheet — the trunk sheet
     whose limbs were the reported failure.
   - **S4** — S1's first sheet at the `RETRO_16_BIT` resolution profile, which emits the
     native-grid block the Sol wrapper protects.
   - **S5** — a five-view `VEHICLE` or `OBJECT` sheet at the studio default, which is the count
     nearest `PRACTICAL_COMPONENT_CEILING`.
   - **S6** — the studio's own opening configuration, unchanged, because it is what a first-time
     reader pastes.

   Record every field of every scenario in `<scratchpad>/audit2-runpack/scenarios.md`, with the
   identifiers spelled as the code spells them.
3. For each scenario, write beside the prompt the **interrogation prompt** — the message to send
   in the same ChatGPT conversation after the image arrives:

   > Print, verbatim and unchanged, the complete text you passed to the image tool for that
   > image. Do not summarise, shorten or reformat it.

   and the **compose-only prompt** — a fresh conversation, the specification pasted, then:

   > Do not render anything. Compose the exact text you would pass to the image tool for this
   > specification, and print it verbatim.

4. Build the **scoring sheet** at `<scratchpad>/audit2-runpack/scoring.md`: the figure ledger as
   a table with one column per run, each cell to be filled *carried verbatim* / *paraphrased
   without figure* / *absent* for the hand-off, and *satisfied* / *violated* / *unmeasurable* for
   the sheet.
5. Copy the whole run pack to a folder outside the repository — the default is
   `p:\Source\TypeScript\SpriteGubbins-adherence\`, created if absent — so nothing generated lands
   in a worktree, and write `README.md` there with the runbook below filled in with the real
   paths.
6. Update the log row for 3A, land it, and print **both** the runbook and the Phase 3B session
   prompt, each in its own raw fenced markdown block.

### The adherence runbook

What the maintainer does, once per scenario, in ChatGPT with the 5.6 Sol (Thinking) model
selected in the picker:

1. **Run A, B and C — three fresh conversations.** In each, paste `prompt.md` unchanged and wait
   for the image. Save the image at full size as `<scenario>/run-<A|B|C>/sheet.png`. Then send the
   interrogation prompt and save Sol's reply, unedited, as `<scenario>/run-<A|B|C>/handoff.md`.
2. **Run D — compose only.** A fourth fresh conversation: paste `prompt.md`, then the
   compose-only prompt. Save the reply as `<scenario>/run-D/compose.md`.
3. **Note anything odd** — a refusal, a model-picker change mid-run, an image that came back at
   an unexpected size — in `<scenario>/notes.md`.

Three runs per scenario because adherence varies run to run, and a figure lost in two of three is
a different claim from one lost in one of three. Nothing is scored until Phase 3B, and nothing
from this folder is ever committed unless the maintainer decides a sheet belongs beside the eight
in `test_sprites/`.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 3A —
Adherence run pack** of the second codebase audit. Follow the plan's "how this
plan is written for the agent" section, ground rules and phase-completion
checklist exactly: compile the six scenarios' prompts with the real compiler,
write the interrogation and compose-only prompts and the scoring sheet, copy
the pack to the folder outside the repository the plan names, write the
runbook README there with the real paths, audit nothing and file no issues,
then update the plan's phase log in a worktree and land it (commit, merge,
push, remove the tree). Finish by printing the runbook and then the Phase 3B
session prompt, each in its own raw fenced markdown block.
````

## Phase 3B — Adherence scoring

**Precondition:** the maintainer has run the runbook and the folder holds `sheet.png` and
`handoff.md` for at least runs A–C of S1, plus `compose.md` for run D. **If the folder is
incomplete, the session scores what is there, records exactly what is missing in the log row,
marks the phase partial, and stops** — it never invents a run.

**Scope:** the effectiveness of the compiled prompt on Sol, judged from the runs. The findings
land on `src/utils/modelWrapperText/sol.ts`, `src/constants/promptTemplate.ts`,
`src/constants/promptText/`, and `src/constants/sheetPlans/` — wherever the lost or violated
figure is written.

**Do, in order, per scenario and run:**

1. **Score the hand-off** against the ledger: for every figure, *carried verbatim*, *paraphrased
   without the figure*, or *absent*. Quote the transcript line beside the prompt line in the
   scoring sheet. Compare run D's composition with runs A–C's transcripts: a figure present in D
   and absent in A–C is lost at render time, not at composition.
2. **View the sheet** with the Read tool and write down what is in it — how many pieces, whether
   the facings differ, whether trunk pieces carry limbs, whether text or shadows appear — before
   measuring anything, so the impression is on record before the numbers shape it.
3. **Measure the sheet** through the app's own pipeline in a scratch test: decode it with
   `src/test/decodePng.ts` (it refuses anything but colour type 2 — if ChatGPT returned a
   different colour type, convert it losslessly with Python's standard library or note that the
   pipeline cannot read what the target returns, which is itself a candidate); read its scale
   (`measureSheetScale`); key its background at the stated key colour and record the keyed share;
   find the sprite boxes and count them against the stated count; run the duplicate and mirror
   passes across the boxes and record which pairs they join — six of eight facings pairing at a
   distance under the dial's floor is the "same angle" failure measured rather than seen.
4. **Fill the scoring sheet** and derive the loss ledger: for each figure, the number of runs in
   which the hand-off lost it and the number in which the sheet violated it.

**Then file, one issue per root cause:**

- A figure lost in the hand-off in two or more of three runs, in a block the wrapper's must-carry
  list does not name → an issue against `sol.ts` to name the block, with the transcripts as
  evidence. (This is exactly how the native-grid block earned its place — see the wrapper's
  docblock.)
- A figure carried verbatim and still violated on the sheet in two or more runs → an issue
  against the section that states it, because the renderer's half of the hand-off is where
  OpenAI's own guidance says to repeat what must stay fixed; the evidence is the transcript beside
  the measured sheet.
- A failure the prompt never stated a figure for → an issue against the template or the sheet
  plan, with the measured sheet as evidence.
- Anything the pipeline could not measure on a real Sol sheet → an issue in `area: quantise`
  only if the pipeline's own claims say it should have.

Label effectiveness issues `type: content` (or `type: research` where the fix needs a decision)
and `area: prompt-compiler` or `area: target-models`, and say in the body that the evidence is a
sample of three runs on one date with the model named in the runbook notes.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 3B —
Adherence scoring** of the second codebase audit. The maintainer's runs are in
p:\Source\TypeScript\SpriteGubbins-adherence\ (if that folder is empty or
incomplete, score what is there, record what is missing, mark the phase
partial and stop). Follow the plan's "how this plan is written for the agent"
section, ground rules, verification standard, issue-filing protocol and
phase-completion checklist exactly: score every hand-off against the figure
ledger, view and then measure every sheet through the app's own pipeline,
derive the loss ledger, file one GitHub issue per confirmed root cause with
the body template, a reconciled label set and the attribution trailer, fix
nothing, then update the plan's phase log in a worktree and land it (commit,
merge, push, remove the tree). Finish by printing the Phase 4 session prompt
from the plan in a raw fenced markdown block.
````

## Phase 4 — The other ten targets

**Scope:** every entry in `src/constants/models.ts` other than the two Phase 2 covered —
`GENERIC`, `GEMINI_FLASH_IMAGE`, `GEMINI_PRO_IMAGE`, `SEEDREAM`, `QWEN_IMAGE`, `MIDJOURNEY`,
`STABLE_DIFFUSION`, `FLUX`, `FLUX_API` — and their wrappers in `src/utils/modelWrapperText/`
(`flux.ts`, `midjourney.ts`, `qwen.ts`, `seedream.ts`, `stableDiffusion.ts`); the per-target
capability gating and budget readings; `models.test.ts`, `target-model-fields.test.ts`,
`model-citations.test.ts`, `src/test/promptFit.ts`.

**Re-check:** #152, #153, #155, #156, #157 and every closed `area: target-models` issue since
2026-08-30 not already re-checked in Phase 2.

**Look for:** every cited vendor page fetched as it reads today, as source for negatives; a flag,
a negative-prompt channel, a parameter or a length the page no longer documents or never did; a
target whose vendor has since renamed, retired or re-versioned the model the entry names; the
budget figure and its `kind` against the page; a wrapper clause that duplicates what the template
already says on a target whose vendor guidance warns against repetition; the compiled prompt at
each target for the primary scenario, checking that the sections the target cannot act on are
absent and the ones it can are present; the generator-site link for each; a target the studio
lists that the description says a reader cannot actually reach from a browser.

**Method:** as Phase 2, per target, plus a scratch sweep compiling the primary scenario at every
target and diffing the wrappers' output.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 4 — The
other ten targets** of the second codebase audit. Follow the plan's "how this
plan is written for the agent" section, ground rules, verification standard,
closed-issue re-check procedure, issue-filing protocol and phase-completion
checklist exactly: re-check the closed issues in Phase 4's scope first, fetch
every cited vendor page as it reads today (as source for any negative claim),
audit only Phase 4's scope, prove every finding before filing it, file one
GitHub issue per confirmed root cause with the body template, a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it (commit, merge, push, remove the tree).
Finish by printing the Phase 5 session prompt from the plan in a raw fenced
markdown block.
````

## Phase 5 — Domain data through the compiler

**Scope:** `src/constants/categories/`, `sheetPlans/`, `presets/`, `styleReferences/`,
`hardware/`, `palettes/`, `output/`, `tooltips/`, `guidanceSentences.ts`, `colors.ts`,
`anatomy.ts`, `backgroundKeyColors.ts`, `categoryDirectionSets.ts`, `categoryProjections.ts`,
`categoryStyleReferences.ts`, `subjectGroups.ts`, `componentBudget.ts`, `about.ts`,
`architecture.ts`, `ui.ts`, `settings.ts`, `session.ts`, `keyOffer.ts`, `identityCapture.ts`,
`identityLock.ts`, `paletteExport.ts`, `paletteFiles.ts`, `paletteLock.ts`, `packImport.ts`,
`previewModes.ts`, `spectrum.ts`, `studioHistory.ts`, `sheetIdentity.ts`; the supporting utils
`colorParser.ts`, `presetNames.ts`, `presetPack.ts`, `presetSearch.ts`, `paletteEntries.ts`,
`paletteText.ts`, `slugify.ts`, `targetSize.ts`, `targetSizeGrid.ts`, `componentTargetSize.ts`.

**Re-check:** #160, #166, #167, #168, #169, #170, #205 if closed, #217, and every closed
`area: categories` or `area: presets` issue since 2026-08-30.

**Look for — through the compiled prompt, not the data file:** every shipped preset compiled at
its own target *and* at Sol, and read for a contradiction between what its fields say and what
its category's plan orders (the first round's #169 and #217 are the shape); every category's
default compiled in every mode × direction set × sheet index it allows, sliced with `sectionOf`
and checked for a section-4 entry that section 8 forbids or section 1 disclaims; every
`absentOption` and every pool that *should* declare one by CLAUDE.md's plainer-or-incomplete
test; a style reference whose prose names a projection its category cannot take; a hardware
profile whose figures disagree with the palette that shares its name (the first round's #170 is
the shape — extend to every pair); guidance copy that is untrue of the control it describes,
read against what the control does now (fixes since the first round have changed behaviour under
copy nobody re-read); `architecture.ts`'s figures against the tree (the first round's #167);
option labels over the select budget; a colour literal outside the six permitted paths.

**Method:** scratch sweeps through the real compiler and parsers; the app driven for
guidance-truth checks where reading is inconclusive.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 5 —
Domain data through the compiler** of the second codebase audit. Follow the
plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
5's scope first, audit only Phase 5's scope and audit it through the compiled
prompt, prove every finding before filing it, file one GitHub issue per
confirmed root cause with the body template, a reconciled label set and the
attribution trailer, fix nothing, then update the plan's phase log in a
worktree and land it (commit, merge, push, remove the tree). Finish by
printing the Phase 6 session prompt from the plan in a raw fenced markdown
block.
````

## Phase 6 — Quantiser pipeline and its workers

**Scope:** the whole image pipeline in `src/utils/` — geometry (`gridAlignment.ts`,
`gridMesh.ts`, `gridInForce.ts`, `nativeGridScale.ts`, `componentGridScale.ts`, `pixelGrid.ts`,
`pixelPeriod.ts`, `meshPeriod.ts`, `profilePeriod.ts`, `stepProfile.ts`, `bestPhase.ts`,
`correlationPeaks.ts`, `isOnStep.ts`, `frameAlignment.ts`, `frameLattice.ts`,
`frameRegister.ts`, `frameSnap.ts`, `exactSplit.ts`, `boundaryClusters.ts`, `boxClearance.ts`,
`boxSeparation.ts`, `mergeNearbyBoxes.ts`, `edgeClaims.ts`, `edgeRuns.ts`, `spriteCell.ts`,
`spriteOutline.ts`, `spriteSegments.ts`, `spriteStrips.ts`, `spriteEquality.ts`,
`settleSprites.ts`, `cropImage.ts`, `cropSprite.ts`, `placeInCell.ts`, `duplicateSprites.ts`,
`snapDuplicates.ts`, `mirrorPairs.ts`, `symmetryAxis.ts`, `symmetrySnap.ts`,
`leadingSideLedger.ts`, `runningExtremum.ts`, `integralImage.ts`, `extremeNeighbour.ts`,
`unionFind.ts`, `panGeometry.ts`, `upscaleNearest.ts`, `imageData.ts`, `imageConfig.ts`) and
colour (`oklab.ts`, `oklabPlanes.ts`, `colorReduction.ts`, `applyPalette.ts`, `wuQuantiser.ts`,
`wuBoxSearch.ts`, `wuMoments.ts`, `mergeColors.ts`, `mixingPlan.ts`, `blendHistogram.ts`,
`coverageBlend.ts`, `kCentroidVote.ts`, `inkWeightedVote.ts`, `lineVote.ts`, `channelDepth.ts`,
`channelLevels.ts`, `keyBackground.ts`, `keyDistance.ts`, `keyingInForce.ts`, `borderKeyShare.ts`,
`antiAlias.ts`, `hardenSilhouette.ts`, `outlineExpansion.ts`, `outlinePolarity.ts`,
`despeckle.ts`, `ditherImage.ts`, `ditherMatrix.ts`, `bayerMatrix.ts`, `voidAndCluster.ts`,
`differenceMap.ts`, `heatmapImage.ts`, `ssim.ts`, `onionSkin.ts`, `pixelDistance.ts`,
`quantiseImage.ts`, `quantiseSettings.ts`, `quantiseStatus.ts`, `quantisePrologue.ts`,
`quantisedSheetCapture.ts`, `identityPalette.ts`, `lockedPalette.ts`, `swatchImage.ts`) and
auto-tune (`autoTune.ts`, `tuneScore.ts`, `tuneStage.ts`, `tuneStages.ts`, `tuneAliasStages.ts`,
`tuneCellStages.ts`, `tuneCandidate.ts`, `dialHistory.ts`); their constants (`quantiser.ts`,
`autoTune.ts`, `quantiseDials.ts`, `quantisePresets.ts`, `quantiseGuide.ts`,
`differenceRamp.ts`, `spriteMarker.ts`, `antiAlias.ts`, `spriteCell.ts`, `spriteDuplicates.ts`,
`spriteSegmentation.ts`, `spriteSymmetry.ts`, `frameAlignment.ts`, `sheetCanvas.ts`,
`dialHistory.ts`); and all of `src/workers/` (`quantiseWorker.ts`, `quantiseSession.ts`,
`quantiseProtocol.ts`, `autoTuneWorker.ts`, `autoTuneSession.ts`, `sheetWriteWorker.ts`,
`sheetWriteSession.ts`).

**Re-check:** #171, #172 if closed, #173, #174, #175, #176, #177, #183, #192, #206, #216, and
every closed `area: quantise` issue since 2026-08-30.

**Look for — starting from the reader's dial, not the file:** each control on the Quantise tab
driven end to end on every corpus sheet and the result read back, so the question is "does this
dial do what its guidance says" before "is this function correct"; a dial whose two ends produce
the same result; a dial whose effect is undone by a later pass; the auto-tune sweep's result on
each sheet against a hand-picked setting, and whether the sweep's own score ranks its answer
above the hand-picked one (a sweep that prefers a worse candidate by its own measure is a defect
in the score); the per-stage cost of the whole pipeline on each corpus sheet, tabulated, with
any stage that dominates and any copy of the sheet that could transfer; worker lifetime — a
per-press thread not ended by whatever disowns it, replies filed after release, a message the
two ends of a protocol shape differently, a transferable copied; numerical edges the first
round's fuzz did not reach (a sheet wider than 4,096, a 1-pixel-tall strip, a fully keyed sheet,
a sheet whose key colour is also a sprite colour); calibration figures re-measured on the sheet
their docblock names, on *any* figure a fix since 2026-08-30 could have moved.

**Method:** scratch tests through the real pipeline on all eight corpus sheets via
`tests/sheetCorpus.ts`; timings; the app driven with each control; the memory note
"Calibrating quantiser changes against the reference sheet" for re-measurement.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 6 —
Quantiser pipeline and its workers** of the second codebase audit. Follow the
plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
6's scope first, audit only Phase 6's scope and start from each dial's
behaviour on the corpus sheets, prove every finding before filing it, file one
GitHub issue per confirmed root cause with the body template, a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it (commit, merge, push, remove the tree).
Finish by printing the Phase 7 session prompt from the plan in a raw fenced
markdown block.
````

## Phase 7 — Downloads, encoders and atlas maths

**Scope:** `src/utils/encodePng.ts`, `pngChunk.ts`, `pngFilter.ts`, `pngPalette.ts`,
`deflate.ts`, `crc32.ts`, `byteWriter.ts`, `encodeAseprite.ts`, `aseHeader.ts`, `aseChunk.ts`,
`aseCel.ts`, `aseLayer.ts`, `asePalette.ts`, `aseTags.ts`, `encodeSpritePack.ts`,
`zipArchive.ts`, `packLayout.ts`, `writePalette.ts`, `writeSheet.ts`, `spriteManifest.ts`,
`packImportSummary.ts`, `quantisePresetPack.ts`, `fileStem.ts`, `paletteFileName.ts`,
`promptFileName.ts`, `atlasCalculator.ts`, `atlasBudget.ts`, `atlasFit.ts`, `proxyCrops.ts`,
`firstOfEachId.ts`, `sheetCoverage.ts`, `sheetToken.ts`; constants `aseprite.ts`, `atlas.ts`,
`paletteExport.ts` (writer side), `sheetFormats.ts`; the download hooks `useDownload.ts`,
`useFileSave.ts`, `useImageDownload.ts`, `usePaletteDownload.ts`; the atlas modal's components
under `src/components/modals/Atlas*.tsx`.

**Re-check:** #179, #180, #201 if closed, and every closed `area: atlas-calculator` or
`area: sheet-splitter` issue since 2026-08-30.

**Look for — starting from the file a reader gets:** every download the app offers, driven in
the browser on a corpus sheet and the file read back by software sharing no code with the
writer (Python's `zipfile`, `zlib` and `struct` for zip, deflate and PNG chunk structure; the
repository's independent decoders for the rest, with the issue saying which); a PNG a strict
decoder rejects (CRC, chunk order, IHDR against the data, filter byte range); a zip whose central
directory disagrees with its local headers; a palette file a named consumer's documented grammar
rejects; the `.aseprite` output against the published file-format specification chunk by chunk;
a manifest that disagrees with the sheet beside it; the File System Access path against the
anchor-download fallback (both exist — drive both, including a cancelled picker); a filename that
collides between two downloads of one session or carries a character a filesystem rejects; the
atlas calculator's figures against a hand calculation at power-of-two boundaries and its VRAM
figures against the formats it names; the engine metadata export against the engine's documented
format.

**Method:** driven downloads to the scratchpad, read back independently; scratch tests writing
real files; specification citations in every format issue.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 7 —
Downloads, encoders and atlas maths** of the second codebase audit. Follow the
plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
7's scope first, audit only Phase 7's scope and start from the file a reader
downloads, read every file back with software sharing no code with the
writer, prove every finding before filing it, file one GitHub issue per
confirmed root cause with the body template, a reconciled label set and the
attribution trailer, fix nothing, then update the plan's phase log in a
worktree and land it (commit, merge, push, remove the tree). Finish by
printing the Phase 8 session prompt from the plan in a raw fenced markdown
block.
````

## Phase 8 — Stores, persistence, session and history

**Scope:** all of `src/stores/` and `src/db/`; `src/utils/studioHistory.ts` and
`dialHistory.ts` on their store side; `src/types/history.ts`, `session.ts`, `settings.ts`,
`preset.ts`, `quantisePreset.ts`, `quantiseHistory.ts`, `studioHistory.ts`, `packImport.ts`; the
history and session components (`PromptHistoryContents.tsx`, `HistoryEntry.tsx`,
`HistoryFooter.tsx`, `HistoryControls.tsx`, `SubjectHistoryControls.tsx`,
`DialHistoryControls.tsx`, `StorageStatus.tsx`, `JsonPackTransfer.tsx`, `PackImportConfirm.tsx`).

**Re-check:** #181, #182, #183, #202 if closed, and every closed `area: persistence` or
`area: history` issue since 2026-08-30.

**Look for — starting from a session's lifetime:** the app driven through a full session in
**both** persistence modes (OPFS-backed SQLite, and the localStorage fallback forced by a private
window or by blocking OPFS), with the same sequence of edits, saves, loads, imports and reloads,
and the two end states diffed; what survives a reload, what survives navigation, what survives a
second tab of the same origin open at once (two tabs is the concurrency the SAH pool has to
answer for — drive it); history eviction at the boundary with real rows; an undo stack across a
preset load, a pack import and a category change; an import of a pack the app itself exported,
round-tripped twice; a store action that throws halfway and what state it leaves; a parser
accepting a shape the type forbids, or coercing where it should fall to the default; the session
restore after a schema change (an incompatible database is to be discarded, not translated —
confirm that is what happens, and what the reader is told); every wholesale store subscription
(`useXStore()` with no selector) and the re-render it costs.

**Method:** driven sessions in both modes per the `verify` skill; scratch tests through the real
stores with the doubles in `src/test/`.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 8 —
Stores, persistence, session and history** of the second codebase audit.
Follow the plan's "how this plan is written for the agent" section, ground
rules, verification standard, closed-issue re-check procedure, issue-filing
protocol and phase-completion checklist exactly: re-check the closed issues in
Phase 8's scope first, audit only Phase 8's scope and drive a full session in
both persistence modes, prove every finding before filing it, file one GitHub
issue per confirmed root cause with the body template, a reconciled label set
and the attribution trailer, fix nothing, then update the plan's phase log in
a worktree and land it (commit, merge, push, remove the tree). Finish by
printing the Phase 9 session prompt from the plan in a raw fenced markdown
block.
````

## Phase 9 — UI primitives, chrome, modals, tabs

**Scope:** `src/components/common/`, `src/components/layout/`, `src/components/modals/` (other
than the atlas set Phase 7 took), `src/components/tabs/`, `src/App.tsx`, `src/main.tsx`; the
interaction hooks `useAnchoredSurface.ts`, `useTooltipReveal.ts`, `useComboBox.ts`,
`useClipboard.ts`, `useCopyPrompt.ts`, `useShowToast.ts`, `useUndoShortcut.ts`,
`useAdoptedStyles.ts`, `useDetachedWindow.ts`, `useFileDropGuard.ts`, `useFileDropTarget.ts`,
`isTextEntry.ts`; `src/index.css` as consumed by these.

**Re-check:** #185, #188, #190, #207, #213, #214 if closed, and every closed `area: common-ui`,
`area: shell` or `area: design-tokens` issue since 2026-08-30. Note that #184, #186, #187 and
#189 were open when this plan was written — check their state before touching them.

**Look for — starting from the keyboard and the screen reader:** the whole app traversed with
Tab and Shift+Tab from the skip link to the last control on every tab and every modal, recording
each stop's accessible name, and every stop with none or with a name that is not what the control
does; every overlay opened and closed from the keyboard, with where focus lands; every
two-press confirmation; the combo box's full keyboard grammar against the visible state, including
type-ahead into a filtered list and Escape at each stage; the live region's announcements for
every toast and every copy; touch on every `ControlTooltip` and every ⓘ; reduced motion, both the
system preference and the in-app setting, driven and the remaining motion listed; the
`prefers-contrast` and forced-colours modes, which nothing in the token table mentions — record
what happens rather than assuming; contrast re-measured on every fill/text pairing the token test
does not reach (the first round's #195 shape — a stylesheet rule the sweeps cannot see); a class
that emits no CSS; a duration off the ladder in a shape the sweep misses; Strict Mode double-mount
finding an effect without cleanup; the detached preview window's lifecycle (open, close from
either side, navigate away, reload).

**Method:** driven Edge sessions per the `verify` skill and the memory note "Driving the studio
with Playwright"; Windows Narrator or NVDA where a screen-reader claim needs it (if neither is
available, say so in the log and confine the claim to the accessibility tree Playwright
exposes); `npm run build` plus grep for emission.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 9 — UI
primitives, chrome, modals, tabs** of the second codebase audit. Follow the
plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
9's scope first, audit only Phase 9's scope and start from the keyboard and
the accessibility tree in a driven browser, prove every finding before filing
it, file one GitHub issue per confirmed root cause with the body template, a
reconciled label set and the attribution trailer, fix nothing, then update the
plan's phase log in a worktree and land it (commit, merge, push, remove the
tree). Finish by printing the Phase 10 session prompt from the plan in a raw
fenced markdown block.
````

## Phase 10 — Studio and quantise views

**Scope:** `src/components/studio/`, `src/components/quantise/`; the hooks that serve them:
`useQuantiseWork.ts`, `useQuantiseTuning.ts`, `useImageFile.ts`, `useImageDrop.ts`,
`useImageDownload.ts`, `useImagePaste.ts`, `useDragPan.ts`, `useLinkedPanes.ts`,
`useSecondPaneImage.ts`, `useCopiedSheets.ts`, `useIdentityPaletteCapture.ts`,
`useSheetIdentity.ts`; the studio's own store reads.

**Re-check:** #185 on these controls, #192, #207, #213, and every closed `area: studio`,
`area: identity-lock` or `area: quantise` issue with a component in it since 2026-08-30. #191 was
open when this plan was written.

**Look for — starting from a reader's workflow:** the studio driven from a blank category to a
copied prompt with the render count of every panel recorded per keystroke (a panel re-rendering
on a field it does not read is a finding, with the count); the preview's compile cost per
keystroke at the primary scenario; the identity-lock flow end to end, from a quantised sheet
captured to the digest in the next prompt, and what the digest says when the sheet was keyed
badly; every drag, paste and drop path at its edges (a zero-size image, a non-image paste, a drag
that leaves the window, a file dropped on the wrong tab, a 12,000-pixel-wide sheet); the linked
panes' zoom and pan under a wipe and under a detached window; the comparison panel's container
queries at the narrowest column the breakpoint derivation allows; every select's width against
its budget at exactly the studio and quantise breakpoints; the split-into-sheets flow with its
progress and its history entries; the budget notice at every target's ceiling; canvas work on
the main thread that the worker should own, timed.

**Method:** driven sessions with render-count probes and `performance.now()`; the corpus sheets
for every image path.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 10 —
Studio and quantise views** of the second codebase audit. Follow the plan's
"how this plan is written for the agent" section, ground rules, verification
standard, closed-issue re-check procedure, issue-filing protocol and
phase-completion checklist exactly: re-check the closed issues in Phase 10's
scope first, audit only Phase 10's scope and start from a reader's workflow in
a driven browser with render counts and timings, prove every finding before
filing it, file one GitHub issue per confirmed root cause with the body
template, a reconciled label set and the attribution trailer, fix nothing,
then update the plan's phase log in a worktree and land it (commit, merge,
push, remove the tree). Finish by printing the Phase 11 session prompt from
the plan in a raw fenced markdown block.
````

## Phase 11 — Shell, PWA, tooling, CI, types

**Scope:** `src/sw.ts`, `src/utils/isolationHeaders.ts`, `public/` (including
`coi-bootstrap.js`), `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`,
`prettier.config.js`, `package.json` and `package-lock.json`, `scripts/`, `.githooks/pre-commit`,
`.github/workflows/deploy.yml`, `Run.bat`, `Run.ps1`, `.gitignore`, `AGENTS.md`, all of
`src/types/`, `src/index.css` as a stylesheet, `repro.log` and any other file at the root whose
presence in the repository is unexplained, and the `PWAInstallBanner`.

**Re-check:** #193, #194, #196, #204, #208, #209, #211, and every closed `area: pwa`,
`area: tooling`, `area: ci` or `area: dependencies` issue since 2026-08-30.

**Look for — starting from a deploy:** the production build served with `vite preview` and
driven through first visit, the isolation reload, install, offline (network disabled in the
driven browser), a second deploy with a changed asset, and the update flow — recording what the
reader sees at each step and what the worker precached against what the app requested; the
precache contract's figures re-derived; the same-origin gate on injected headers probed with a
cross-origin request the way CLAUDE.md describes the measurement; the deploy workflow read job by
job for a gate a dispatch can skip; the pre-commit hook against the CI gate for drift; every
dependency's declared version against the lock and against the vendor's current release, and any
advisory (`npm audit` output pasted); the secret scanner run over the whole tree and history (`git
log -p` piped through it) with any hit examined; the tool-exclusion table in CLAUDE.md re-probed
for every root-walking tool, including any added since; every union and optional field in
`src/types/` against its producers; the reduced-motion pair compared; every `@theme` token
against emission; `repro.log` decided.

**Method:** driven deploy and offline sessions; build inspection; config read against each
tool's documentation; scans.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 11 —
Shell, PWA, tooling, CI, types** of the second codebase audit. Follow the
plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
11's scope first, audit only Phase 11's scope and start from a driven deploy,
install, offline and update flow, prove every finding before filing it, file
one GitHub issue per confirmed root cause with the body template, a
reconciled label set and the attribution trailer, fix nothing, then update the
plan's phase log in a worktree and land it (commit, merge, push, remove the
tree). Finish by printing the Phase 12 session prompt from the plan in a raw
fenced markdown block.
````

## Phase 12 — Tests, documentation and the backlog

**Scope:** `tests/`, `src/test/`, every colocated `*.test.ts(x)` (as tests — their subjects were
audited in Phases 1–11), `docs/` including `docs/todo/` and `docs/todo/done/`, `README.md`,
`CLAUDE.md`, `AGENTS.md`, `LICENSE`, code comments as documentation, and the **open issue
backlog** as a document.

**Re-check:** #197, #198, #199 to #204 where closed, and every closed `type: test` or `type: docs`
issue since 2026-08-30.

**Look for:** unfalsifiable tests — a **different** sample from the first round's thirty-one
mutations (its log lists them; pick suites it did not mutate, and every guard added since
2026-08-30), each mutation applied in the worktree, run, and reverted before the next, committing
nothing; a suite whose discovery misses a directory added since; meaningful behaviour with no
test where CLAUDE.md says correctness lives in tests, weighted by what this audit's own phases
found; every factual claim in CLAUDE.md — a count, a measurement, a named file, a figure, a line
number — spot-checked against the tree, with particular attention to claims the fixes since
2026-08-30 could have moved; README accuracy; status banners truthful; `done/` plans that are
not in fact complete; stale comments asserting retired behaviour. **Then the backlog:** every
open issue read against the tree as it stands — one already fixed by a later change and never
closed, one whose description no longer matches the code, one whose labels are stale, two that
are one — commented on and reconciled per CLAUDE.md's label and closing rules (closing only where
the fix is demonstrably landed, with the demonstration in the comment).

**Method:** mutation spot-checks with immediate reverts; greps and re-measurement for doc claims;
`gh issue list --state open --limit 300` and a read of each.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running **Phase 12 —
Tests, documentation and the backlog** of the second codebase audit. Follow
the plan's "how this plan is written for the agent" section, ground rules,
verification standard, closed-issue re-check procedure, issue-filing protocol
and phase-completion checklist exactly: re-check the closed issues in Phase
12's scope first, audit only Phase 12's scope with a fresh sample of
mutations, verify every factual claim you test against the tree, reconcile
the open backlog against the code, prove every finding before filing it, file
one GitHub issue per confirmed root cause with the body template, a
reconciled label set and the attribution trailer, fix nothing, then update the
plan's phase log in a worktree and land it (commit, merge, push, remove the
tree). Finish by printing the wrap-up session prompt from the plan in a raw
fenced markdown block.
````

## Wrap-up

**Scope:** the audit itself — no new source auditing.

**Do, in order:**

1. Read the whole phase log. Chase every `partial` row and every Notes entry that names an
   unproven suspicion or an out-of-scope observation: verify or discard each, filing issues for
   the ones that prove out, per the standard protocol. If Phase 3B is still partial because runs
   are missing, say so and leave it partial — it is the maintainer's to complete.
2. Sweep the filed issues as a set: dedupe across phases, cross-link related root causes,
   confirm every label set is still true, and confirm no issue describes something a later phase
   showed to be deliberate. Sweep the reopened issues the same way.
3. Compare this round's findings with the first round's by area and type, in the log, in a few
   sentences: where the second direction found what the first did not, and where neither found
   anything, which is the evidence a third round would start from.
4. Update this document a final time: complete the log, change the status banner to
   `✅ COMPLETE` with a one-line summary of what the audit filed and reopened, and move the file
   to `docs/todo/done/` in the same change, per the repository's plan-document rules. Update any
   inbound link.
5. Land that change, then report to the user: how many issues filed and reopened, by type and
   area, with the numbers of any `priority: high` or above, and the effectiveness findings
   listed separately because they are the ones this round was for.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-2-plan.md in full. You are running the **Wrap-up**
phase of the second codebase audit. Follow the wrap-up section's five steps
exactly: resolve every partial row and logged suspicion (leaving Phase 3B
partial only if its runs are still missing), reconcile the filed and reopened
issues as a set, compare the two rounds in the log, mark the plan ✅ COMPLETE
and move it to docs/todo/done/, land that change from a worktree (commit,
merge, push, remove the tree), and report the audit's totals to the user with
the effectiveness findings listed separately.
````
