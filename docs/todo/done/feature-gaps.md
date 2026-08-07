# Feature gaps — audit and plan

> **Status:** ✅ COMPLETE — Phases 1 (G1, G4) and 2 (G2, G3) shipped. Phase 3 was a hand-off rather
> than a build: of the two it raised, **G5 was closed separately afterwards** and **G6 is still
> open**, awaiting a decision. See [Outcome](#outcome).

An audit of what this application promises against what it does, run after
[baseline-prompt-new.md](../baseline-prompt-new.md) §10 closed and the five spec phases shipped.

**The written plans are genuinely complete.** Every item in the spec's Phase 4 component list exists
and works — history search, the atlas engine-spec JSON, preset import/export, the randomise action,
all seven model wrappers, all twenty-two `OutputConfig` fields reaching a control. §10's follow-up
list is closed. So the gaps below were not found by re-reading a checklist; they were found by
asking where the app's own pieces fail to meet each other, and by testing the claims the code makes
about itself.

Three of the four scheduled items are in `src/db/` and the history surface. That is not a
coincidence: persistence is the one area with no user-visible symptom until it fails, and the
fallback is the path nobody exercises by accident.

---

## Not in scope — owned elsewhere

Two agent worktrees are in flight against this repository. **Nothing in this plan may touch their
territory**, and a gap found inside it is recorded here without being scheduled:

| Worktree | Territory this plan avoids |
| --- | --- |
| `worktree-visual-polish` | `src/index.css`, `src/components/common/Tooltip.tsx`, motion tokens, ambient backdrop |
| `worktree-quantise-presets-ui` | `src/components/tabs/PresetsTab.tsx`, `PresetCard.tsx`, `QuantiseTab.tsx`, `src/components/quantise/` |

Phase 2 works in `HistoryModal.tsx` and `HistoryEntry.tsx`, which belong to neither.

---

## G1 — The fallback cannot report a failed write, so its error path is unreachable

`LocalStorageBackend.write` ([src/db/localStorageBackend.ts](../../../src/db/localStorageBackend.ts))
carries this comment:

> *Write one collection back. **Returns false when storage refused it (quota, private mode).***

All **five** call sites discard that boolean, and every mutating method returns
`Promise.resolve()` regardless. A refusal is therefore indistinguishable from success.

What makes this precise rather than theoretical is that **the error path already exists and is
already written**. `addLog` in [src/stores/useHistoryStore.ts](../../../src/stores/useHistoryStore.ts)
wraps the call and raises *"Could not save this prompt to history"* on rejection;
`usePresetStore` does the same for presets. On the SQLite path those toasts fire. On the fallback
they cannot fire at all, because nothing there ever rejects. The user sees the entry appear in the
list, and it is gone on reload.

Two ordinary conditions reach it: Safari's private mode, where merely writing throws, and the
roughly 5 MB quota — a compiled v2 prompt runs to ~2,500 words, so a full 200-entry history is
already megabytes, before presets.

**Fix:** make a refused write reject. No new UI is needed; the toasts are already there and are
currently dead code on this backend.

## G2 — A single history entry cannot be deleted

The only removal is **Clear history**, which `HistoryModal.tsx` itself gates behind a two-press
confirm because *"the history is the only thing in this app the user cannot rebuild from what is on
screen"*. One prompt copied by mistake can only be removed by destroying all of them.

`DELETE_PRESET_SQL` already establishes the by-id delete pattern for the other table; history has no
equivalent, and no `deleteLog` exists anywhere in `src/`.

**Fix:** `deleteHistoryLog(id)` through the `PersistenceBackend` interface, both implementations and
the worker protocol, `deleteLog(id)` on the store, and a delete control on `HistoryEntry.tsx`.

## G3 — The one irreplaceable collection is the one with no export

Custom presets can be exported to JSON and imported back
([src/components/tabs/PresetsTab.tsx](../../../src/components/tabs/PresetsTab.tsx)). Prompt history
cannot: `HistoryModal.tsx` and `HistoryEntry.tsx` offer copy-one, restore-one and delete-everything,
and nothing else.

The asymmetry is backwards. A preset is a handful of fields the user could retype; the history is,
by the modal's own words, the thing that cannot be rebuilt — and it is capped at 200, so entries are
silently discarded once that fills. It also lives in OPFS, which a browser may evict under storage
pressure without asking.

**Fix:** a download of the history as JSON, alongside the existing per-prompt `.md` download. Export
only — an import path would mean merging foreign history into a table keyed by generated UUIDs, and
nothing in the workflow asks for that.

## G4 — `MIGRATIONS` is dead machinery, and contradicts stated policy

[src/db/schema.ts](../../../src/db/schema.ts) exports two `ALTER TABLE … ADD COLUMN` statements, run on
every boot by [src/db/sqliteWorker.ts](../../../src/db/sqliteWorker.ts) with their errors swallowed.

Both columns they add — `subject_json` and `output_json` — are already declared in
`CREATE_TABLES_SQL`. On any database this application is capable of creating, `CREATE TABLE` makes
both columns, and then both `ALTER`s fail with "duplicate column name" and are caught and ignored.
The machinery cannot do anything except fail.

It also contradicts the project's standing policy, which is unambiguous:

> **No backwards compatibility, no shims, no migration machinery.** The app is unreleased; stored
> local data has no claim on the design.

**Fix:** delete `MIGRATIONS`, its loop, and its import.

## G5 — Saving a custom preset always creates a new one *(identified, not scheduled)*

`saveCustomPreset` in [src/stores/usePresetStore.ts](../../../src/stores/usePresetStore.ts) mints
`custom-${crypto.randomUUID()}` on every call. Load a preset, adjust a field, save it under the same
name, and you have two presets with that name — distinguishable only by which sorts newer. There is
no rename and no update path.

**Owned by `worktree-quantise-presets-ui`.** Recorded so it is not lost; do not build it here.

## G6 — Imagen has no condensed variant *(decision, not a task)*

[baseline-prompt-new.md](../baseline-prompt-new.md) §7 says of `GOOGLE_IMAGEN`:

> Imagen handles descriptive natural language well and long rule lists poorly, so consider emitting
> a **condensed** variant for this target.

The shipped wrapper prepends one framing sentence and passes the full template through. The
condensed variant was never built, and "consider" is the whole of the guidance — there is no
statement of what to cut.

A condensed template is a *second* template to keep true to the first, which is the duplication
§10.1's token validation exists to prevent. **Raise it; do not build it on a guess.**

---

## Verified sound — no gap

Recorded so a later audit does not re-tread them. The first entry is here because this audit got it
wrong on the first pass and the correction is worth keeping:

- **The history cap is enforced, in both backends.** `SELECT_HISTORY_SQL` carries no `LIMIT` and
  `fetchHistory` does not slice, which together look like an unbounded table — but the pruning is
  real and simply lives elsewhere: `localStorageBackend.addHistoryLog` slices to `HISTORY_LIMIT`
  before writing, and `sqliteWorker.ts` runs a `DELETE … WHERE id NOT IN (… ORDER BY created_at
  DESC LIMIT ?)` immediately after each insert. Both are covered by tests. Do not "fix" this.
- All twenty-two `OutputConfig` fields reach a studio control.
- All seven `TargetModelId` members have a wrapper branch, and `supportsManifest` gates
  `EMIT_MANIFEST` to the two conversational targets.
- `restoreLog` restores **both** subject and output config, not just the subject.
- The atlas calculator reads the live component count through `componentCountFor` rather than asking
  the user to retype it.
- The PWA registers with `autoUpdate`, so there is no missing update-prompt flow.
- History search, preset import/export, per-preset delete and the randomise action all exist.

---

## Phase 1 — The two persistence defects (G1, G4)

Both live in `src/db/`, touch the same files, and need no UI.

1. **Delete `MIGRATIONS`** (G4), the loop in `sqliteWorker.ts` that runs it, and the import.
2. **Make a refused write reject** (G1). `LocalStorageBackend`'s five mutating call sites currently
   drop `write`'s boolean; each should reject when it is `false`. Reject with an `Error` carrying
   the reason, so the message is available if a caller ever wants it — but note the stores
   deliberately catch and show their own copy, so nothing needs to read it today.

**Tests.** [src/db/localStorageBackend.test.ts](../../../src/db/localStorageBackend.test.ts) already
drives the backend through an injected `WebStorageLike` (its constructor takes one), so G1's test is
a storage double whose `setItem` throws, asserting each mutating method rejects. Add a store-level
test that the toast now fires on the fallback — that is the behaviour the user actually gets, and
the reason this is worth doing at all.

**Mutation-test each new test**: break the code it covers, watch it go red, restore. A test that
asserts a rejection is exactly the kind that passes for the wrong reason.

## Phase 2 — History delete and export (G2, G3)

1. `DELETE_HISTORY_SQL` in `schema.ts`, modelled on `DELETE_PRESET_SQL`.
2. `deleteHistoryLog(id)` on the `PersistenceBackend` interface
   ([src/db/backend.ts](../../../src/db/backend.ts)), both implementations, and the `WorkerCall` union
   in `workerProtocol.ts`. The name follows the interface's existing `addHistoryLog` /
   `clearHistoryLogs` / `deletePreset` convention.
3. `deleteLog(id)` on `useHistoryStore`.
4. A delete control on `HistoryEntry.tsx`. Icon-only, so it needs an `aria-label`; destructive, so
   it follows the modal's own two-press confirm rather than firing on first click.
5. An **Export history (JSON)** action in the modal's footer, using the existing `useDownload` hook.
   Serialise the stored shape, not the view — the search filter is a lens, not a selection.

**Verification.** This phase has a runtime surface, so drive it with the `verify` skill: delete an
entry, confirm it is gone after a reload, and export and open the file. A role-based Playwright
locator that cannot find a control is itself a finding.

## Phase 3 — Raise G5 and G6

Neither is a build. G5 belongs to the presets worktree; G6 needs a decision about whether a second,
condensed template is worth keeping true to the first. Report both; implement neither.

---

## Verification

```bash
npm run type-check && npm run lint && npm run test:run && npm run build && npm run format
```

`npm run test:run` collects any git worktree under `.claude/` alongside the real tree, so the
reported count is the sum of two checkouts whenever one is present. The honest figure comes from
`npx vitest run --exclude '**/.claude/**'`. With this document committed that is **376 tests across
38 files** — the doc-status suite gains a case per document, so adding a plan raises the count by
one on its own.

Then `/auto-review high` over the diff, and fix every confirmed finding.

---

## Outcome

What this plan actually did, recorded because the two items it *didn't* build are the reason
anyone would read it again.

**Shipped.**

- **G1** — `LocalStorageBackend.write` returns a promise and rejects when storage refuses, carrying
  the original `DOMException` as `cause`; all five mutating methods return it. The stores' existing
  toasts are reachable on the fallback for the first time.
- **G4** — `MIGRATIONS`, its loop and its import are gone.
- **G2** — `deleteHistoryLog(id)` runs from `DELETE_HISTORY_SQL` through `PersistenceBackend`, both
  implementations and the worker protocol to `deleteLog(id)` on the store and a two-press-confirm
  control on `HistoryEntry.tsx`.
- **G3** — `exportHistoryJSON()` and an **Export history (JSON)** action. The drawer's footer moved
  to `HistoryFooter.tsx`; adding the action put `HistoryModal.tsx` at the 150-line mark.

Driven in Edge against the real app in **both** persistence modes — SQLite over OPFS, and the
localStorage fallback with the database worker blocked — with identical results. Every control was
located by accessible name alone, and the delete was driven by keyboard. 376 → 399 tests across 38
files.

**Left unbuilt by this plan, and what became of each.**

- **G5 (saving a custom preset always creates a new one).** Deliberately not built here — it was
  `worktree-quantise-presets-ui`'s to own. **Closed separately, afterwards**, once that worktree
  turned out not to be taking it: `saveCustomPreset` now reuses the id of a preset already holding
  the typed name, so saving over one updates it instead of minting a duplicate, and
  `renameCustomPreset` supplies the rename path the gap said was missing. The collision rule is one
  pure function ([presetNames.ts](../../../src/utils/presetNames.ts)) shared by both paths and by
  the Save button, which reads **Update** when the name is already held — so an overwrite is
  announced before the press rather than confirmed after it.
- **G6 (a condensed Imagen variant).** Still needs a decision nobody has made. The guidance in
  [baseline-prompt-new.md](../baseline-prompt-new.md) §7 is the single word "consider", with no
  statement of what to cut; a condensed template is a *second* template to keep true to the first,
  which is the duplication §10.1's token validation exists to prevent. Building it on a guess would
  be worse than leaving it. **This is a question for the maintainer, not a task waiting for an
  implementer.**
