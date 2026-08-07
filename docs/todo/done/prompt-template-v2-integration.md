# Prompt template v2 — integration spec

> **Status:** ✅ COMPLETE — landed in full. Kept for the design rationale and the record of *why*, not as current guidance.

Implements [baseline-prompt-new.md](../baseline-prompt-new.md) against the code that already exists.
Read that document first — it holds the template text, the reasoning for each change, and the
Unsung Saviour presets. This one is only *how to land it*.

**This is a change request against shipped work, not a new phase.** Phases 1–4 of
[sprite-gubbins-spec.md](../sprite-gubbins-spec.md) delivered `src/utils/promptCompiler.ts` as a
faithful port of the original single-file template, plus the full component tree around it. That
port is correct — it did what it was asked. v2 changes what is being asked for.

Because Phase 4 has landed, the UI in step 7 modifies **shipped components**, not empty files.

---

## 1. Read this before touching anything

### 1.1 Clean break — no compatibility, no shims

**Decided by the maintainer (2026-08-07): this project maintains no backwards compatibility and
no migration shims.** The application is unreleased, so stored local data has no claim on the
design. Everything below follows from that, and none of it is optional:

- **Rename the identifiers outright.** `RESOLUTION_PROFILE` members lose their `_PIXEL_ART`
  suffixes. Do **not** add a read-time map from retired names to new ones.
- **Do not add migration machinery to `src/db/schema.ts`.** Its doc comment already says there is
  none because there has been no schema change to migrate — keep it that way.
- **Drop `custom_presets` rows rather than converting them.** A stored preset holding a retired
  identifier will not narrow to the new union on read. Delete the rows (or the local database) as
  part of landing v2; do not write a converter, and do not add a tolerant parse path that accepts
  both spellings.
- **Delete retired members entirely** rather than deprecating them. No `@deprecated` markers, no
  aliases, no "accepted but mapped" values.

The one thing that is *not* a shim and must stay: **runtime validation of data read back from
storage**. A row can still be corrupt or hand-edited, so a type guard that rejects an unknown
identifier is a live correctness guard, not a compatibility layer. Reject and drop; never
translate.

> `src/types/output.ts` states *"Renaming a member changes the prompt."* That remains true and is
> the point — v2 intends to change the prompt. The warning is about doing it accidentally.

### 1.2 Deletions this policy makes available

With no compatibility obligation, two things currently in the type unions should simply go rather
than being carried:

- **`FULL_DIRECTIONAL_POSE_LIBRARY` (111 components).** Established as unachievable in §8.4 of
  `baseline-prompt-new.md` — no current model delivers 111 correctly isolated components in one
  generation, so the mode reliably produces a silently-wrong sheet. Keeping a mode whose only
  outcome is failure is worse than removing it. The replacement workflow is N single-direction
  sheets sharing an `IDENTITY_LOCK`.
- **Most of the `CHATGPT_5_6_SOL` wrapper body — but not the target.** The target is real and
  stays. Its wrapper was written against v1, whose critical constraints sat at the bottom, and it
  compensated by restating them up front; v2's section 0 and section 9 now do that structurally, so
  roughly two-thirds of the wrapper is a duplicate. §7 of `baseline-prompt-new.md` gives the slim
  replacement and lists exactly what is dropped.

Both deletions shrink the surface rather than growing it, which is the point of the policy.

### 1.3 The `|| 'DEFINED'` doc comment is a considered position, and v2 overrides it

`promptCompiler.ts` defends the fallback deliberately. Its reasoning is sound but weighs only two
options — the token versus an empty backtick pair — and the third, **omitting the line**, is better
than both. §1 of `baseline-prompt-new.md` sets out why.

**Update the doc comment when you change the behaviour.** Leaving a comment that argues for the
opposite of what the code now does is worse than either position.

### 1.4 Scope guard

v2 adds parameters, which means new UI controls. `sprite-gubbins-spec.md` bans speculative
abstraction. Every parameter below earns its place by being *used by a shipped preset* — if a
control has no preset exercising it, it is out of scope for this change.

---

## 2. Work breakdown

Ordered so each step compiles and tests green on its own.

### Step 1 — Types (`src/types/output.ts`)

Add, in the existing `as const` + derived-type style:

