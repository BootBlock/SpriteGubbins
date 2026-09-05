/**
 * The heading of section 2's native-grid block, named here because a second file has to point at it.
 *
 * `utils/modelWrapperText/sol.ts` tells Sol to carry that block across its hand-off to the image
 * tool word for word, and a hand-typed copy of the heading in the wrapper would go stale the first
 * time this one is reworded — silently, since a pointer at a heading that no longer exists reads as
 * an instruction rather than as a fault. One constant, substituted into the template below, is what
 * makes the two the same string rather than two strings a test has to keep level.
 *
 * It is the only heading extracted this way, because it is the only one another file names. A
 * heading cited solely by the prose around it stays written where it is read. It sits above the
 * template's own documentation rather than between it and the constant, which would leave that
 * hundred-and-fifty-line comment attached to this three-word string.
 */
export const NATIVE_GRID_HEADING = 'The native grid, and the scale it is delivered at';

/**
 * The prompt, before substitution.
 *
 * Its own module so the compiler stays logic and this stays text: the template can then be diffed,
 * reviewed and argued about on its own, which is what it needs — every line here is a rule a
 * generator will follow, and the difference between a usable sheet and an unusable one is usually
 * one sentence.
 *
 * Rendered by `utils/templateEngine.ts`; the markers are documented there. Section 0 sits first
 * deliberately: attention weighting favours early tokens, and background, pixel density and "no
 * text" are the constraints that fail most often. Section 9 repeats them as a self-audit, which is
 * the one place redundancy earns its keep.
 *
 * **Nothing here writes a label for a subject field, and nothing here names a body part.** Section
 * 1's sixteen lines take their labels from `[DEFINE:*_LABEL]`, which the compiler fills from the
 * category's own field definitions, because a label fixed in this file is a label written for one
 * category and read by all six: a tank's *Service Condition* reached the model as "Age / Vitality",
 * its turret as "Anatomy base", and its vision slit as "Head & sensory features" — every value
 * correct and every label from the category the sixteen keys were first designed for. The same
 * defect wore a different shape wherever the prose reached for a worked example, so section 0's
 * scale rule now takes `[DEFINE:SCALE_EXAMPLE_DESCRIPTION]` and the rig sections of 5 and 9 talk
 * about *segments* rather than limbs. **A new rule that wants a concrete example needs one that is
 * true of a building and a pistol**, or a per-category map in `constants/promptText/` to hold six.
 *
 * **Nothing here names this sheet's assembled whole either, and that was the last of the fixed words
 * to go.** Sections 4, 8 and 9 each state the same failure — exploded parts drawn as one finished
 * thing — and all three said it in a figure's vocabulary on every category, so a terrain sheet was
 * told not to draw an assembled *figure* while the composed landscape it actually comes back as went
 * unnamed. The three take `[DEFINE:CATEGORY_ASSEMBLY_INSTRUCTION]`, `[DEFINE:CATEGORY_ASSEMBLY_EXCLUSION]`
 * and `[DEFINE:CATEGORY_ASSEMBLY_AUDIT]` from `CATEGORY_ASSEMBLY`, which holds the same claim in the
 * two negative channels as well. **They are three defines rather than one spliced three times**,
 * because an instruction, an exclusion and a check the reader performs are three different jobs — the
 * check in particular has to qualify every noun it uses, or it fails a sheet on a component section 4
 * required, which is the mistake `CATEGORY_AUDIT_TEXT` records having made.
 *
 * **Neither of those two lists writes its own numerals**, because both are assembled conditionally
 * and a hand-numbered list cannot survive that: the layout section's rig and pixel-art checks appear
 * independently, so numbering them 7 and 8 emitted `…6. 8.` on a pixel-art sheet without a cut-out
 * rig — on the targets that see that list at all, since the whole of it sits behind
 * `[IF:DELIBERATES]`. `[N].` is numbered at render time by `applyNumbering`, so an item that is
 * dropped takes its number with it.
 *
 * **No section writes its own numeral either, and for the same reason one section further out.** A
 * heading declares itself — `## [SECTION:EXCLUSIONS]. EXCLUSIONS` — and prose cites it as
 * `section [SEC:EXCLUSIONS]`; `applySectionNumbers` walks the surviving headings and resolves both.
 * The rig section is conditional and nine of the thirteen categories have no rig at all, so a
 * hand-numbered document ran `## 4.` straight into `## 6.` on every prompt those categories ever
 * compiled — a gap in the numbering of a document that cites its own sections several hundred times.
 * That defect had already been met once, at the adherence report, and answered by writing its heading
 * twice with each copy behind a gate; that does not survive a second conditional section, and it left
 * the citations to be kept in step by hand regardless. **A section number is therefore never written
 * down anywhere in this file** — `promptTemplate.test.ts` fails on one that is.
 *
 * **A line carrying one of those markers runs past this project's 110 columns, and is left that
 * way.** The marker is a dozen characters in the source and one digit in the output, so the line
 * breaks here are the breaks the *model* reads: re-wrapping the source to 110 would re-wrap the
 * emitted paragraphs to something narrower and ragged, and change the prompt for every subject to
 * tidy a file. Prettier does not reformat inside a template literal, so nothing forces the issue.
 *
 * **Three passages beyond that repeat something deliberately, and they divide by what they repeat.**
 * Section 3's chirality rules and the closing invariants repeat a *derived* fact rather than a rule;
 * section 8's closing paragraph repeats a rule, and the paragraph further down says what bought it.
 *
 * The derived fact is the leading side, and which side a yaw leads with is stated inside each
 * facing's own paragraph by `FACING_TEXT`, three sentences deep and mixed in with what the yaw
 * hides; the ledger states the same answer as one line per facing, beside the
 * rule that consumes it. **Only the ledger is computed** — from `leadingSide` — and `FACING_TEXT` is
 * thirteen hand-written sentences, so what stops the two drifting is `chirality.test.ts`, which
 * parses the side each of those sentences puts in bold and fails unless the arithmetic agrees. That
 * distinction matters to whoever edits the wording next: the prose is the half that can go wrong,
 * and a test rather than a derivation is what catches it. The closing
 * `RENDER-CRITICAL INVARIANTS` section is there for the same reason at the other end of the
 * document: OpenAI's image guidance says outright to *repeat any requirement that must stay fixed*,
 * and `utils/modelWrapperText/sol.ts` records why that guidance and the *lean prompt* guidance are
 * both true — they address the model reading this specification and the model rendering from it, and
 * the second of those never sees anything but what survived the hand-off.
 *
 * **That closing section carries the directional invariants and nothing else, and the omissions are
 * the decision.** It is gated on `MULTI_DIRECTION`, and it does not restate the count, the
 * background or the ban on text. Those three are section 0's opening items *and* checks of the
 * layout section's audit, so a third copy is the diluting one this file warns about
 * above — and they are not what the reported failure was. The chirality rules are: they sit three
 * subsections deep in section 3, they are the newest thing here, and there is nothing else between
 * them and `Generate the sheet now`. On a single-facing sheet there is no distance to close, because
 * the rules that survive there are section 3's own two paragraphs. The budget is what forced the
 * question and it is worth recording: `presetCoverage.test.ts` holds a shipped preset to four fifths
 * of its target's documented ceiling, and the first draft of this section — five items, ungated —
 * spent the last of that headroom on a sheet with one facing, for lines that sheet did not need.
 *
 * **The adherence report is a third mention of those checks, and it deliberately does not restate
 * them.** It points at the layout section's list instead, because the two are asking for different
 * things from the same checks — that list audits *before* delivery so the sheet can still be fixed,
 * and the report audits what was actually delivered so the *template* can be. Writing the list out
 * again there would be the diluting third copy `utils/modelWrapperText/sol.ts` describes, in the
 * section least able to afford it.
 *
 * **The delivered canvas shape is stated in section 0 as well as in the layout section, and the
 * placement is the whole of the change.** Measured across a run pack of 27 real GPT-5.6 Sol sheets,
 * twelve came back at 3:2 where the prompt asked for a wide 16:9. This document stated the ratio in
 * exactly one place — the layout section's arrangement sentence — which is inside no block
 * `utils/modelWrapperText/sol.ts` names and inside no check the self-audit runs. (`midjourney.ts`
 * appends an `--ar` flag as well, from the same field, and reaches a target this pack never ran.)
 * It is also the one
 * figure in that pack lost at the level of the *file*: a reader who gets the wrong shape cannot
 * re-crop it, because the components were laid out for the shape that came back. So it now sits
 * with the count, the key colour and the text ban — the properties of the delivered image that
 * survive on 26 or 27 of those 27 sheets — and the self-audit checks it beside them. **Naming
 * section 0 is what carries it across the Sol hand-off**, which is why nothing was added to that
 * wrapper's list: it already protects the whole section, so a contract item is protected by being
 * one. The layout sentence keeps the ratio as well, deliberately — all eight compositions in the
 * pack that carried that sentence delivered a 16:9 sheet, so it is the half that already worked.
 * **What none of this establishes is what Sol returns now**, which needs a re-run of the pack and
 * cannot be settled from here.
 *
 * **The item is one sentence because the argument above is for a maintainer and not for a
 * renderer**, and because the thirteen estimated tokens it costs did not fit. Qwen's documented
 * 4,500-token ceiling is the tightest the app compiles against, and the library's only worked
 * example for it — `Side-On Rail Gun Car` — sat five tokens under the four fifths
 * `presetCoverage.test.ts` allows a preset. So a contract item stating the shape and nothing else
 * still broke that card, and the previous answer to this, recorded at `MAX_BUDGET_SHARE`, was to
 * measure the template's wording against the ceiling rather than choose it for the sheet. That
 * cannot be the answer twice: the preset gave the margin back instead, and says so in its own file.
 *
 * **Section 3 names this subject's one-sided features, and section 9 stopped asking the model to
 * choose one.** The old bullet read "pick one feature the subject carries on one side and not the
 * other — its **chirality witness** — and trace that one feature through every view", and measured
 * across 27 real GPT-5.6 Sol sheets it fails twice over. It picks **one**, so a subject carrying two
 * left the second unconstrained: on `S1-cardinals` the holstered sidearm was drawn on the west torso
 * and pelvis and absent from the east ones, exactly as asked, while the head went on reflecting.
 * And a witness to a prohibition is a rule with the figure taken out of it — one composition named
 * the undercut unprompted and the delivered heads were still a reflection, so naming it is necessary
 * and is not sufficient. Every measurable opposite-turn pair in that pack is a reflection: 12 of 12.
 *
 * The compiler names them instead, per feature and per facing, from `utils/oneSidedFeatureLedger.ts`
 * — which is a derivation rather than a second statement of the leading side, exactly as the
 * leading-side ledger further down this section is. **The delegation survives as the other branch and that is not a
 * compatibility path**: the fields are unfiltered combo boxes, so a reader can describe a one-sided
 * feature in their own words, and the compiler can only enumerate what a pool declared. A subject it
 * cannot read still has to be checked, and asking for a witness is all that is left for it. Both
 * branches are gated on the one flag, so a prompt never carries both and never carries neither.
 *
 * **The block sits outside `[IF:MULTI_DIRECTION]`, unlike the leading-side ledger beside it**, and
 * that is the case `S3-cutout-rig` bought: it draws one facing, has no opposite-turn pair at all,
 * and still failed the same rule two runs of three — once by duplicating the holster onto both
 * thighs, once by splitting the sidearm and the pouch one to each flank. A sheet with nothing to
 * compare still has to be told which attribute is one-sided. What it drops there is one sentence —
 * the one comparing a view with the view opposite it, which is gated on `MIRROR_PAIRS` because that
 * is when the sheet holds such a pair at all; the two instructions beside it, not to rotate the
 * feature into shot and not to draw a second copy on the other flank, are what a single-facing sheet
 * needs most. Under a plan view the per-facing visibility goes instead, since a turn occludes
 * nothing there, and the naming sentence stays — the mirrored copy that camera invites is precisely
 * the one that moves a left-sided feature onto the right.
 *
 * **The block yields to the identity lock, which is the one route by which a side is already
 * settled.** Section 3's own default is conditional — it applies "where section 1 names such a
 * feature without saying which side carries it" — and section 7 says that where the lock fixes a
 * side "this sheet does not choose one". No pool value names a side, so the survey behind
 * `oneSidedOptions` cannot reach that case; the lock is free text and can. A first draft stated the
 * left flatly and produced one prompt whose section 7 said right, whose section 3 said left, and
 * whose section 9 audited against the left. The precedence sentence is gated on `IDENTITY_LOCK`, so
 * it costs nothing on the twelve sheets in thirteen that carry no lock.
 *
 * **The native grid is stated in three places, and the split is what makes each of them necessary.**
 * Section 0's item requiring every component to be rendered at the delivered output resolution is
 * a rule about *resampling*, and as written it read as a ban on the one
 * enlargement pixel art is made of — so the carve-out belongs in the item it would otherwise
 * contradict, not only where the scale is stated. **Both the carve-out and the sentence scoping the
 * item to resampling sit inside the gate**, which is what keeps a prompt with no native grid word for
 * word what it was: the scoping is only load-bearing where something has to be carved out of it, and
 * ungated it cost every prompt the app composes some twenty tokens — enough, measured, to put the
 * tightest shipped preset past the share `presetCoverage.test.ts` allows it. Section 2 states the
 * grid and the figure, because
 * that is where the target component size is. The self-audit's line is the third and earns its place
 * by asking a different question: the other two say what to draw, and it asks what the delivered
 * sheet actually holds — which is precisely the check the reported failure walked past, a sheet
 * returning "far more interior detail than a true 16 × 32 sprite could contain". All three are gated
 * on `NATIVE_GRID`, the compiler's single answer to whether this configuration has a native grid at
 * all, so none of them can appear where there is no grid and no figure to point at. The audit line
 * carries `[IF:DELIBERATES]` above it as well, as every check in that section does — a target with no
 * pass in which to re-read the sheet gets the two instructions and no checklist, which is that gate's
 * own argument rather than a hole in this one.
 *
 * **Section 2's target-size line is stated twice, because the field names two different quantities.**
 * On a sheet of whole deliverable units — a tile, a glyph, an icon cell, a frame — a component *is*
 * the thing the reader is pricing, so `- Target component size:` says what it means. A sheet whose
 * components are the parts one subject is cut into is the other case: a cut-out rig draws a head, a
 * torso, a pelvis and twelve limb segments, and the shipped rig presets state a size for the figure
 * those assemble into — so that label and that value contradicted each other on one line, and the
 * generator was left to resolve it. The same is true of a directional core, a pose library, an
 * articulation sheet and an ITEM part library — whose presets write `32 × 48 px per figure`,
 * `32 × 48 px per frame cell` and `64 × 64 px per icon cell` respectively.
 * The gate is `ASSEMBLED_TARGET`, and it is the resolved *sheet plan's* answer rather than the rig
 * field's — a sheet of units may carry `CUTOUT_RIG` as a legitimate request while still stating a
 * size per unit, which is why `RIG_MODE` is the wrong flag here even though section 5 uses it.
 * `utils/componentTargetSize.ts` computes it from `SheetPlan.targetQuantity`, and is the same answer
 * for the readers on the app's side of the same field.
 *
 * **Both wordings are category-neutral, because the sheets that take the assembled one are not all
 * figures.** An OBJECT part library, an ITEM's grip and shaft and a BACKGROUND layer library all
 * state an assembled size, so the line says *the complete subject* rather than *the whole figure* —
 * the same generic noun section 1 is written in.
 *
 * **The pixel-discipline minimum names the grid too, and it is the one mention that is not gated.**
 * That bullet has to appear on every pixel-art sheet, grid or no grid, so gating it would delete the
 * floor on interior detail from the majority of prompts the app composes. What varies is its *unit*,
 * which arrives inside `[DEFINE:MIN_FEATURE_SIZE]` from the same answer the gate above is computed
 * from — *native pixels* where the block below defines one, *delivered pixels* where it does not.
 * It read *native pixels* unconditionally until then, which put a measurement in a unit the document
 * never established into the very first prompt the app shows anybody: `DEFAULT_OUTPUT_CONFIG` is
 * `PIXEL_ART` on `HIGH_RESOLUTION` with no target size, which is a stock profile and therefore no
 * grid. That is why the unit is not written here beside the figure — a template with a unit of its
 * own is a second place that has to agree with the gate, and it did not.
 *
 * **Section 8 closes by restating section 0's exclusion precedence, and the distance between the two
 * is the argument for it.** The rule is stated where the precedence order is settled, which is the
 * far end of the document from the list that triggers it — and a sheet came back wearing a holstered
 * sidearm that section 1 had named and section 8 prohibited, with the model that drew it reporting
 * the pair as a conflict it had resolved rather than one already decided. Neither side of that
 * conflict is computable: `worn_details` and `exclusions` are two of the same sixteen free-text
 * fields, so ruling that `No weapons` overrules a holster but not a pauldron is a judgement about
 * English, and this app makes no outbound model call to make it with. What it can do is put the
 * answer beside the question, so a reader meets the ranking at the point it bites rather than being
 * expected to carry it eight sections.
 *
 * **The restatement carries the inventory carve-out with it, and that is not padding.** A version
 * that stopped at "already overruled" would have section 8 telling a reader to drop a component
 * section 4 requires — one prompt disagreeing with itself, which is the failure the repetition
 * exists to prevent rather than a second instance of it.
 *
 * **The carve-out is stated as the boundary it is, not as a class of thing that is exempt**, and
 * that phrasing is the difference between a fix and a wider hole. A draft of this paragraph opened
 * the exception with "Components are the exception" — but every object drawn on this sheet *is* a
 * component, so read as far as the emphasis and no further, it exempted the whole image from the
 * ban it had just restated. Section 0's wording is what closes it: the ranking decides what a
 * component **shows**, not which components exist, so a torso whose worn detail is excluded is
 * drawn without the detail rather than left off the sheet. Both copies now carry that sentence, and
 * the copy in section 8 says "leave the element out **of the image** entirely" for the neighbouring
 * reason — the component map and the adherence report ask for text *beside* the image, and an
 * unqualified "leave it out" reaches them.
 *
 * `promptCompiler.test.ts` slices each section and asserts, under every category, that both copies
 * carry the ranking, the ban on a compromise, and that boundary — so a half cannot be dropped from
 * one of them, and neither can drift out of the section it belongs in. What the tests cannot hold is
 * the *wording*: they match on fixed substrings, so a qualifying clause appended to either copy
 * would leave them green. Read both when either changes.
 *
 * Mirrored verbatim in `docs/todo/baseline-prompt-new.md` §3, which is where the reasoning behind
 * each rule lives. This constant is the one the app emits and therefore the source of the pair, so
 * a change made here is copied over that fence in the same commit —
 * `tests/prompt-template-mirror.test.ts` compares the two character for character and fails the
 * build if they ever disagree.
 */