```ts
export const RENDER_STYLES = [
  'PIXEL_ART', 'RETRO_PIXEL_ART', 'PAINTED_2D', 'CEL_SHADED', 'VECTOR_FLAT',
  'HAND_DRAWN_INK', 'RENDERED_3D', 'LOW_POLY_3D', 'CLAY_RENDER', 'SILHOUETTE_ONLY',
] as const;
export type RenderStyle = (typeof RENDER_STYLES)[number];

export const PROJECTIONS = [
  'THREE_QUARTER_TOPDOWN', 'PURE_TOPDOWN', 'TRUE_ISOMETRIC', 'DIMETRIC_2_1',
  'OBLIQUE_45', 'ORTHOGRAPHIC_SIDE', 'ORTHOGRAPHIC_FRONT',
] as const;
export type Projection = (typeof PROJECTIONS)[number];

export const DIRECTION_SETS = [
  'SINGLE_FRONT', 'THREE_CLASSIC', 'FOUR_CARDINAL', 'EIGHT_COMPASS', 'CUSTOM',
] as const;
export type DirectionSet = (typeof DIRECTION_SETS)[number];

export const RIG_MODES = ['NONE', 'POSE_LIBRARY', 'CUTOUT_RIG'] as const;
export type RigMode = (typeof RIG_MODES)[number];

export const BACKGROUND_KEYS = ['MAGENTA_FF00FF', 'PURE_WHITE', 'PURE_BLACK', 'TRANSPARENT'] as const;
export type BackgroundKey = (typeof BACKGROUND_KEYS)[number];

export const JOINT_CAP_STYLES = ['ROUNDED', 'SQUARED', 'TAPERED'] as const;
export type JointCapStyle = (typeof JOINT_CAP_STYLES)[number];

export const OVERLAP_MARGINS = ['NONE', 'HALF_CAP', 'FULL_CAP'] as const;
export type OverlapMargin = (typeof OVERLAP_MARGINS)[number];
```

Extend `DIRECTIONAL_MODES` with `CUTOUT_RIG_SINGLE_DIRECTION` and `TILESET_MODULAR`, **delete
`FULL_DIRECTIONAL_POSE_LIBRARY`** (§1.2), and
`PALETTE_LIMITS` with `UNRESTRICTED`. Extend `OutputConfig` with the new fields plus
`cameraElevation: number`, `spriteTargetSize: string`, `sockets: string`, `identityLock: string`,
`emitManifest: boolean`.

> **`OutputConfig` is documented as "every field is always set".** Honour that: give every new
> field a default in `useOutputStore` rather than making it optional. Optional fields would push
> `?? fallback` handling into the compiler, which is the shape §1.2 is removing.

If the file approaches the 150-line guardrail, split the rig-specific unions into
`src/types/rigging.ts` and re-export. Do not let it become a god file.

### Step 2 — Template engine (`src/utils/templateEngine.ts`, new)

Three functions, pure, no React:

```ts
export function substitute(template: string, values: Readonly<Record<string, string>>): string;
export function applyOptionals(template: string, values: Readonly<Record<string, string>>): string;
export function applyConditionals(template: string, config: Readonly<Record<string, string>>): string;
```

Edge cases that need tests, because each is a real failure mode:

| Case | Required behaviour |
| --- | --- |
| `[DEFINE:X]` with no value | **Throw.** A missed substitution must not reach the model as literal template text |
| `[OPTIONAL:X \| …]` with X empty or whitespace-only | Remove the whole line, leaving no blank gap |
| `[OPTIONAL:X \| …]` containing a `[DEFINE:X]` | Substitute *after* the optional resolves |
| `[IF:K=A,B] … [/IF]` | Include when K is A or B |
| `[IF:K!=A,B] … [/IF]` | Include when K is neither |
| Unclosed `[IF:…]` | **Throw** at compile time, not silently emit the marker |
| Two `[OPTIONAL:…]` lines adjacent, both removed | No double blank line left behind |

That last one matters more than it looks: with sixteen optional subject fields, a sparse subject
removes most of §1, and ragged blank lines are what makes generated prompts look broken.

### Step 3 — Descriptor maps (`src/constants/promptText.ts`, new)

`promptSections.ts` already holds `COMPONENT_BREAKDOWNS`, `PALETTE_TEXT`, `OUTLINE_TEXT`,
`LIGHTING_TEXT` and `ASPECT_TEXT`. Add the same shape for:

| Map | Keyed by | Note |
| --- | --- | --- |
| `RENDER_STYLE_TEXT` | `RenderStyle` | |
| `PROJECTION_TEXT` | `Projection` | |
| `DIRECTIONS_TEXT` | `DirectionSet` | |
| `BACKGROUND_KEY_TEXT` | `BackgroundKey` | |
| `JOINT_CAP_TEXT` | `JointCapStyle` | Reads mid-sentence — emit lowercase (`rounded`), not the enum |
| `OVERLAP_MARGIN_TEXT` | `OverlapMargin` | |
| `DEPTH_ORDER_TEXT` | direction | |
| `RESOLUTION_PROFILE_TEXT` | `ResolutionProfile` | **New requirement** — the old template emitted the bare enum |
| `SURFACE_DETAIL_TEXT` | `SurfaceDetail` | **New requirement** — likewise |
| `MIN_FEATURE_SIZE` | `ResolutionProfile` | |
| `ASSEMBLY_POSES` | `DirectionalMode` | The old template hardcoded the six-pose list; a tileset has none |

The last two rows of "new requirement" matter: `promptSections.ts` has no resolution or
surface-detail map because the current template interpolates `output.resolutionProfile` and
`output.surfaceDetail` **raw**, so the prompt literally reads
``Selected profile: `HIGH_RESOLUTION_PIXEL_ART` ``. v2 states them in prose, which needs the two
maps to exist.

`PRIMARY_DIRECTION` is **derived, not a stored field** — it is the first entry of the resolved
`DIRECTIONS` set (and the only entry for `CUTOUT_RIG_SINGLE_DIRECTION`). Derive it in the compiler;
do not add it to `OutputConfig`.

Copy the descriptions verbatim from `baseline-prompt-new.md` §2 — they are the prompt's wording,
not UI copy, and paraphrasing changes the output.

**Naming convention:** a `[DEFINE:FOO_DESCRIPTION]` token is filled from the map `FOO_TEXT`. That
covers all thirteen `_DESCRIPTION` tokens in the template. The two exceptions are
`[DEFINE:COMPONENT_COUNT]` and `[DEFINE:COMPONENT_BREAKDOWN]`, which come from the existing
`componentCountText()` and `COMPONENT_BREAKDOWNS` and need no new map. A table-driven test over
the token list against the map exports will catch a missed one.

`DEPTH_ORDER_TEXT` is keyed by direction, not by mode, because which limb is nearer the camera is a
property of facing. For `EIGHT_COMPASS`, south-facing puts both arms in front of the torso;
north-facing puts both behind; the diagonals split.

`MIN_FEATURE_SIZE` derives from `RESOLUTION_PROFILE` (§8.13) — it is currently the literal `2×2`.

### Step 4 — Compiler (`src/utils/promptCompiler.ts`)

Replace the inline template literal with the v2 template plus the engine from step 2. The template
text itself belongs in its own module (`src/constants/promptTemplate.ts`) so the compiler stays
under the line guardrail and the template can be diffed independently of the logic.

`generatePrompt()` keeps its signature and stays pure — the `useMemo` derivation in
`PromptPreview.tsx` depends on that and must not change.

### Step 5 — Model wrappers (`src/utils/modelWrappers.ts`)

Apply §7 of `baseline-prompt-new.md`: remove `--sw 250`, remove `background` from Midjourney's
`--no`, make the Midjourney version a parameter, and **add `FLUX` as a separate target** — it is
currently folded into `STABLE_DIFFUSION`, whose negative-prompt block Flux silently discards.

**Slim the `CHATGPT_5_6_SOL` wrapper** to the replacement in §7 of `baseline-prompt-new.md`. The
target stays; about two-thirds of its body is now duplicated by the template's own section 0 and
section 9, and restating a rule three times dilutes it rather than reinforcing it.

Wire `EMIT_MANIFEST` to `GENERIC` and `CHATGPT_5_6_SOL` only — the pure image endpoints cannot
return text alongside the image, so the option must be disabled for them rather than silently
ignored.

### Step 6 — Presets (`src/constants/presets.ts`)