export const PROMPT_TEMPLATE = `# MODULAR SPRITE-SHEET SPECIFICATION — [DEFINE:CATEGORY]

You are producing a **reference sheet for game-asset extraction**: an exploded grid of isolated,
reusable components that a tool will cut apart and reassemble. It is not an illustration, a scene,
or a character portrait. Every rule below serves extraction.

## [SECTION:CONTRACT]. NON-NEGOTIABLE OUTPUT CONTRACT

Satisfy this section before any aesthetic consideration.

[N]. Exactly [DEFINE:COMPONENT_COUNT] components, each visibly separate, none touching or
   overlapping — and none carrying another: a component that arrives with a neighbouring piece
   still attached to it is two entries merged, not one component.
[N]. The delivered image is [DEFINE:ASPECT_DESCRIPTION] canvas.
[N]. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION], filling all space between
   components. No gradient, texture, vignette, cast shadow, contact shadow or ground plane.
[IF:LETTERING_IS_A_COMPONENT!=yes]
[N]. No text, labels, numbers, captions, watermarks or signatures anywhere in the image.
[/IF]
[IF:LETTERING_IS_A_COMPONENT]
[N]. The components section [SEC:INVENTORY] lists are characters, and they are the **only** lettering
   this image carries. No watermark, signature, caption, legend, index number or codepoint anywhere
   in it, and nothing written beside a component to name it — grid position is the only identity a
   component has, exactly as it is on every other sheet. No two components are drawn touching or set
   side by side as a word, a name or a specimen line.
[/IF]
[N]. Nothing annotating the image: no arrows, callouts or grid lines, and no frame or border around
   the image or around a component.
[N]. One consistent scale across every component: [DEFINE:SCALE_EXAMPLE_DESCRIPTION].
[N]. Render every component directly at the delivered output resolution. Do not compose at a larger
   virtual canvas and downscale, and do not upscale a smaller one.
[IF:NATIVE_GRID]
   What that forbids is **resampling** — any resize that invents intermediate values, softens a
   boundary or leaves a pixel edge blurred. A native pixel grid presented at a whole-number multiple
   does none of that, and is what this sheet asks for: section [SEC:STYLE] states the grid and the multiple,
   and every edge in the delivered image is an edge that was drawn on that grid.
[/IF]
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
[N]. One square-pixel grid at one pixel density across the entire sheet. No anti-aliasing on
   silhouette edges, no smooth gradients, no sub-pixel blending, no vector-smooth curves.
[/IF]
[IF:PALETTE]
[N]. Every colour on every component comes from the palette section [SEC:STYLE] fixes, and no colour outside
   it appears anywhere on them. The background field is the exception and stays the key colour
   named above.
[/IF]
[IF:SERIES]

**This is sheet [DEFINE:SERIES_POSITION] of [DEFINE:SERIES_TOTAL] of one deliverable, and the count
above is this sheet’s own.** The other sheets are generated separately, each from its own copy of
this specification, and section [SEC:ASSEMBLY] says what each of them carries. Draw this sheet’s inventory and
nothing else: never add a component because the set looks incomplete without it, and never drop one
because another sheet carries something like it.
[/IF]
[IF:RETURNS_TEXT]

**The subject’s category decides what kind of components this sheet may contain; the inventory in
section [SEC:INVENTORY] then names the exact set within that kind.** These two can never legitimately disagree. If
the inventory below describes components that do not belong to [DEFINE:CATEGORY_ARTICLE] [DEFINE:CATEGORY] — anatomy on a
building, floor tiles on a character — this specification is malformed. Say so rather than resolving
it: drawing what the inventory asks for is how a sheet ends up being the wrong subject entirely.
**That settles before the precedence order below is reached** — a category disagreement is a fault
to report, never a conflict to rank.
[/IF]
[IF:MULTI_DIRECTION]

**A component the inventory lists in more than one direction is one component, drawn once per
direction.** Each of those drawings is that same geometry turned to the object yaw section [SEC:CAMERA] gives
it — never one view repeated, never a mirrored copy, never the same view with its details moved.
Section [SEC:CAMERA] states how far each turn goes and what it must show; this is the contract that the turns
happen at all, and it is the clause a directional sheet misses most often.
[/IF]

**Where two instructions pull against each other**, satisfy them in this order: the component count
and inventory · each component’s identity and grid position · the object orientation each component
is asked for · the fixed camera, one scale and pivot compatibility · subject identity · the render
style · surface aesthetics. Nothing later overrides anything earlier, so a general aesthetic
preference never overrules a component’s stated direction.
[IF:VALIDATION_PASS]

**This sheet’s render style is a validation pass, and what it states about the surface outranks the
subject’s colour and material attributes.** Section [SEC:STYLE] says what the pass withholds and what
is drawn in its place; a pass that lost to the colours named above would deliver the finished sheet
it was run instead of. Everything else in the subject definition keeps the rank the order above
gives it.
[/IF]

**An exclusion in section [SEC:EXCLUSIONS] outranks every attribute that asks for the same visible element.**
Where the subject definition, the render style or any other description names something section [SEC:EXCLUSIONS]
excludes, leave that element out of the image entirely — never satisfy both by drawing a reduced,
integrated or decorative version of it. That decides what a component *shows*, not which components
exist: where section [SEC:INVENTORY] lists an entry section [SEC:EXCLUSIONS] excludes, draw the entry, because the count and
inventory rank first and an omitted one mis-maps every component after it.

---

## [SECTION:SUBJECT]. SUBJECT DEFINITION

This section is the **sole authority** for the subject’s design. Do not invent, infer or embellish
any attribute not stated here.

**An attribute that is absent from this list is yours to decide** — choose the plainest option
consistent with what *is* stated, rather than inventing a distinctive one. Absence is a delegation,
not an omission to be filled dramatically.

- Category: [DEFINE:CATEGORY]
[OPTIONAL:SPECIES             | - [DEFINE:SPECIES_LABEL]: [DEFINE:SPECIES]]
[OPTIONAL:GENDER              | - [DEFINE:GENDER_LABEL]: [DEFINE:GENDER]]
[OPTIONAL:AGE                 | - [DEFINE:AGE_LABEL]: [DEFINE:AGE]]
[OPTIONAL:ROLE                | - [DEFINE:ROLE_LABEL]: [DEFINE:ROLE]]
[OPTIONAL:SETTING             | - [DEFINE:SETTING_LABEL]: [DEFINE:SETTING]]
[OPTIONAL:BUILD               | - [DEFINE:BUILD_LABEL]: [DEFINE:BUILD]]
[OPTIONAL:SILHOUETTE          | - [DEFINE:SILHOUETTE_LABEL]: [DEFINE:SILHOUETTE]]
[OPTIONAL:FACE_HEAD           | - [DEFINE:FACE_HEAD_LABEL]: [DEFINE:FACE_HEAD]]
[OPTIONAL:ANATOMY             | - [DEFINE:ANATOMY_LABEL]: [DEFINE:ANATOMY]]
[OPTIONAL:CLOTHING            | - [DEFINE:CLOTHING_LABEL]: [DEFINE:CLOTHING]]
[OPTIONAL:WORN_DETAILS        | - [DEFINE:WORN_DETAILS_LABEL]: [DEFINE:WORN_DETAILS]]
[OPTIONAL:PRIMARY_COLOURS     | - [DEFINE:PRIMARY_COLOURS_LABEL] (dominant): [DEFINE:PRIMARY_COLOURS]]
[OPTIONAL:ACCENT_COLOURS      | - [DEFINE:ACCENT_COLOURS_LABEL] (highlights only): [DEFINE:ACCENT_COLOURS]]
[OPTIONAL:MATERIALS           | - [DEFINE:MATERIALS_LABEL]: [DEFINE:MATERIALS]]
[OPTIONAL:ADDITIONAL_ANATOMY  | - [DEFINE:ADDITIONAL_ANATOMY_LABEL]: [DEFINE:ADDITIONAL_ANATOMY]]

Every fitted, applied and worn attribute listed above is **painted onto** the component it sits on,
never drawn as a separate piece.
[IF:CLOTHING_IS_A_COMPONENT]
**[DEFINE:CLOTHING_LABEL]** is excepted: section [SEC:INVENTORY] draws it as components of its own.
[/IF]
[IF:ADDITIONAL_ANATOMY]
[IF:ANATOMY_PER_VIEW]
**[DEFINE:ADDITIONAL_ANATOMY_LABEL]** is excepted: section [SEC:INVENTORY] lists each piece named there
separately, drawn at every facing this sheet covers and counted once per view, like the components
beside it.
[/IF]
[IF:ANATOMY_PER_VIEW!=yes]
**[DEFINE:ADDITIONAL_ANATOMY_LABEL]** is excepted: section [SEC:INVENTORY] lists each piece named there
separately and counts it as a component of its own.
[/IF]
[/IF]
Do not infer props, weapons or equipment from the role: if it is not listed above, it does not exist.

Material descriptions define **visual identity, not rendering complexity**. Translate every
material into the simplified shapes and controlled value bands of the selected render style.
[IF:IDENTITY_LOCK]

### Identity lock — match a previous sheet
This sheet depicts the same individual as a previously generated one. Reproduce exactly:
[DEFINE:IDENTITY_LOCK]
Where this conflicts with anything above, the identity lock wins.
[/IF]

---

## [SECTION:STYLE]. RENDER STYLE

- Style: [DEFINE:RENDER_STYLE_DESCRIPTION]
[IF:VALIDATION_PASS!=yes]
- Surface-detail intensity: [DEFINE:SURFACE_DETAIL_DESCRIPTION]
[/IF]
- Resolution profile: [DEFINE:RESOLUTION_PROFILE_DESCRIPTION]
[IF:ASSEMBLED_TARGET]
[OPTIONAL:SPRITE_TARGET_SIZE  | - Target assembled size, for the complete subject once its pieces are put together: [DEFINE:SPRITE_TARGET_SIZE]. This sheet draws the pieces, not the assembly, so no single component is this size — each is drawn at whatever share of the whole it occupies.]
[/IF]
[IF:ASSEMBLED_TARGET!=yes]
[OPTIONAL:SPRITE_TARGET_SIZE  | - Target component size: [DEFINE:SPRITE_TARGET_SIZE]]
[/IF]
[IF:VALIDATION_PASS!=yes]
[IF:PALETTE!=yes]
- Palette strategy: [DEFINE:PALETTE_DESCRIPTION]
[/IF]
- Edge / outline treatment: [DEFINE:OUTLINE_DESCRIPTION]
[/IF]
[IF:LIGHTING_STATED]
- Lighting model: [DEFINE:LIGHTING_DESCRIPTION]
[/IF]
[IF:VALIDATION_PASS]

[DEFINE:VALIDATION_PASS_DESCRIPTION]
[/IF]
[IF:HARDWARE_PROFILE]

### Target hardware — [DEFINE:HARDWARE_NAME]

These components are artwork for [DEFINE:HARDWARE_NAME], and have to be drawable on it. Its limits
are not a period flavour to gesture at; they are what the machine could put on a screen:

[DEFINE:HARDWARE_CONSTRAINTS]

Work to those figures rather than to a modern impression of them. Where one of them pulls against an
aesthetic preference stated elsewhere in this section, the hardware wins.
[/IF]
[IF:PALETTE]

### Palette — [DEFINE:PALETTE_NAME]

[DEFINE:PALETTE_SPECIFICATION]
[/IF]
[IF:STYLE_REFERENCE]

### Art direction reference
[IF:STYLE_REFERENCE_NAMED]

These components are drawn to match the art direction of [DEFINE:STYLE_REFERENCE_NAME]. Reproduce
what that artwork measurably does, rather than a general impression of it.
[/IF]

The look is fixed by the following. Each states something the settings above have no way to say:

[DEFINE:STYLE_REFERENCE_CHARACTERISTICS]

Treat those as measurements and work to them directly. Where one pulls against a setting stated
earlier in this section, the setting wins — it is what this particular sheet asked for.
[/IF]
[IF:NATIVE_GRID]

### ${NATIVE_GRID_HEADING}

**The target component size above is a native pixel grid, not a count of delivered pixels.** It is
the grid a whole subject is drawn on, with every smaller piece in proportion to it on that same
grid, and it is where detail stops. Draw each component there first, then deliver the finished grid
enlarged by a whole number — **[DEFINE:NATIVE_GRID_SCALE]× or more** — so that each native pixel becomes a solid square
block of identical delivered pixels, with hard edges between blocks and no interpolation, blending
or softened edge anywhere in the enlargement.

The enlargement adds nothing: it multiplies pixels that were already placed, so no component carries
a feature, an outline or a colour boundary finer than one native pixel. Interior detail beyond what
the grid above can hold means the component was not drawn on it.
[/IF]
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]

### Pixel discipline
- Build every form from deliberate, contiguous pixel clusters placed by intent.
- No feature smaller than [DEFINE:MIN_FEATURE_SIZE].
- Diagonals use clean, regular staircase patterns. Where section [SEC:INVENTORY] lists a piece and its bilateral
  counterpart as two separate components — a left-side piece and its right-side one — equivalent
  edges on the two use identical staircase patterns.
[IF:MULTI_DIRECTION]
  That is a rule about two different parts, and it never applies to two views of one part: a
  directional view comes from rotation and occlusion, never from reflecting another view.
[/IF]
- No doubled contours, overlapping outline strokes or irregular edge chatter.
- Do not render materials as microtexture: no scratches, etched strokes, fabric weave, pores,
  grain, crosshatching, repeated reflective streaks, sparkle noise, scattered single-pixel
  highlights or painterly brush marks. Materials read through **colour and value blocking**.
- **Do not produce smooth artwork that has been downscaled.** Every pixel is placed deliberately;
  the image must survive inspection at 1:1 with no anti-aliased edges.
[OPTIONAL:SMALL_SCALE_DISCIPLINE | [DEFINE:SMALL_SCALE_DISCIPLINE]]
[/IF]
[IF:RENDER_STYLE!=PIXEL_ART,RETRO_PIXEL_ART]
[IF:VALIDATION_PASS!=yes]

### Surface discipline
- Keep surface treatment consistent across every component; a technique used on one piece is used
  on all of them.
- Detail serves silhouette and material read, not density. Preserve readable component scale
  before preserving surface detail.
[/IF]
[/IF]

---

## [SECTION:CAMERA]. PROJECTION, CAMERA AND OBJECT ORIENTATION

- Projection: [DEFINE:PROJECTION_DESCRIPTION]
- Camera elevation: [DEFINE:CAMERA_ELEVATION]° above the horizon
- Directions required: [DEFINE:DIRECTIONS_DESCRIPTION]
- Primary assembly direction: [DEFINE:PRIMARY_DIRECTION]

[IF:MULTI_DIRECTION]
### One fixed camera, and components that turn beneath it
[/IF]
[IF:MULTI_DIRECTION!=yes]
### One fixed camera, and orientation that comes from the component
[/IF]

**The camera never moves.** Camera position, camera elevation, **camera azimuth**, projection type,
focal characteristics, sprite scale, pixel density and lighting direction are identical for every
component on the sheet. A component drawn through a *different camera* — another elevation,
projection, scale or key-light direction — is a defect.

**A direction is never produced by moving the camera.** It is produced by rotating the *component*
about its own local vertical axis beneath that fixed camera. **Camera azimuth is fixed; object yaw
is what varies.** Those are two different quantities: “one camera” constrains the first and says
nothing about the second.
[IF:MULTI_DIRECTION]
So it never means that every component faces the same way.
[/IF]

### The subject’s own left and right

**Wherever “left” and “right” below name a side, it is the subject’s own and never the image’s.**
Its right is the side a quarter turn clockwise from its front axis seen from above, and its left the
side a quarter turn anticlockwise; both belong to the subject rather than to the picture, so where a
feature lands on screen says nothing about which side of the subject it is on. Where a rule means the
image’s sides instead, it says so by naming the screen or the frame.

**A feature the subject has on one side and not the other belongs to that side, and which side it is
gets settled before anything is drawn.** Where section [SEC:SUBJECT] names such a feature without saying which
side carries it, **put it on the subject’s left** — a fixed default, not a choice, because a side
each sheet picks for itself is a side they pick differently. Hold it there for every component and
every drawing, and never resolve it by giving the subject a matching copy on the other side: a
one-sided feature stays one-sided, and where a turn takes it out of view, letting it be hidden is the
correct answer.
[IF:ONE_SIDED_FEATURES]

### The one-sided features this subject carries

Section [SEC:SUBJECT] names the following, and each is on the subject’s left by the rule above. This is not a
summary of that rule but the answer it produces for this subject, so draw each one exactly as stated
here in every component that carries it, and expect a delivered sheet to be checked against it line
by line.

[DEFINE:ONE_SIDED_FEATURE_LEDGER]
[IF:IDENTITY_LOCK]

**Where the identity lock in section [SEC:SUBJECT] fixes one of these to the subject’s right, the lock wins and this
entry is read with its two flanks exchanged** — the feature is then fully presented in the view named
above as hiding it, and hidden in the view named as presenting it. The lock records what the earlier
sheets actually drew; the list above is what the default settles on where nothing else has.
[/IF]
[IF:PLAN_VIEW!=yes]

**Where a view leaves one of them hidden, hidden is the finished answer.** Do not rotate it into
shot, do not slide it round the body, and do not draw a second copy on the other flank to keep the
composition balanced.
[IF:MIRROR_PAIRS]
A view in which one of these reads at the same prominence as the view opposite it is a reflection,
whatever else about the two is correct.
[/IF]
[/IF]
[/IF]

[IF:MULTI_DIRECTION]
### The object yaws this sheet requires
[/IF]
[IF:MULTI_DIRECTION!=yes]
### The object yaw this sheet requires
[/IF]

[DEFINE:DIRECTIONAL_ROTATION]
[IF:MULTI_DIRECTION]

### Rotation, not redesign

Each directional set is **one** physical component, turned — not several designs of it. Hold
constant across its views: overall dimensions and proportions · joint, socket and attachment
geometry · colour blocking and material regions · plate, panel and armour arrangement · identifying
markings · the number and placement of every distinctive feature. Only what the turn itself changes
may change. A feature on the component’s left rear stays on its left rear: it lands somewhere
else on screen after the turn, and it must never migrate, multiply, vanish or be redrawn to make two
views look different. The variety comes from rotation, not mutation.

### One turntable, not several drawings

The yaws above are frames of **one turntable**: a starting orientation, then that same physical
object turned further, then turned further again. Take them in that order:

[DEFINE:TURNTABLE_SEQUENCE]

Each drawing is the one before it after the turn stated there — not a fresh design of what its name
describes. A view worked out from its own name instead is where a component quietly loses the
arrangement it had one cell earlier, and it is what every check below catches only after the fact.
[IF:PLAN_VIEW!=yes]

### Which side each turn brings towards the camera

[DEFINE:LEADING_SIDE_LEDGER]

**A one-sided feature is at its most exposed while its own side is the near one, and foreshortened,
partly occluded or hidden outright once that side has turned away.** That change is what separates
two opposite turns of an asymmetric object from one drawing and its reflection — it is the whole of
the difference, and a sheet that omits it has delivered the reflection. A feature that reads at the
same prominence in a view leading with its side and a view leading with the other has not turned with
the subject: it has crossed to the other side of it, which makes the second drawing a different
subject.
[/IF]

### Landmarks are the evidence that it rotated

Every directional component has a **front axis** and a **rear axis** — the ends that would lead and
trail if it moved forward. For this subject: [DEFINE:LANDMARK_DESCRIPTION]

Those landmarks turn with the component. **If a component’s front axis still points roughly the same
way on screen in two of its views, that pair has failed** and must be redrawn.

### Silhouette and rotation carry the direction

- Reduced to flat black silhouettes, the views would still be individually identifiable. Direction
  comes from rotated geometry, never from different highlights, markings, glow or rearranged small
  details.
[IF:PLAN_VIEW!=yes]
- Rotation changes what is visible. A side view occludes the far side’s features and foreshortens
  what is left of the front. A rear view shows the rear surfaces a front view hid and gives them the
  room the front loses there. **A rear view still presenting the surfaces the front view presented
  is a failed rotation**, not a stylistic choice.
- **A mirrored copy is not a rotation.** Mirroring flips handedness in the image without exposing a
  single surface that turning the component would reveal, so it may never stand in for a turned view.
[IF:MIRROR_PAIRS]
- **This sheet holds both members of an opposite-turn pair** — [DEFINE:MIRROR_PAIRS_DESCRIPTION] —
  whose silhouettes come out roughly complementary on screen, which is exactly where a flipped copy
  is most tempting to substitute. They are opposite turns of one object and never one another
  flipped: a feature the subject carries on one side only sits at full prominence in the member that
  turns that side towards the camera, and the other member keeps at most what its own yaw above
  leaves visible of it. Two views that match after flipping one are one view delivered twice.
[/IF]
[/IF]
[IF:PLAN_VIEW]
- **This camera is directly overhead, so a turn hides nothing and reveals nothing.** Every view shows
  the same top surface, and the direction is carried by where that surface points: the component
  turns within the image plane, and its front and rear ends, its two flanks and every asymmetry it
  carries turn with it. **A view whose top surface points the way another’s does is a failed
  rotation**, not a stylistic choice.
- **A mirrored copy is not a rotation.** Flipping a view does point its front axis where some other
  yaw would have pointed it, which is what makes the substitution tempting — but it turns nothing.
  The subject’s own left and right come out swapped, so what it produces is a left-handed copy of a
  view this sheet already holds rather than a view of its own.
[IF:MIRROR_PAIRS]
- **This sheet holds both members of an opposite-turn pair** — [DEFINE:MIRROR_PAIRS_DESCRIPTION] —
  which is exactly where a flipped copy is most tempting to substitute, and from directly overhead
  nothing else in the image contradicts one. They are opposite turns of one object, so a feature the
  subject carries on one side only stays on that side of its own body in both — which puts it above
  the middle of the frame in one member and below it in the other. Flipping one to make the other
  leaves it on the same side of that line, on the subject’s wrong side.
[/IF]
[/IF]
- **Rotation never swaps the subject’s own left and right.** Every view is this same subject turned
  through the yaw stated above, so an asymmetric feature stays on the side of the subject it belongs
  to at every one of them; a view that moved one across is a different subject, not a different
  angle.
- **No view is obtained by flipping, reflecting, symmetry-completing or mirror-redrawing another
  one.** What each view shows is worked out from that view’s own yaw and from nothing else. This is
  a rule about how a view is *produced*, so it holds even where the result would have looked right.
- **A one-sided feature is never kept in shot by drawing a second copy of it on the other side.**
  Where the turn takes that feature away from the camera, occluding it is the correct answer and
  duplicating it is not: physical continuity outranks a balanced composition, and a symmetrical
  subject is a different subject.

Each of these is the easy way out of the rules above, and each is a defect: two views of one
component facing effectively the same way · a “side” view that is the three-quarter view with
altered details · a rear view that is the front view with its details moved · a view produced by
mirroring another · a view produced by moving the camera · direction signalled by changing details
while the orientation stays put.

### What “primary assembly direction” means

It is the direction for every component the inventory does **not** give a direction of its own, and
the direction the assembled pose faces. It is not a house style for the sheet. **Wherever section [SEC:INVENTORY]
names a direction for a component, that direction wins outright** — never pull a directional
component back towards the primary assembly direction because the rest of the sheet uses it.
[/IF]
[IF:MULTI_DIRECTION!=yes]

### What “primary assembly direction” means

It is the direction the assembled subject faces, and the direction of every component section [SEC:INVENTORY] does
not give one of its own. On this sheet it is the single object yaw stated above, so wherever that
section says “the primary direction” it means that yaw and nothing else. It is not a house style,
and a component turned off it because the piece reads better that way is a defect.
[/IF]

---

## [SECTION:INVENTORY]. COMPONENT INVENTORY

[DEFINE:CATEGORY_GUARD]

[DEFINE:COMPONENT_BREAKDOWN]

Draw every entry in full, and one separate visible component for each item it names — an entry
marked **×N** names N of them, an entry naming or referring to several facings names one drawing at
each, and an entry carrying both names N separate components at each of those facings. Do not merge
entries, substitute duplicates, add filler, or omit entries. [DEFINE:CATEGORY_ASSEMBLY_INSTRUCTION]

### A component ends at its own boundary

Every entry is drawn **in isolation, as a severed part** — never as the whole subject with the
other parts faded, cropped or hidden, and never complete with its neighbours. A component includes
nothing another entry names and nothing the assembled subject would attach to it: where a piece
meets a neighbouring piece in the assembled subject, this drawing **stops at that join**, finished
with a clean edge or socket, and the neighbouring piece appears nowhere on it — not attached, not
sketched in, not trailing off the cell. Drawing a listed part together with the parts it connects
to is the single most common failure of sheets like this: it merges entries the count in section [SEC:CONTRACT]
lists separately, and it makes the cut-out part unusable.

### Placement is the only identity map

Nothing on this sheet names a component, so **grid position is how each component is identified**. Lay
the components out in strict reading order across the image — screen-left to screen-right, then top
to bottom — in exactly the order the inventory above lists them. A reordered, merged or omitted entry silently mis-maps every
component after it.

---
[IF:RIG_MODE=CUTOUT_RIG]

## [SECTION:RIG]. CUT-OUT RIG REQUIREMENTS

These components are bound to a skeleton and rotated independently at runtime. The rig, not the
artwork, supplies all motion.

### Rest orientation
Draw every piece in its **neutral rest orientation**, not posed: each segment straight and aligned
along its own long axis, and every articulation left at its neutral angle. Never draw a pre-bent
segment — flexion comes from the rig rotating separate rigid segments.

### Pivot registration
- Each piece’s joint end carries a consistent [DEFINE:JOINT_CAP_DESCRIPTION] cap, and **the pivot
  is the centre of that cap**.
- Matching pivots share a diameter: the cap on one segment’s joint end matches the cap on the
  segment it meets there exactly, so the two rotate about one point.
- Cap diameter stays consistent across the sheet for joints of the same kind.

### Overlap margin
Each piece extends **[DEFINE:OVERLAP_MARGIN_DESCRIPTION]** past its pivot centre. Segments that
butt together exactly will show a visible gap the moment the joint rotates.

### No inter-piece shading
A piece must not carry shadow, occlusion or contact shading cast by any *other* piece. Pieces move
independently, so baked-in relationships between them break immediately. Shade each piece as if it
were the only one present.

### Mirroring
Left and right versions are mirrored in silhouette but redrawn for their own side. Asymmetric
details stay on the correct side rather than flipping with the mirror — a fitting carried on one side
does not change sides between the left and right sets. **This is the only mirroring the sheet
permits:** a left piece and a right piece are two different parts, whereas a direction is a rotation,
and section [SEC:CAMERA] forbids producing one by mirroring another.
[IF:SOCKETS]

### Attachment sockets
Keep these regions clear of fine detail and busy contrast, so equipment can be overlaid later
without fighting what is underneath: [DEFINE:SOCKETS]
[/IF]
[IF:PLAN_VIEW]

### Depth order for this sheet
[/IF]
[IF:PLAN_VIEW!=yes]
[IF:MULTI_DIRECTION]

### Depth order for each direction this sheet covers
[/IF]
[IF:MULTI_DIRECTION!=yes]

### Depth order for this direction
[/IF]
[/IF]

[DEFINE:DEPTH_ORDER_DESCRIPTION]

---
[/IF]
[IF:RIG_MODE=POSE_LIBRARY]

## [SECTION:RIG]. RIGID SEGMENTS AND PIVOTS

Every articulated part is a separate **rigid** component. Never draw a pre-bent segment —
flexion comes from assembling separately oriented rigid segments around shared pivots. Matching
pivots share a diameter and cap geometry so segments register when assembled.

---
[/IF]

## [SECTION:ASSEMBLY]. REQUIRED ASSEMBLY CAPABILITY

The component set must assemble cleanly into: [DEFINE:ASSEMBLY_POSES]
[IF:SERIES]

**That is the finished series’ capability, and not this sheet’s alone.** It is reached once every
sheet listed below has been generated and their components are brought together, so this sheet
supplies its own share of it and no more. Whatever the assembled set needs that section [SEC:INVENTORY] does not
list is drawn on one of the others.

### The sheets in this series

[DEFINE:SERIES_SHEETS]
[/IF]

---

## [SECTION:IDENTITY]. IDENTITY CONSISTENCY

Every component belongs to the **same single subject**. Hold constant across all of them:
silhouette language and proportion · joint and attachment geometry · fitted and structural
regions · primary colour blocking · large identifying accents · material treatment.
[IF:SERIES]

**That list holds across the whole series, not only across this sheet.** A component drawn here has
to sit beside one drawn on another sheet and read as the same object, and those sheets are separate
generations with nothing carried between them but the text of the specification. A sheet that is
consistent within itself and does not match the rest of the series has failed.

**Which side of the subject each one-sided feature sits on is part of what has to match**, and it is
the part nothing but this text can carry. Section [SEC:CAMERA] settles it the same way on every sheet of the
series, which is why it settles it by rule rather than by choice.
[IF:IDENTITY_LOCK]
The identity lock in section [SEC:SUBJECT] is the record of what the other sheets actually drew, which is why it
wins wherever it and the subject definition above it disagree. Where it fixes a side, that side is
already settled and this sheet does not choose one.
[/IF]
[/IF]

Where a component appears at more than one object yaw, it is one persistent three-dimensional form
seen after a turn — every feature stays attached to the same physical region of it, as section [SEC:CAMERA]
requires.

---

## [SECTION:EXCLUSIONS]. EXCLUSIONS

Absent from the image entirely:

- [DEFINE:CATEGORY_EXCLUSIONS]
- All shadows: cast, contact, drop, and ambient occlusion onto the background.
[IF:LETTERING_IS_A_COMPONENT!=yes]
- Text, labels, numbers, captions, watermarks, signatures and legends.
[/IF]
[IF:LETTERING_IS_A_COMPONENT]
- Any lettering other than the characters section [SEC:INVENTORY] lists: watermarks, signatures,
  captions, legends, index numbers, codepoints, and anything written beside a component to name it.
[/IF]
- Anything annotating the sheet: arrows, callouts, colour swatches, grid lines, and frames or
  borders around the image or around a component.
- [DEFINE:CATEGORY_ASSEMBLY_EXCLUSION]
- Motion blur, speed lines, glow bleeding beyond a component’s silhouette, and any particle
  effect the inventory in section [SEC:INVENTORY] does not name.
[OPTIONAL:EXCLUSIONS | - Subject-specific: [DEFINE:EXCLUSIONS]]

**An attribute anywhere above that asks for one of these elements is already overruled** — the
subject definition in section [SEC:SUBJECT] and the render style in section [SEC:STYLE] included. Leave the element out of
the image entirely, and never satisfy both by drawing a reduced, integrated or decorative version of
it. This decides what a component *shows*, not which components exist: where section [SEC:INVENTORY] lists an
entry this section excludes, draw the entry, because dropping it mis-maps every component after it.

---

[IF:DELIBERATES]
## [SECTION:LAYOUT]. LAYOUT AND SELF-AUDIT
[/IF]
[IF:DELIBERATES!=yes]
## [SECTION:LAYOUT]. LAYOUT
[/IF]

Arrange components in a clean exploded grid in [DEFINE:ASPECT_DESCRIPTION] format, generously and
uniformly spaced, in the reading order fixed by section [SEC:INVENTORY]. Nothing touches, overlaps, or is cropped
by the image edge.
[IF:DELIBERATES]

Before delivering, verify:

[N]. Component count is exactly [DEFINE:COMPONENT_COUNT].
[N]. The delivered image is [DEFINE:ASPECT_DESCRIPTION] canvas.
[N]. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION] with no shadow or texture.
[IF:LETTERING_IS_A_COMPONENT!=yes]
[N]. No text or labels anywhere.
[/IF]
[IF:LETTERING_IS_A_COMPONENT]
[N]. The only lettering on the sheet is the characters the inventory lists — no caption, legend,
   index number or codepoint beside any of them.
[/IF]
[N]. Components appear in the exact order the inventory lists them.
[N]. Every component stops at its own joins — no entry arrives with a neighbouring piece attached,
   and [DEFINE:CATEGORY_ASSEMBLY_AUDIT].
[N]. One camera, one scale and one light direction across every component — nothing on the sheet was
   drawn through a camera that moved.
[N]. [DEFINE:CATEGORY_AUDIT]
[IF:RIG_MODE=CUTOUT_RIG]
[N]. Every articulated segment is straight and unposed, with matching joint caps at shared pivots.
[/IF]
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
[N]. One pixel grid and density throughout, with no anti-aliased silhouette edges.
[/IF]
[IF:NATIVE_GRID]
[N]. Nothing on any component is finer than one native pixel of the grid section [SEC:STYLE] states, and
   every colour boundary falls on that grid.
[/IF]
[IF:PALETTE]
[N]. Every colour on every component is one the palette in section [SEC:STYLE] permits.
[/IF]
[IF:PALETTE_PER_COMPONENT]
[N]. No component carries more colours at once than section [SEC:STYLE] allows one.
[/IF]
[IF:MULTI_DIRECTION]

### Directional audit

Then, for every component the inventory asks for in more than one direction, trace its front axis in
each of its views and confirm:

- The front axis points a visibly different way in each view.
- The side view is a full quarter turn from the front, not a second three-quarter view.
[IF:PLAN_VIEW!=yes]
- The rear view hides the front surfaces the front view presented, and shows rear surfaces in their
  place.
[/IF]
[IF:PLAN_VIEW]
- The rear view is the same top surface turned end for end: what the front view put towards the
  bottom of the frame points towards the top, and nothing has been redrawn to tell the two apart.
[/IF]
[IF:ONE_SIDED_FEATURES]
- Trace **every** feature section [SEC:CAMERA] lists as one-sided — all of them, not one — through every view of
  every component that carries it, and confirm each view matches what that list states for that view.
  Each is on the same physical side of the subject in all of them, and where it lands in the frame
  follows from that side and the view’s own yaw.
[IF:PLAN_VIEW!=yes]
- No two views leading with opposite sides show one of them at the same prominence, and none of them
  carries a second copy on the other flank. Either is a failed rotation, however correctly each of the
  views faces.
[/IF]
[/IF]
[IF:ONE_SIDED_FEATURES!=yes]
- Pick one feature the subject carries on one side and not the other — its **chirality witness** —
  and trace that one feature through every view of its component. It is on the same physical side of
  the subject in all of them, and where it lands in the frame follows from that side and the view’s
  own yaw. A subject that is symmetrical throughout has no witness to trace, and this check does not
  apply to it.
[IF:PLAN_VIEW!=yes]
- The witness is at its most visible in the views that turn its side towards the camera, and reduced
  or gone in the views that turn that side away. Equal prominence in two views leading with opposite
  sides is a failed rotation, however correctly each of the two faces.
[/IF]
[/IF]
[IF:MIRROR_PAIRS]
[IF:PLAN_VIEW!=yes]
- Neither member of a pair — [DEFINE:MIRROR_PAIRS_DESCRIPTION] — is the other reflected: every
  feature the subject carries on one side only sits at full prominence in the member that turns
  that side towards the camera, and appears in the other only as far as its yaw in section [SEC:CAMERA]
  allows. A pair identical up to mirroring is a failed rotation, however correctly each member
  faces.
[/IF]
[IF:PLAN_VIEW]
- Neither member of a pair — [DEFINE:MIRROR_PAIRS_DESCRIPTION] — is the other reflected: a feature
  the subject carries on one side only lands wherever that member’s own yaw in section [SEC:CAMERA] puts
  that side of the body, which is **above the middle of the frame in one member and below it in the
  other**. A flipped copy leaves it on the same side of that line in both, however correctly the
  front axis ends up pointing.
[/IF]
[/IF]
- Every view is the same geometry at the same scale through the same unmoved camera, differing by
  rotation rather than by redesign.

If two views of one component still face effectively the same way, **the sheet has failed**. Redraw
that component at the object yaw section [SEC:CAMERA] gives it rather than delivering the sheet.
[/IF]
[/IF]
[IF:EMIT_COMPONENT_MAP]

---

## [SECTION:COMPONENT_MAP]. COMPANION COMPONENT MAP

Alongside the image, output a component map as text: one JSON document of exactly the shape below,
carrying these key names and no others, with its straight quotes reproduced as written.

\`\`\`json
{"grid":{"cols":0,"rows":0},"components":[{"index":1,"name":"","parent":null,"pivot":[0.5,1]}]}
\`\`\`

**grid** states how many columns and how many rows the components are laid out in. **components**
carries one entry per component, in the reading order section [SEC:INVENTORY] fixes, and each entry
states four things:

- **index** — this component’s place in that reading order, counting from one.
- **name** — what the inventory in section [SEC:INVENTORY] calls this component.
- **parent** — the **name** of the component this one attaches to in the assembled subject, or null
  where it attaches to nothing.
- **pivot** — where this component turns or stands, as a fraction of its own cell: two numbers from
  0 to 1, across the cell and then down it, so 0.5 and 1 is the foot of the cell, centred.

The map describes what you actually drew. If a component moved or was omitted, say so there rather
than describing the ideal.
[/IF]
[IF:EMIT_PROMPT_FEEDBACK]

---

## [SECTION:REPORT]. ADHERENCE REPORT

After the sheet is delivered, and as text beside it, report on what you actually produced. Nothing
in this section changes the image — write the report from the delivered pixels, never from the plan
you drew them to.

### The audit

Section [SEC:LAYOUT] still stands: fix what you can before delivering. This report is about the sheet you did
deliver, so work section [SEC:LAYOUT]’s checks — and its directional audit, where the sheet has one — once more
against the finished image, and state for each whether it holds. Where one does not, say what the
image contains instead, concretely: “three of the five directional views at roughly the same yaw”
rather than “directional coverage could be improved”. A check you cannot settle by looking at the
image is reported as unverified rather than as passed.

### The feedback block

If every check holds, say so, and write nothing further.

If any check is missed, then this specification failed to obtain what it asked for, and its wording
is what needs to change. Close your reply with one fenced code block — three backticks, then the
word markdown — holding a brief addressed to a software engineer who maintains the tool that
composed this specification. Put nothing in that block but the brief, and nothing after it.

**What that tool is, and why it constrains what you write.** This specification was composed by
Sprite Gubbins, a browser application that assembles sprite-sheet prompts across a large
configurable range of subjects, categories, render styles, projections, direction sets and rig
modes. What you received is one rendering of a template shared by all of them. Your brief will be
used to change that template, so it reaches every prompt the tool composes — and not this sheet,
which nobody will regenerate from it. Four things follow:

- **Write about the instruction, not the artwork.** “Redraw the third component’s rear view” cannot
  be acted on there. “Section [SEC:CONTRACT] fixes the component count but never says a component may not
  arrive with a neighbouring piece still attached, so two entries merged into one satisfy it” can.
- **Write nothing specific to this subject.** The next prompt from this tool may be a building, a
  pistol or a tileset, and a change that only makes sense for this one cannot be made.
- **Propose wording, not architecture.** Name the section, quote the sentence that let the miss
  through, and give the replacement or addition you would make. Keep it proportionate: this
  specification largely works, and a brief that restructures it cannot be used.
- **Say when nothing should change.** If a miss was your own lapse against wording that was already
  unambiguous, write that instead of inventing an improvement — a rule added against an instruction
  that was already clear makes the template longer and worse.

Close the brief — still inside that same block — with what only you can report: which instructions
were hard to satisfy, which pulled against each other, and which were buried far enough down the
specification to lose their force. None of that is visible in the image, and it is the most useful
part of the brief.
[/IF]
[IF:MULTI_DIRECTION]

---

## [SECTION:INVARIANTS]. RENDER-CRITICAL INVARIANTS

Restated from section [SEC:CAMERA] because they are what a specification this long loses on the way to the
image. All three hold of the finished sheet:

[N]. “Left” and “right” name the subject’s own physical sides, never the image’s.
[N]. Every component the inventory gives more than one direction is one unchanged object, turned
   through the yaws section [SEC:CAMERA] lists, in the order it lists them.
[IF:PLAN_VIEW!=yes]
[N]. A feature the subject has on one side only stays on that side and changes how much of it shows
   as the object turns — no view is another view flipped, reflected or symmetry-completed, and
   nothing is copied onto the far side to keep it in shot.
[/IF]
[IF:PLAN_VIEW]
[N]. A feature the subject has on one side only stays on that side, and where it lands in the frame
   follows from that side and the view’s own yaw — no view is another view flipped, reflected or
   symmetry-completed, and nothing is copied onto the other side to balance it.
[/IF]
[/IF]

Generate the sheet now.
[IF:EMIT_PROMPT_FEEDBACK]

Then write the adherence report — after the image has been delivered, never in place of it.
[/IF]`;