Add the three Unsung Saviour presets from §6 of `baseline-prompt-new.md`. Take the values from
that document rather than re-deriving them; they come from the game's own art contract.

If `presets.ts` is near the guardrail, split to `src/constants/presets/` with one file per family
and a barrel — matching how `src/constants/categories/` is already organised.

### Step 7 — UI (`src/components/studio/OutputConfig.tsx`)

New controls. `OutputConfig.tsx` will exceed 150 lines, so split by concern — something like
`RenderStyleFields`, `ProjectionFields`, `RiggingFields` — rather than growing one panel.

**Show the rigging fields only when `rigMode === 'CUTOUT_RIG'`.** They are meaningless otherwise
and the panel is already dense.

### Step 8 — Atlas calculator (`src/utils/atlasCalculator.ts`)

It hardcodes the component count as `37 / 111 / 43`. Drop the `111` with its mode (§1.2), and add
counts for the two new modes — **15** for `CUTOUT_RIG_SINGLE_DIRECTION`, **16** for
`TILESET_MODULAR` — or the atlas preview silently lays out the wrong grid. **Derive the count from one
authority** shared with `componentCountText()` rather than adding a second literal — there are
already two copies of these numbers, and this change would make three.

---

## 3. Tests

`promptCompiler.test.ts` exists and will need updating rather than replacing.

Worth adding, because each pins a defect v2 fixes:

1. A cleared subject field **omits its line entirely** — assert the label does not appear at all,
   and that no `DEFINED` token survives anywhere in the output.
2. `[IF:RENDER_STYLE=…]` blocks include and exclude correctly, and no `[IF:` marker ever reaches
   the output.
3. An unconsumed `[DEFINE:X]` throws.
4. Every `DIRECTIONAL_MODE` has a component count in both the compiler and the atlas calculator,
   and **they agree** — a table-driven test over the union, so a new mode cannot be added without
   both.
5. Each Unsung Saviour preset compiles and its output contains its contract numbers (`48 × 96`,
   `30°`, `FLAT_NEUTRAL_ALBEDO`). This is the test that catches a preset drifting from the game.
6. A sparse subject leaves no doubled blank lines.

Test 4 is the highest-value one: the count triplicated across three places is the existing bug this
change would otherwise deepen.

---

## 4. What is deliberately not here

- **No post-generation image processing.** The quantisation step in §10 of `baseline-prompt-new.md`
  is real and needed, but it is an image pipeline, not a prompt change.
- **No sheet-splitter.** The 8-direction workflow is documented as eight manual runs. Automating it
  is worth doing and is out of scope here.
- **No `IDENTITY_LOCK` capture from an image.** The field is free text for now; deriving it from an
  accepted sheet needs a vision call.

---

## STATUS LOG

**(1) 2026-08-07 — Spec written, not started.** Written after reading `promptCompiler.ts`,
`promptSections.ts`, `modelWrappers.ts`, `types/output.ts` and `types/subject.ts`. Two things
needed a decision before step 1: how to handle the `RESOLUTION_PROFILE` rename against persisted
presets, and whether `CHATGPT_5_6_SOL` names a real model.

**(2) 2026-08-07 — Clean-break policy confirmed; §1.1 rewritten, §1.2 added.** The maintainer
confirmed the project keeps **no backwards compatibility and no shims**. That resolves the first
open decision outright: rename the identifiers, add no migration map, drop `custom_presets` rows
rather than converting them, and delete retired members instead of deprecating them — with runtime
validation of storage reads retained, since rejecting a corrupt row is a live correctness guard
rather than a compatibility layer. The policy also makes two deletions available that were
previously being carried, now §1.2: `FULL_DIRECTIONAL_POSE_LIBRARY` (unachievable at 111
components) and most of the `CHATGPT_5_6_SOL` wrapper body. Phase 4 has since shipped, so step 7
modifies existing components.

**(3) 2026-08-07 — `CHATGPT_5_6_SOL` confirmed real; the open question is closed.** The maintainer
confirmed ChatGPT 5.6 Sol is a current OpenAI frontier model. **The target stays**; only its
wrapper changes. It was written against v1, whose critical constraints sat in §8–9 at the bottom,
and compensated by restating them up front — v2 makes section 0 the done-condition contract and
section 9 the verification pass, so about two-thirds of the wrapper is now a duplicate that
dilutes rather than reinforces. §7 of `baseline-prompt-new.md` holds the slim replacement and
itemises what is dropped. Nothing in the spec now blocks step 1.

**(4) 2026-08-07 — Shipped.** All eight steps landed, with the template engine, the descriptor
maps, the rewritten compiler, the corrected wrappers, the three Unsung Saviour presets, the split
output panel and a single component-count authority. Two departures from the spec above, both
taken to keep the count and its inventory in agreement, which is the mechanism v2 exists to
protect:

- **`TILESET_MODULAR` is 14, not 16.** §6 of `baseline-prompt-new.md` states sixteen tiles in prose
  but enumerates fourteen. Shipping sixteen against a fourteen-entry inventory would reproduce the
  silently-wrong sheet the count is there to catch; fourteen is merely two tiles short. Name the
  two missing tiles and both numbers move together.
- **`DIRECTIONS` ships without `CUSTOM`.** The free list needs a field to hold it, §1.4 admits no
  control that no preset exercises, and a direction set resolving to nothing emits an empty
  "Directions required" line — the same reasoning that deleted `FULL_DIRECTIONAL_POSE_LIBRARY`.

Also worth recording: v2 has no mechanism for **additional anatomy** and the component count. §1
declares worn details are painted on "unless listed under additional anatomy", which makes such
anatomy separate pieces, while §0 demands *exactly* N components and §4 lists exactly N. The
template as written was implemented unchanged rather than inventing a resolution, so a subject with
additional anatomy asks for more pieces than it counts.

**(5) 2026-08-07 — All three open points closed by the maintainer; `baseline-prompt-new.md`
corrected to match.** The two departures in (4) are no longer departures, and the additional-anatomy
gap has a resolution:

- **`TILESET_MODULAR` is 16.** The two missing tiles are named: the wall face gains **inner-left**
  and **inner-right** corners, so its corner list matches the wall top's outer/inner pairing. This
  was chosen over padding the count with two more floor edge trims because it closes a real hole —
  with only left/right face corners a concave wall junction had no tile, and an inner corner is
  neither a mirror nor a rotation of an outer one, so nothing in the set stood in for it. Floor
  trims, being rotatable in-engine, would have been padding. §6 of `baseline-prompt-new.md` now
  enumerates sixteen and its prose is finally true.
- **`DIRECTIONS.CUSTOM` is deleted from the specification** rather than built, so the document and
  the code agree. Beyond the reasons already recorded, a free list breaks the closed `Direction`
  union open and with it `DEPTH_ORDER_TEXT`'s exhaustiveness — an arbitrary facing has no
  depth-order answer.
- **Additional anatomy extends the inventory.** Named anatomy becomes real entries at the end of §4
  and real additions to the count, rather than being folded into a neighbouring component (which
  would have resolved the contradiction by deleting the capability — a tail that cannot be its own
  rigid segment is useless to a cut-out rig) or split onto a follow-up sheet (which cannot share
  pivot registration with the body). Counting it required the field to *be* countable, so the
  option pools now carry explicit `×N` multipliers and `NONE` is a sentinel that emits no line at
  all. Section 4's heading moved out of the static per-mode breakdowns into `componentSet.ts` for
  the same reason the count exists: a heading reading "15 in total" above a section 0 demanding 18
  is exactly the disagreement a model resolves arbitrarily.

One shipped archetype changed as a consequence, and it is worth recording rather than leaving to a
diff. **Cybernetic Attack Drone moves from `CORE_DIRECTIONAL_VARIANTS` to
`SINGLE_DIRECTION_POSE_LIBRARY`.** Its `Double Pair Wings` used to be prose that cost nothing;
counted, it is four components, and 43 + 4 is past the ceiling §8.4 established while 37 + 4 is not.
The mode gave way rather than the wings, because a winged creature is the case additional anatomy
exists to serve — and it is the only CREATURE archetype, so dropping the wings would have left the
capability with no worked example in that category. The ceiling is now enforced against every
shipped preset rather than against the mode counts alone.

Cross-origin isolation was reviewed in the same pass and **kept**. It is not what makes SQLite work
— that is the worker — but COEP `require-corp` is the only thing actually enforcing the
"no cross-origin subresource" rule, and the cost is one reload on a first visit. No code changed.
