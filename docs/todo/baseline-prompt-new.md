# Baseline prompt — revised template

> **Status:** 📘 REFERENCE — shipped. This is the template the compiler now emits, kept for the reasoning behind each rule rather than as open work; the change that landed it is [done/prompt-template-v2-integration.md](done/prompt-template-v2-integration.md).
>
> Both departures this banner used to record are closed, each in the direction that made the two agree. §6's tile list was two short of the "sixteen" its own prose claimed, so it now names the wall-face inner corners it was missing and the implementation follows at **16**. `CUSTOM` has been **removed** from §2's `DIRECTIONS` table rather than built, so the table matches the code. §10's follow-up list is closed too: four of its five items shipped, and §10.3 shipped by a route it did not name — its palette line *is* read from an accepted sheet, on-device, while the prose half was removed **as that item framed it**, because describing what a sheet depicts needs an outbound vision-model call this app does not make. The studio derives those lines from the subject definition instead, which needs no image at all. Each item records its outcome in place.
>
> The flag §1 and §4 call `EMIT_COMPONENT_MAP` was named `EMIT_MANIFEST` when this document was written, and §6 and §7 still argue for it under that name. It was renamed by [issue #118](https://github.com/BootBlock/SpriteGubbins/issues/118), which found that the document the prompt asked for and the manifest the Quantise tab downloads were two unrelated formats sharing one word. Only the two tables are corrected here, for the reason §2's `DIRECTIONS` table was — they describe the surface the compiler offers, so a reader consults them for a flag name. §6 and §7 are records of why the capability exists and are left as they were written.
>
> §3 is revised in place — it is a mirror of what the compiler emits, so it tracks the code rather than recording a moment, and it is now **pinned by [tests/prompt-template-mirror.test.ts](../../tests/prompt-template-mirror.test.ts)**, which compares the fence against `PROMPT_TEMPLATE` character for character. It needed to be, because a banner asserting §3 is current is worth nothing while nothing checks it — and checking showed the two had **never** agreed. They diverged the moment the template was transcribed into code: blank lines placed differently around the `[IF:…]` markers, and, in §5, a `---` sitting outside a `[/IF]` where the code puts it inside, which is a rule an unrigged sheet emits twice in the document's version and once in the app's. Then the document fell further behind twice — the category system (§0's guard paragraph, the precedence sentence rewritten so the category comparison settles *before* precedence applies, and `[DEFINE:CATEGORY_GUARD]`, `[DEFINE:CATEGORY_EXCLUSIONS]` and `[DEFINE:CATEGORY_AUDIT]` in §4, §8 and §9), and the `[IF:DELIBERATES]` gating of the self-audit, which §3 described in an italic aside citing a `GOOGLE_IMAGEN` target §7 has since removed. All of it is closed against the constant, and the aside is gone: an editorial annotation cannot survive inside a block that is checked verbatim, and §7 already carries what it said. Its earlier revisions, which the mirror did carry: the camera-versus-object-orientation rewrite recorded in **§8's "Found after shipping"**, which is where the reasoning for it lives, and a rewording of §2's `THREE_QUARTER_TOPDOWN` row, whose "the front of forms are visible" was false for any component turned away from the camera.

A replacement for the template compiled by `src/utils/promptCompiler.ts`. Same job, same
customisation surface, with the defects in §8 fixed and three capabilities added: **multi-style
rendering**, **arbitrary projections and direction sets**, and **cut-out rig support**.

The single largest change: **the current template hardcodes pixel art throughout** — §8 of it is
titled "CLEAN PIXEL ART", the camera is fixed at 35° dimetric, and every resolution profile has
`PIXEL_ART` in its name — while the application is meant to serve various styles. This version
makes render style a first-class parameter and moves pixel-specific rules behind conditionals, so
a painted, cel-shaded or silhouette sheet is expressible without fighting the template.

---

## 1. Placeholder conventions

### `[DEFINE:NAME]` — a substituted value

Named rather than positional. The original template used bare `[DEFINE]`, which works only while
the order never changes and gives no diagnostic when a substitution is missed. A named token can
be validated (*is every token consumed?*) and reordered safely.

### `[OPTIONAL:NAME | line text]` — omit the whole line when unset

**The most important fix here.** The shipped compiler emits `${subject.species || 'DEFINED'}`, so
a cleared field produces:

```
- Species / Archetype: `DEFINED`
```

`promptCompiler.ts` defends this deliberately, and its reasoning is sound as far as it goes:

> *"A field the user has cleared should read as 'the generator must decide this', not as an empty
> backtick pair that looks like an authoring mistake in the middle of a specification."*

Both stated options are bad, and the third was not considered. An empty backtick pair is noise;
`DEFINED` is worse than noise, because it is a **content-shaped token in the highest-weighted
section of the prompt**. A generator reading `Species: DEFINED` does not infer "you decide" — it
either ignores the line or treats "DEFINED" as a descriptor to satisfy. Neither is the intent.

**Omitting the line entirely says "you decide" precisely**, costs no tokens, and cannot be
misread. Where a real default is wanted, state it after the pipe — `[OPTIONAL:ANATOMY | - Anatomy
base: Standard humanoid]` — emitting the fallback *text*, never a placeholder-shaped token.

§3 of the template also states the rule explicitly for the generator, so absence is unambiguous
rather than merely silent.

### `[IF:…] … [/IF]` — conditional block

Three forms:

| Form | Includes the block when |
| --- | --- |
| `[IF:KEY=A,B]` | `KEY` is `A` or `B` |
| `[IF:KEY!=A,B]` | `KEY` is neither |
| `[IF:KEY]` | `KEY` is set and non-empty *(truthiness; used by `IDENTITY_LOCK`, `SOCKETS`, `EMIT_COMPONENT_MAP`, `EMIT_PROMPT_FEEDBACK`, `DELIBERATES`, `RETURNS_TEXT`)* |

**Blocks nest.** A block inside a dropped block is dropped with it, whatever its own condition says.
That is what lets a section state its precondition once and its parts state theirs beneath it — §9's
self-audit applies only to a target that can act on it, and *within* it the rig, pixel-art and
directional checks apply only to those sheets. Nesting was added with the per-target gating in §7
below; before that the blocks were flat, and the one relationship that needed nesting (`SOCKETS`
inside the cut-out rig section) was expressed by the compiler blanking the value instead.

**Use `[IF:KEY]` rather than `[OPTIONAL:…]` whenever the content spans more than one line.**
`[OPTIONAL:…]` is strictly single-line by contract, so a multi-line optional would silently leave
its tail behind when the value is unset — which is a worse failure than the one §1 exists to fix.

### `[N].` — an auto-numbered list item — **NEW**

> **Added after shipping, for a defect the conditional blocks above created.** Numerals written into
> the template cannot survive a list whose items are conditional. §9's verification list ends with a
> cut-out-rig check and a pixel-art check that appear *independently*, so numbering them 7 and 8 by
> hand emitted `…6. 8.` for a pixel-art sheet that is not a cut-out rig — which is the app's most
> ordinary configuration, and a checklist that skips a number reads as one whose seventh check went
> missing. That list is itself gated on `DELIBERATES`, so the gap only ever reached the five targets
> that are sent it; §0's output contract, which **every** target gets, is one conditional item away
> from the same failure.
>
> `[N].` opens a list item and is numbered at render time by `applyNumbering`, counting from one and
> restarting at each blank line. The pass runs **after** the conditional and optional passes, so a
> dropped item takes its number with it, and **before** substitution, so a subject field containing
> `[N].` is an odd name rather than a list item. Both numbered lists in §3 now use it.

---

## 2. Parameters

Everything the application exposes today is retained. **NEW** marks additions.

### Subject — unchanged

The sixteen `SUBJECT_FIELD_KEYS` across all five categories, plus `CATEGORY`. All become
`[OPTIONAL:…]`.

`ADDITIONAL_ANATOMY` is the one that is more than a line of text. §1 of the template declares such
anatomy to be *separate pieces*, while §0 demands exactly N components and §4 lists exactly N — so
a subject naming a tail asked for more pieces than it counted. **The field is therefore counted:**
each named piece becomes its own entry at the end of §4's inventory, and the total §0 states rises
to match. That only works if the field is countable, so it carries an explicit multiplier —
`Demon Horn ×2, Tail ×1` is two entries, three components — and `NONE` states that there are none,
emitting no line at all rather than putting a content-shaped token in the highest-weighted section
(§8.1). Guessing plurality from the wording was the alternative, and a mis-read "wing pair" is
exactly the silently-wrong sheet the count exists to catch.

### Output — existing

| Parameter | Values |
| --- | --- |
| `DIRECTIONAL_MODE` | `SINGLE_DIRECTION_POSE_LIBRARY` · `CORE_DIRECTIONAL_VARIANTS` · **NEW** `CUTOUT_RIG_SINGLE_DIRECTION` · **NEW** `TILESET_MODULAR` · ~~`FULL_DIRECTIONAL_POSE_LIBRARY`~~ **removed**, see §8.4 |
| `SURFACE_DETAIL` | `MINIMAL` · `CLEAN_PRODUCTION` · `DETAILED_PRODUCTION` · `TEXTURED` |
| `RESOLUTION_PROFILE` | `HIGH_RESOLUTION` · `MID_RESOLUTION` · `RETRO_16_BIT` · `CUSTOM` |
| `PALETTE_LIMIT` | `STRICT_32_COLOR` · `RESTRAINED_64_COLOR` · `EXPANDED_ALBEDO` · **NEW** `UNRESTRICTED` |
| `OUTLINE_STYLE` | `DARK_LOCAL_CONTOUR` · `PURE_BLACK_OUTLINE` · `OUTLINE_LESS_ALBEDO` |
| `LIGHTING_MODEL` | `FLAT_NEUTRAL_ALBEDO` · `ISOMETRIC_TOP_LEFT` · `UNLIT_EMISSIVE_BAKED` |
| `ASPECT_RATIO` | `SQUARE_1_1` · `WIDE_16_9` · `TALL_9_16` · `ULTRAWIDE_21_9` |
| `TARGET_MODEL` | see §7 |

> `RESOLUTION_PROFILE` loses its `_PIXEL_ART` suffixes. Resolution and render style are
> orthogonal, and welding them together is what made the template pixel-only. `UNRESTRICTED` is
> added to `PALETTE_LIMIT` because a painted or 3D-rendered sheet has no colour budget.

### `RENDER_STYLE` — **NEW**

The multi-style requirement. Nothing in the current template expresses it.

| Value | Description emitted |
| --- | --- |
| `PIXEL_ART` | Modern high-resolution pixel art. Deliberate pixel placement, hard edges, controlled value bands |
| `RETRO_PIXEL_ART` | Constrained 8/16-bit era pixel art with a small palette and visible chunky pixels |
| `PAINTED_2D` | Digitally painted with soft blended forms and visible brush economy |
| `CEL_SHADED` | Flat colour fills with hard-edged shadow steps and a clean ink contour |
| `VECTOR_FLAT` | Flat geometric shapes, no gradients, crisp mathematical curves |
| `HAND_DRAWN_INK` | Inked linework with hatched or flat fills, visible drawn line weight |
| `RENDERED_3D` | Rendered 3D forms with material shading and soft form shadow |
| `LOW_POLY_3D` | Faceted low-polygon forms with flat per-face shading |
| `CLAY_RENDER` | Untextured single-material form study. Useful for validating silhouette and volume before committing to colour |
| `SILHOUETTE_ONLY` | Solid single-colour silhouettes. A readability pass — does the shape read at target size with no internal detail? |

The last two are production tools rather than finished looks, and are worth keeping: silhouette
readability is the thing that actually determines whether a sprite works at 96 px.

### `PROJECTION` and `CAMERA_ELEVATION` — **NEW**

Was hardcoded, and hardcoded *contradictorily* — see §8.2.

| Value | Description emitted | Elevation |
| --- | --- | --- |
| `THREE_QUARTER_TOPDOWN` | Angled overhead. Both the top and the camera-facing vertical surfaces of forms are visible; the vertical screen axis carries both height and depth | 1–89°, default 35° |
| `PURE_TOPDOWN` | Directly overhead. Only the top of forms is visible | 90° |
| `TRUE_ISOMETRIC` | True isometric. The two ground axes and the vertical are all foreshortened equally, and each ground axis runs at 30° to the horizontal on screen, so a square of ground is drawn as a diamond 1.73× as wide as it is tall | 35.26° |
| `DIMETRIC_2_1` | Two-axis dimetric. The two ground axes are foreshortened equally and the vertical is not, and each ground axis runs at 26.57° to the horizontal on screen, so a square of ground is drawn as a diamond 2× as wide as it is tall | 30° |
| `OBLIQUE_45` | Front face undistorted, depth projected at 45° | 0° |
| `ORTHOGRAPHIC_SIDE` | Flat side elevation, no perspective. Platformer convention | 0° |
| `ORTHOGRAPHIC_FRONT` | Flat front elevation, no perspective | 0° |

`CAMERA_ELEVATION` is a number in degrees, and only the first row leaves it open — every other
projection above **is** a camera geometry, so its elevation is that geometry's rather than a second
setting beside it. Both were independent when this shipped, which is R6 in §8.

### `DIRECTIONS` — **NEW**

Was hardcoded to three even though `DIRECTIONAL_MODE` implied it varied. An 8-direction set — what
a cut-out rig for a top-down game needs — could not be requested at all.

| Value | Set |
| --- | --- |
| `SINGLE_FRONT` | Front only |
| `THREE_CLASSIC` | Front-three-quarter, right side, back-three-quarter *(the set this template hardcoded)* |
| `FIVE_CLASSIC` | Front, front-three-quarter, right side, back-three-quarter, back |
| `FOUR_CARDINAL` | South, west, north, east |
| `EIGHT_COMPASS` | S, SW, W, NW, N, NE, E, SE |

> `FIVE_CLASSIC` was **added after this template shipped**, because three views cannot reach the two
> facings a player looks at most and nothing in the app said so. 0° and 180° are their own mirror, so
> they buy nothing from an engine's horizontal flip while each of 45/90/135 buys a distinct second
> facing — which makes `THREE_CLASSIC` the most efficient *three*-view set at six facings and, by the
> same arithmetic, structurally incapable of producing a subject facing the camera. Drawing 0° and
> 180° outright takes the classic vocabulary to all eight. `FIVE_CLASSIC` is the studio's default
> set; `CORE_DIRECTIONAL_VARIANTS` first pinned it as a fixed coverage, and now draws **whichever
> set the user chooses** — the plans are built from the chosen facings, and the `EIGHT_COMPASS` core
> splits into a cardinal and a diagonal sheet so no view is mirrored, skipped or blurred into an
> adjacent yaw. An asymmetric subject — gear on one hip, a sidearm on one side — cannot be engine-
> mirrored at all, which is what made drawing every chosen facing outright the correct reading of
> the control.

> A `CUSTOM` free list was specified here and has been **removed** rather than built. It needs a
> field to hold it, no shipped preset exercises it, and a set resolving to nothing emits an empty
> "Directions required" line. It would also break the closed `Direction` union open, and with it the
> exhaustiveness that lets `DEPTH_ORDER_TEXT` answer for every facing a set can produce — an
> arbitrary string has no depth-order answer at all, which is the same "only outcome is a wrong
> sheet" reasoning that deleted `FULL_DIRECTIONAL_POSE_LIBRARY` in §8.4.

### Rigging — **NEW**, see §4

| Parameter | Values |
| --- | --- |
| `RIG_MODE` | `NONE` · `POSE_LIBRARY` · `CUTOUT_RIG` |
| `JOINT_CAP_STYLE` | `ROUNDED` · `SQUARED` · `TAPERED` |
| `OVERLAP_MARGIN` | `NONE` · `HALF_CAP` · `FULL_CAP` |
| `SOCKETS` | list, e.g. `head, chest, back, hand_left, hand_right` |
| `EMIT_COMPONENT_MAP` | boolean — request a companion component map (text targets only) |
| `EMIT_PROMPT_FEEDBACK` | boolean — ask the target to audit its own sheet and report back on this template's wording (targets that both deliberate *and* return text) |

### Other — **NEW**

| Parameter | Values | Why |
| --- | --- | --- |
| `BACKGROUND_KEY` | `MAGENTA_FF00FF` · `PURE_WHITE` · `PURE_BLACK` · `TRANSPARENT` | White is a poor extraction default (§8.6) |
| `COMPONENT_BUDGET` | integer | Lets the app cap or split a request beyond what a model can deliver (§8.4) |
| `IDENTITY_LOCK` | free text | Carries an identity digest into follow-up sheets (§5) |
| `SPRITE_TARGET_SIZE` | free text, e.g. `48 × 96 px` | An explicit pixel target, which the profile names only vaguely. On a pixel-art sheet under `CUSTOM` it is the **native grid** the artwork is drawn on, and §0, §2 and §9 state the whole-number scale the sheet delivers that grid at — see R7 |

### `HARDWARE_PROFILE` and `PALETTE` — **NEW**, added after this document shipped

Two parameters that arrived together and are deliberately kept apart. A **hardware profile** names a
machine and states its *geometry* — native display, pixel shape, tile grid, hardware sprite sizes and
how many the machine could show; a **palette** states its *colour* — the space, the on-screen count,
the per-component count. Neither says a word about the other's half, which is what lets the two be
set independently: a Mega Drive profile carrying a Game Boy palette is an unusual request, not a
prompt that contradicts itself.

| Parameter | Values | Emits |
| --- | --- | --- |
| `HARDWARE_PROFILE` | `NONE` · eighteen machines, from the Atari 2600 to the Neo Geo — see `src/constants/hardware/` | `### Target hardware` in §2, with the machine's constraint list |
| `PALETTE` | `FREE` · nineteen palettes — see `src/constants/palettes/` | `### Palette` in §2, plus a clause in §0's contract and one in §9's audit |
| `STYLE_REFERENCE` | `NONE` · the published games in `src/constants/styleReferences/` | `### Art direction reference` in §2, with the look's characteristic list |
| `NAME_STYLE_REFERENCE` | `false` · `true` | One sentence inside that block naming the game; the characteristics are emitted either way |

Choosing a profile in the studio is a **template**: it writes the render style, surface detail,
resolution, component size, outline, lighting and palette in one act, and every one of them stays the
user's to change afterwards. The stored id is what makes the prompt name the machine, which steers a
generator further than any single figure in the list does.

An **art direction reference** is the third of that family and works the same way, one level up: a
machine is what the silicon allowed, a reference is what one team did within it. It writes a wider
settings package — the profile's seven plus the projection, the camera elevation and the machine and
palette themselves — and then emits the facts none of those fields can hold: the tile grid, the
resolution the art was authored at, how many facings were drawn against how many the engine mirrored.

**Its characteristics may never restate a setting**, which is the rule that keeps the block safe to
edit against. A reference is a template, so the settings it wrote are the user's the moment it is
applied; a characteristic reading "characters are drawn in flat front elevation" would contradict the
projection line above it as soon as anyone changed that select. So the block states only what has no
field, and says outright that the settings win where the two ever pull apart.

`NAME_STYLE_REFERENCE` is separate from the reference itself because naming a published game is a
property of the *target*, not of the sheet: several endpoints refuse or degrade a prompt carrying a
commercial title, and the characteristics are what actually carry the look. It defaults to off, and
the sheet is fully specified without it.

A palette is one of two kinds. A **fixed** one is a list — the Game Boy's four greens, the C64's
sixteen, the 2600's 127 — and every entry is written into the prompt. A **channel-depth** one is a
colour space, which is how the Master System (2 bits per channel), the Mega Drive (3), the Amiga (4)
and the SNES (5) actually define colour; the prompt states the ladder instead, since 512 entries are
not a list anybody reads.

> **A pinned palette supersedes `PALETTE_LIMIT`.** A budget cannot express "four shades of green", so
> where a palette is set the strategy line is dropped from §2 rather than emitted alongside it — the
> same rule the Quantise tab applies when it maps a returned sheet onto the palette instead of
> choosing colours out of the sheet itself. The one exception written into the palette block is the
> background field, which stays the key colour §0 fixes: no palette in the library contains magenta.

---

## 3. The template

Everything between the rules is the emitted prompt.

**The block below is `PROMPT_TEMPLATE` in
[src/constants/promptTemplate.ts](../../src/constants/promptTemplate.ts), character for character**,
and [tests/prompt-template-mirror.test.ts](../../tests/prompt-template-mirror.test.ts) fails the
build when the two disagree. The constant is the one the app emits, so a change is made *there* and
copied over this fence in the same commit — editing the fence alone changes nothing a model ever
reads, and the test will say so.

**The fence is four backticks, not three.** The template's component-map section fences the JSON
example it asks a model to reproduce, so a three-backtick fence here closes on that example and this
§ stops short of the constant — which the mirror test then fails on, with no wording of the block
able to fix it. CommonMark closes a fence only on a run at least as long as the opener, which is what
keeps the inner one content.

---

````
# MODULAR SPRITE-SHEET SPECIFICATION — [DEFINE:CATEGORY]

You are producing a **reference sheet for game-asset extraction**: an exploded grid of isolated,
reusable components that a tool will cut apart and reassemble. It is not an illustration, a scene,
or a character portrait. Every rule below serves extraction.

## [SECTION:CONTRACT]. NON-NEGOTIABLE OUTPUT CONTRACT

Satisfy this section before any aesthetic consideration.

[N]. Exactly [DEFINE:COMPONENT_COUNT] components, each visibly separate, none touching or
   overlapping — and none carrying another: a component that arrives with a neighbouring piece
   still attached to it is two entries merged, not one component.
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

[IF:PAINT_EXCEPTIONS]
Every fitted, applied and worn attribute listed above is **painted onto** the component it sits on,
never drawn as a separate piece, except where named below.
[/IF]
[IF:PAINT_EXCEPTIONS!=yes]
Every fitted, applied and worn attribute listed above is **painted onto** the component it sits on,
never drawn as a separate piece.
[/IF]
[IF:CLOTHING_IS_A_COMPONENT]
**[DEFINE:CLOTHING_LABEL]** is excepted: section [SEC:INVENTORY] draws and counts it as components of its own.
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

### The native grid, and the scale it is delivered at

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

### Depth order for this direction
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

```json
{"grid":{"cols":0,"rows":0},"components":[{"index":1,"name":"","parent":null,"pivot":[0.5,1]}]}
```

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
[/IF]
````

---

## 4. Rigging, in detail

`RIG_MODE: CUTOUT_RIG` targets a bone rig — Godot `Skeleton2D`/`Bone2D`, Spine, DragonBones, Unity
2D IK — where sprite pieces are parented to bones and rotated at runtime. Six requirements that the
current template does not state, each corresponding to a way the sheet fails to rig:

| Requirement | Failure it prevents |
| --- | --- |
| **Rest orientation** | A piece drawn pre-bent is unusable — the rig adds rotation on top of the drawn angle, so a 30°-bent elbow becomes 60° |
| **Pivot registration** | Mismatched joint diameters mean the two halves rotate about different points and visibly slide apart |
| **Overlap margin** | Segments that butt exactly show a gap the instant the joint rotates. Needs roughly half a cap radius of overlap |
| **No inter-piece shading** | A shadow the torso casts on the arm is correct in exactly one pose and wrong in every other |
| **Mirroring discipline** | Asymmetric details flip with a naive mirror, so equipment swaps sides between the left and right sets |
| **Depth order per direction** | Which arm is nearer the camera changes with facing. Without it, the near arm renders behind the torso when the character turns |

### Why placement is the identity map

Section 0 forbids labels, which is correct — labels get baked into the extracted sprite. But
something has to tell the importer which cell is the left forearm. **Strict reading order matching
the declared inventory** is that something, and it costs nothing. It is the single highest-value
rigging addition, because without it every sheet needs manual identification.

### `EMIT_MANIFEST`

Conversational targets (a chat model that returns text alongside an image) can emit a JSON manifest
describing grid layout, part names, bone parents and pivot fractions. Pure image endpoints cannot,
so the application should gate the option on the target.

Treat the manifest as a **claim, not ground truth** — it describes what the model believes it drew.
It is still worth having: it turns importing from "identify 15 anonymous cells" into "verify 15
labelled ones".

### Eight directions do not fit in one sheet

A cut-out rig needs 15 pieces per direction (head, torso, pelvis; upper arm, lower arm, hand ×2;
upper leg, lower leg, foot ×2). Eight directions is **120 pieces** — far past what any current model
delivers in one generation (§8.4).

The workflow is therefore **one sheet per direction**, eight runs, tied together by `IDENTITY_LOCK`.
`CUTOUT_RIG_SINGLE_DIRECTION` (15 components) exists for exactly this, and 15 is a count models
actually hit reliably.

---

## 5. `IDENTITY_LOCK` — the consistency problem

The hardest part of a sprite generator is not sheet one; it is **sheet two matching sheet one**.
Nothing in the current template addresses it, so a second generation returns a different character
wearing similar colours. With an 8-direction rig needing eight sheets of one subject, this stops
being a nicety.

The lock is a short digest carried forward, ideally captured from the accepted first sheet:

```
Head: dark undercut, cyan visor across upper face, no visible mouth.
Torso: charcoal jacket, asymmetric left shoulder plate, three amber chest lights in a vertical row.
Hands: bare, mid-brown skin.
Palette: #1E1E24 base, #334155 mid, #06B6D4 accent, #F59E0B secondary accent.
```

Concrete, countable attributes reproduce; adjectives do not. "Three amber lights in a vertical row"
survives; "high-tech chest detailing" does not. Pair it with a fixed seed where the target supports
one.

---

## 6. Unsung Saviour presets

Three presets encoding the art contract from that project's
`docs/todo/art-style-three-quarter-view.md`, so its art can be generated without re-deriving the
numbers. **Every value below is taken from that document** — if it changes there, these follow.

The game is fantasy today and moves to cyberpunk later, so `setting` is the only field expected to
change. Nothing else here is theme-dependent.

### Shared technical configuration

| Parameter | Value | Why |
| --- | --- | --- |
| `RENDER_STYLE` | `PIXEL_ART` | High-resolution pixel art, drawn 1:1 |
| `PROJECTION` | `THREE_QUARTER_TOPDOWN` | The ALTTP read the game is targeting |
| `CAMERA_ELEVATION` | `30` | The grounded figure for that style |
| `RESOLUTION_PROFILE` | `HIGH_RESOLUTION` | |
| `PALETTE_LIMIT` | `RESTRAINED_64_COLOR` | The plan requires a locked, restricted palette |
| `OUTLINE_STYLE` | `DARK_LOCAL_CONTOUR` | |
| `LIGHTING_MODEL` | `FLAT_NEUTRAL_ALBEDO` | **Load-bearing.** The engine lights actors via `CanvasModulate` and `Light2D`, and draws its own shadows. Baked directional lighting would fight both |
| `BACKGROUND_KEY` | `MAGENTA_FF00FF` | Keyable against the game's dark palette |
| `SURFACE_DETAIL` | `CLEAN_PRODUCTION` | |
| `ASPECT_RATIO` | `SQUARE_1_1` | |

### Preset 1 — `US_CHARACTER_RIG` (party, NPCs, humanoids)

| Parameter | Value |
| --- | --- |
| `CATEGORY` | `CHARACTER` |
| `RIG_MODE` | `CUTOUT_RIG` |
| `DIRECTIONAL_MODE` | `CUTOUT_RIG_SINGLE_DIRECTION` (15 components) |
| `DIRECTIONS` | one of `EIGHT_COMPASS`, **one per run** |
| `SPRITE_TARGET_SIZE` | `48 × 96 px assembled (2 metres tall at 48 px per metre)` |
| `JOINT_CAP_STYLE` | `ROUNDED` |
| `OVERLAP_MARGIN` | `HALF_CAP` |
| `SOCKETS` | `head, chest, back, hand_left, hand_right` |
| `EXCLUSIONS` | `No baked shadow of any kind, no ground contact shadow, no assembled figure, no equipment in the sockets` |

`SOCKETS` is what makes the game's deferred visible-equipment decision cheap later: the slots exist
in the art from the start, kept clear, so gear can be added without redrawing bodies.

**Run it eight times**, once per compass direction, with a shared `IDENTITY_LOCK` — 8 sheets ×
15 pieces = the 120-piece rig, in achievable units.

### Preset 2 — `US_CREATURE_RIG` (enemies, bosses, pets, critters)

As above with `CATEGORY: CREATURE`, and `DIRECTIONAL_MODE` matched to the creature's anatomy — a
quadruped's inventory is not a humanoid's. `SOCKETS` is usually empty; enemies do not wear player
gear.

### Preset 3 — `US_TILESET_3Q` (floors, walls, wall faces)

| Parameter | Value |
| --- | --- |
| `CATEGORY` | `BUILDING` |
| `RIG_MODE` | `NONE` |
| `DIRECTIONAL_MODE` | `TILESET_MODULAR` |
| `SPRITE_TARGET_SIZE` | `48 × 48 px per tile (1 metre)` |
| `ANATOMY` | `Modular Building Tiles` |
| `EXCLUSIONS` | `No characters, no props, no baked lighting, no shadow` |

Inventory for the three-quarter read — a floor, a wall **top**, and a wall **face** are three
distinct tiles, and it is the face that produces the angle:

```
Floor ×4 (one base, three low-frequency variants)
Wall top ×1 · Wall face ×1
Wall top corner: outer-left, outer-right, inner-left, inner-right
Wall face corner: outer-left, outer-right, inner-left, inner-right
Floor edge trim ×2
```

Sixteen tiles — comfortably inside one generation.

The face corners were originally listed as **left, right** only, which summed to fourteen against
this section's own "sixteen" and, worse, left a concave wall junction with no tile to draw it. The
face turns the same corners the top does, so it needs the same four cases; an inner corner is
neither a mirror nor a rotation of an outer one, so nothing else in the set stands in for it.

**Tiles must be seamless.** Not a rigging concern, so state it in `EXCLUSIONS` or `MATERIALS`:
opposite edges match so tiles butt without a visible seam, and no tile carries a feature that
reveals repetition when laid in a field.

---

## 7. Model wrappers

Corrected and extended. Two of the current wrappers contain errors.

### `GENERIC`
Emit unmodified. Correct for a conversational model, and the only target that can serve
`EMIT_MANIFEST`.

### `MIDJOURNEY`
```
[template] --ar [AR] --style raw --s 50 --no text, labels, shadow, gradient, frame, border
```
- **`--sw 250` removed.** `--sw` is *style-reference* weight and does nothing without an
  accompanying `--sref`. If stylisation strength was intended, that is `--s`, and it wants to be
  **low** — high stylisation fights a technical layout brief.
- **`--v 6.1` removed** and made a parameter. A pinned version goes stale by design.
- **`background` removed from `--no`.** The sheet needs a *keyable* background; excluding
  "background" risks losing the key colour.
- `--style raw` retained — correct, it reduces aesthetic intervention.

> **Corrected after shipping — raw mode is `--raw` on the V8 line.** The flag above was checked for
> whether it was *the right thing to ask for* and never for whether the syntax was current, and it
> was not: Midjourney renamed it with V8, so `--style raw` is V7-and-earlier syntax. The wrapper had
> since been pinned to `--v 8.2`, which put the two in direct contradiction — a version flag naming
> V8.2 beside the raw syntax belonging to V7 — and the flag left unreliable by that is the one whose
> whole job is to stop Midjourney restyling a technical layout brief. The wrapper now emits `--raw`
> ([Raw](https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw),
> [Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List)).
>
> The lesson generalises past this flag: a pinned third-party version does not make the *syntax*
> beside it self-checking. `MIDJOURNEY_VERSION` was introduced so the version had one place to
> change, and the flags around it silently kept belonging to the version it replaced. Re-checking the
> pin means re-checking its neighbours.

> **Corrected after shipping — `frame, border` now comes out for the category whose components are
> frames.** The `--no` list above is unconditional, and that held while every category's subject was
> a figure, a prop or a structure. The `INTERFACE` category breaks it: its inventory is
> `Frame corners ×4`, `Frame edges ×4` and a panel frame, so `--no border` suppresses the sheet's own
> subject. §0 and §3 were reworded in the same change to ban a frame or border *around the image or
> around a component* rather than the shapes themselves — annotation, which is what the rule always
> meant — but an entry in `--no` names a thing to avoid and never a *placement*, so the term has to
> be present or absent rather than qualified. `wrapForMidjourney` now drops `frame, border` when
> `FRAME_IS_A_COMPONENT[category]` is true, and emits the list above otherwise.
>
> This is the same judgement as the `background` bullet above, and it is worth naming as a pattern
> rather than a second exception: **a term belongs in `--no` only while no subject the app can
> describe is made of it.** A negative prompt is the one place in this app that cannot say *where*
> something is forbidden, so every entry in it is a claim about the whole configuration space, and
> that space widens each time a category is added.

### `STABLE_DIFFUSION` (SD 1.5 / SDXL)
```
[template]

Negative prompt: (assembled character:1.3), (posed figure:1.3), text, watermark, signature,
labels, floor shadow, drop shadow, gradient background, scene background, blurry, anti-aliased
edges, smooth gradients, motion blur, jpeg artifacts, extra limbs, merged limbs, cropped
```
Weighted on the two failures that actually recur: assembling the figure instead of exploding it,
and adding shadows.

### `FLUX` — **NEW, split from `STABLE_DIFFUSION`**
Currently grouped with SD, but one wrapper cannot serve both: **Flux has no negative prompt** in
normal use, so the entire negative block above is silently discarded, and it responds better to
prose than to weighted tags. Restate positively:

```
[template]

The sheet shows only disconnected individual parts on a flat [BACKGROUND_KEY] field, with crisp
hard edges, no shadows, no text, and no assembled figure.
```

### `GOOGLE_IMAGEN`
Prepend one plain-language framing sentence. Imagen handles descriptive natural language well and
long rule lists poorly, so consider emitting a **condensed** variant for this target.

> **Outcome — shipped, and not as a second template.** A condensed *variant* would have meant a
> second document to keep true to the first, which is the duplication §10.1's token validation
> exists to prevent. Instead the one template drops what a target cannot act on, gated by a
> capability declared per model: `deliberates` is false for every single-pass image endpoint, and
> §9's self-audit — "before delivering, verify… redraw rather than delivering the sheet" — names a
> pass they do not have. That is ~30 lines, from the *end* of the prompt where attention is
> weakest and where the most rule-list-shaped block sat. Measured in the browser: 2,467 → 2,246
> words for Imagen.
>
> This is deliberately not a rewrite into prose, and it leaves §8's exclusions in place. Cutting
> instruction the endpoint cannot execute is a structural argument that holds for all five image
> targets; judging that Imagen would also do better with *fewer restated descriptions* is a claim
> about one model that nothing here measures. That part stays open, and wants real generations
> rather than reasoning to settle.

> **Correction — the target itself was the problem, and it is gone.** Checked against Google's
> documentation immediately afterwards, the guidance above was answering a question that no longer
> mattered. **Imagen 3 shut down on 10 November 2025**, and **Imagen 4 shuts down on 17 August
> 2026** — still ten days away as this was written, and already the reason not to build on it. Its
> documented ceiling is **"Maximum prompt length is 480 tokens"** against the ~3,645 this app emits:
> **7.6× over**, which no amount of condensing a specification was ever going to close. The 221
> words saved above are roughly a ninth of that overage. The entry is removed.
>
> **Two Google pages disagree about the migration target, and this picks the deprecations table.**
> [The schedule](https://ai.google.dev/gemini-api/docs/deprecations.md.txt) names
> `gemini-3.1-flash-image` for all three Imagen 4 variants; [the Imagen
> guide](https://ai.google.dev/gemini-api/docs/imagen) says "migrate to Nano Banana" and then, in
> its instructions, "Use `gemini-2.5-flash-image` instead of Imagen model names" — a model that
> itself shuts down on 2 October 2026. The dated table is the better authority and the one followed.
>
> Its replacement inverts the capability, which is why guessing would have got it wrong: **Gemini's
> image models are thinking models** — "Gemini 3 image models are thinking models that use a
> reasoning process ('Thinking') for complex prompts. This feature is enabled by default and cannot
> be disabled in the API" ([image
> generation](https://ai.google.dev/gemini-api/docs/image-generation)) — and both return text as
> well as images, per their own model pages
> ([Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image),
> [Pro](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image); the image-generation guide
> attributes interleaving to Pro only, so the model pages are what the claim rests on). So
> `GEMINI_FLASH_IMAGE` (Nano Banana 2) and `GEMINI_PRO_IMAGE` (Nano Banana Pro) receive the **full**
> specification including the self-audit, and can be asked for the companion manifest. They need no
> wrapper: they read the prompt as a specification rather than conditioning on it as a caption,
> which is what the framing sentence above was compensating for.

### `DALLE_3` / GPT-image
Prepend a short directive. This family **rewrites prompts before generation**, so terse absolute
phrasing survives better than elaborate structure — which is part of why section 0 sits at the top.

> **Correction — also retired; the directive stays, for a checked reason.** OpenAI shut down
> `dall-e-3` (and `dall-e-2`) on **12 May 2026**, naming `gpt-image-2`, `gpt-image-1` or
> `gpt-image-1-mini` as replacements; `gpt-image-1` itself follows on 23 October 2026. The target is
> now `GPT_IMAGE`. `gpt-image-2` lists **image as its only output modality**, so it gets no manifest
> and no self-audit.
>
> The directive was very nearly dropped on the grounds that the Images API documents no prompt
> rewrite for `gpt-image-2`. That is true of the raw endpoint and beside the point: image generation
> through the Responses API — which is the ChatGPT path this app's users are actually on — documents
> that "the mainline model … will automatically revise your prompt for improved performance", handed
> back as `revised_prompt`. So terse absolute phrasing still has something to survive, and the
> sentence is kept on evidence rather than on family resemblance.
>
> Sources: [deprecations](https://developers.openai.com/api/docs/deprecations),
> [gpt-image-2](https://developers.openai.com/api/docs/models/gpt-image-2),
> [image generation guide](https://developers.openai.com/api/docs/guides/image-generation).

> **Corrected again — the directive is gone, and the entry it defended was pointing at the wrong
> surface.** The correction above rests on "which is the ChatGPT path this app's users are actually
> on", and that step is the one that does not hold. OpenAI document the rewrite for the image
> generation tool **in the Responses API** and for nothing else; no page says chatgpt.com does the
> same, and the `CHATGPT_5_6_SOL` wrapper already records that gap in as many words — including that
> an earlier draft of *it* asserted the same rewrite to the same surface and had to be corrected.
> Two files beside each other, one holding the claim the other exists to keep out.
>
> What the entry was actually describing was two products at once. `gpt-image-2`'s model page lists
> `v1/images/generations` and `v1/images/edits` as its endpoints and "image" as its only output
> modality — a single-pass endpoint, which is what the entry's capability flags declare — while its
> `generatorSite` sent the reader to chatgpt.com/images, where OpenAI's release notes give the
> surface *images with thinking* — planning and refining before it draws, when it is given more time
> to think on a paid plan. That surface already has an entry, and Sol's wrapper
> is the whole account of it. So `GPT_IMAGE` is now the Images API alone: its generator site is
> `NONE` with the finding, the modality claim cites the model page rather than the deprecations page
> (which carries only the shutdown table), and the directive prefix is deleted, because on the Images
> API there is no documented rewrite for terse absolute phrasing to survive. The split is the one
> that already separates `FLUX` from `FLUX_API` — one model family, two surfaces, two entries.
>
> Sources: [gpt-image-2](https://developers.openai.com/api/docs/models/gpt-image-2),
> [image generation guide](https://developers.openai.com/api/docs/guides/image-generation),
> [ChatGPT release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes).

### `CHATGPT_5_6_SOL` — keep the target, slim the wrapper

ChatGPT 5.6 Sol is a current OpenAI frontier model (confirmed by the maintainer 2026-08-07; it
postdates this author's knowledge, so nothing here is written from familiarity with its behaviour —
the reasoning below is structural, and the model-specific tuning needs someone who has used it).

**The existing wrapper now largely duplicates the template.** It was written against v1, whose
critical constraints sat in §8–9 at the bottom, and it compensated by restating them up front. v2
fixes that structurally — section 0 *is* the done-condition and output-integrity contract, and
section 9 *is* the verification pass. Carrying the wrapper unchanged states the same three rules
three times, which wastes context and can dilute rather than reinforce instruction-following.

Keep only what is genuinely model-specific and not already in the template:

```
[SYSTEM DIRECTIVE — REASONING & OUTPUT CONTRACT]
High reasoning effort: this is a multi-component spatial layout task. Plan the grid and the
per-component bounding boxes before drawing.
Treat section 0 as a hard done-condition and section 9 as a required verification pass before
delivery.

[template]
```

Dropped as redundant with v2: the component-count restatement (section 0.1), the pure-background
rule (0.2), the "no smooth vector anti-aliasing" density contract (0.6), and the closing
verification questions (section 9). Each was doing real work against v1 and none of it is needed
twice.

This target is also the natural home for `EMIT_MANIFEST` (§4) alongside `GENERIC`, since it returns
text with the image — as, since the corrections above, are both Gemini image targets.

> **Corrected after shipping — Sol does not draw, and the wrapper above was written as though it
> did.** The section headed this target "keep the target, slim the wrapper" and then slimmed it by
> reasoning about the *template*, because at the time nothing about the model had been checked. It
> has been now, prompted by [issue #20](https://github.com/BootBlock/SpriteGubbins/issues/20)
> reporting that adherence on this target "isn't too good and seems a bit random sometimes", and the
> checking found a mechanism that no amount of template reasoning could have reached.
>
> **`gpt-5.6-sol` lists `text` as its only output modality**, with `image_generation` among its
> *tools* ([model page](https://developers.openai.com/api/docs/models/gpt-5.6-sol)). A sheet
> therefore arrives by Sol calling that tool — and OpenAI document what happens at the boundary:
> "When using the image generation tool, the mainline model … will automatically revise your prompt
> for improved performance", returned as `revised_prompt`, with "always a GPT Image model" doing the
> rendering ([image generation
> tool](https://developers.openai.com/api/docs/guides/tools-image-generation)). **So this app's
> specification is not what gets rendered on this target. Sol's paraphrase of it is** — through a
> compression step the app never sees, does not control, and had never accounted for. That is a
> plain candidate for run-to-run variance the prompt itself does not explain, and it is invisible
> from inside the template.
>
> The wrapper is now that finding and nothing else: it tells Sol it is handing off, and names the
> three parts of the specification the hand-off must carry through unshortened — §0's contract, §3's
> object yaws and §4's inventory. Everything the block above emitted is **gone**, on OpenAI's own
> guidance for the family ([GPT-5.6 model
> guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)):
>
> - `High reasoning effort:` — effort is a request parameter, not something a line of prose sets.
>   The guide's advice on it also runs the other way: establish a baseline at the current setting,
>   then test *one level lower*.
> - `Plan the grid and the per-component bounding boxes before drawing.` — the guide lists "process
>   instructions for behavior the model already performs reliably" among what to remove.
> - `Treat section 0 as a hard done-condition and section 9 as a required verification pass` —
>   "repeated statements of the same rule", also listed. §0 is *titled* NON-NEGOTIABLE OUTPUT
>   CONTRACT and opens "Satisfy this section before any aesthetic consideration"; §9 opens "Before
>   delivering, verify".
>
> Those removals are not a token economy. OpenAI report that leaner prompts "improved evaluation
> scores by roughly 10–15% while reducing total tokens by 41–66%", and warn that "GPT-5-class models
> follow prompt contracts closely, so conflicting rules can create more instability than missing
> detail" — which makes a wrapper that restates the template a *cost* on this target rather than
> reinforcement. **This is the answer to the question issue #20 opened with.** More target-specific
> text is not the same as better adherence: for Sol the correct adaptation was subtraction plus one
> thing the template cannot say for itself, because the template does not know it is being relayed.
>
> The same guidance is why §9 stays here rather than joining the cuts: "Render the artifact before
> finalizing. Inspect layout, clipping, spacing, missing content, and visual consistency" is §9, and
> a verification pass is not a repeated statement of a rule.
>
> **`EMIT_MANIFEST` survives this, on a corrected premise.** The paragraph above ends "since it
> returns text *with the image*", which the finding falsifies — nothing on this target returns an
> image at all. The conclusion is unchanged and the reason is now the right one: Sol answers in text,
> which is the whole of what a manifest needs, and the image arrives separately from the tool. That
> is what `emitsText: true` has always meant, so no capability moves; only the sentence explaining it
> was wrong.
>
> **Left open, deliberately.** §8's exclusions restate §0.2 and §0.3, which is the "repeated
> statements of the same rule" the guide names — but dropping a section for one target is a
> behavioural bet, and the evidence above says lean prompts win *on OpenAI's coding evals*, not that
> this specification's redundancy is what costs it a sheet. That wants real generations rather than
> reasoning, the same way the Imagen condensation question above did.

> **Closed, and not by generations — by reading the other half of the vendor's own advice.** The
> maintainer asked what actually renders the image on this target, which sent this back to OpenAI's
> pages for the *product* rather than the API. Two findings came out of it, and the second answers
> the paragraph above.
>
> **What renders it is `gpt-image-2`**, branded **ChatGPT Images 2.0** in the product. The chain:
> `gpt-5.6-sol` gives `text` as its only output modality with `image_generation` under *tools*; the
> tool guide says the renderer is "always a GPT Image model" and that "**the tool handles GPT Image
> model selection**"; the [ChatGPT release
> notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes) for 21 April 2026
> introduce "**ChatGPT Images 2.0**, our new image generation model in ChatGPT"; `gpt-image-2` ships
> the same day (`gpt-image-2-2026-04-21`) with `image` as its only output modality; and OpenAI's own
> [ChatGPT docs](https://learn.chatgpt.com/docs/image-generation) state "Built-in image generation
> uses `gpt-image-2`". *No single page equates the product name to the model id in those words — that
> last step is inference, and it is recorded as inference.*
>
> **Selecting Sol is not inert, and not for the reason the wrapper assumed.** The same release notes:
> "images with thinking … is available on all paid ChatGPT plans. **It is available when you select
> Thinking and Pro models**", and [GPT-5.6 in
> ChatGPT](https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt) states that "GPT-5.6 Sol
> now powers the **Medium**, **High**, and **Extra High** reasoning options", with Instant being
> GPT-5.5 Instant. So choosing Sol puts the user on a thinking tier, which is the documented switch
> for the image model's own planning pass. Nothing in the prompt can set that — it is the user's
> pick — which is why it belongs in what the app *tells* them, not in what it emits.
>
> **And §8 stays.** OpenAI's guidance for an *image* prompt is "**Repeat any requirement that must
> stay fixed**" — the exact opposite of the line the paragraph above was weighing, for the exact
> repetition it was weighing cutting. The two do not contradict: the lean guidance addresses the model
> **reading** this specification, the repetition guidance the model **rendering** from it, and on this
> target those are two different models with a tool call between them. The open question was framed as
> "does this specification's redundancy cost it a sheet", and the answer is that redundancy was never
> a single question — it depends which side of the hand-off a given restatement is for. Cutting §8 on
> the strength of the GPT-5.6 guidance would apply a text model's rules to the image model's half.

### Documented prompt ceilings

Each target's `promptBudget` records what the vendor or the architecture publishes about how much
prompt is actually read, in one of four states. **A `CEILING` is a figure past which the target
stops reading**; **`GUIDANCE` is a figure the vendor publishes as advice**, past which they document
degradation rather than truncation; **`UNPUBLISHED` is a vendor who states no figure**, and
**`NO_VENDOR` is `GENERIC`**, which names no product for a figure to be about. Neither of the last
two means *unlimited* — nobody said so — which is why the studio shows nothing rather than a
reassuring tick, and why a figure is only ever added with a source beside it.

| Target | Ceiling | What imposes it |
| --- | --- | --- |
| `STABLE_DIFFUSION` | **77 tokens** | CLIP text-encoder context. A base pipeline truncates past it; front-ends that chunk read further, with weaker attention. |
| `FLUX` | **512 tokens** | `MAX_LENGTH` in Black Forest Labs' own FLUX.2 inference code, shared by [dev] and [klein]. FLUX.1 dev matches it; Schnell reads 256. |
| `FLUX_API` | **32,000 tokens** | Advertised FLUX.2 text input limit on the hosted tier. *(Added later — see the correction below.)* |
| `QWEN_IMAGE` | **4,500 tokens** | Model input token limit — the tightest ceiling here the whole specification still fits inside. |
| `SEEDREAM` | **600 English words**, as guidance | ByteDance state it on the `prompt` parameter itself, and describe scattered information and overlooked details past it — degradation, not truncation, so the studio words it as a trade-off. |
| `GPT_IMAGE` | **32,000 characters** | "The maximum length is 32000 characters for the GPT image models" — the Images API's `prompt` parameter. |
| `GEMINI_PRO_IMAGE` | **65,536 tokens** | Model input token limit. |
| `GEMINI_FLASH_IMAGE` | **131,072 tokens** | Model input token limit. |
| `CHATGPT_5_6_SOL` | **922,000 tokens** | Maximum input tokens: the 1,050,000 context window, less the 128,000 output tokens reserved against it. What this field measures is the prompt alone. |
| `MIDJOURNEY` | none published, `UNPUBLISHED` | No article in Midjourney's public help centre states a prompt length. Its own guidance runs the other way regardless: "short and simple prompts typically generate the best images", and "avoid making long lists or detailed instructions". |
| `GENERIC` | none published, `NO_VENDOR` | It names no particular model, so there is no vendor to publish a length. |

Two of these took a second pass to get right, which is the point of writing the source beside each.
The Gemini and GPT Image rows were first recorded as "none published" on the strength of the pages
that describe *image generation*; the figures are on the **model** pages and in the **API
reference**, and "I did not find one" had been written down as "there isn't one" — the exact
confusion the `null` convention above exists to prevent. Two vendor surfaces also disagree in
passing: the DeepMind card for Flash says "a token context window of up to 1M" against
ai.google.dev's 131,072, and OpenAI's `model` enum on the Images reference has not been updated to
list `gpt-image-2` at all. The lower, dated, API-reference figures are the ones recorded.

This matters more than it looks. The app composes a specification of roughly **3,645 estimated
tokens**, and until this was recorded it said nothing at all about a target documented to read the
first seventy-seven of them — a word count is a fact about the prompt, not about whether anything
will read it. The studio now says so, in gold, beside the copy button, and still refuses to trim:
a specification silently cut to a ceiling would contract for a sheet it no longer describes. On the
figures above only Stable Diffusion and Flux are exceeded; the rest have room to spare, which is
worth knowing rather than assuming.

*(Corrected later — August 2026.)* Two of the statements above have since stopped being true, and
both were found by re-checking rather than by anything failing. OpenAI's Images reference now does
list `gpt-image-2` beside `gpt-image-1.5`, so that disagreement is closed. And `null` is gone as a
state: recording "no ceiling" and "no figure found" in one value is what made Seedream — the one
target whose own entry says long briefs lose instructions — the one target that could never say so,
because the studio's notice keys off the field. The four states above replace it, and the row for
each of those three targets now says which one it is. The last sentence above has also stopped being true:
the specification has grown since, and against the figures as they now stand Qwen-Image is exceeded
as well, while Seedream is seven times past the advice ByteDance publish.

> **Corrected after shipping — the `CHATGPT_5_6_SOL` row recorded the wrong one of two figures.**
> 1,050,000 is the *context window*, and the model page states a separate **922,000 maximum input
> tokens** beside it, the difference being the 128,000 output tokens the window also has to hold.
> Every other row in this table is an input ceiling, and this column is measured against the prompt
> alone, so the window was the wrong figure for the question being asked — it was a real number read
> off the right page under the wrong heading, which is the failure a citation does not catch. The
> constant is now 922,000 ([model page](https://developers.openai.com/api/docs/models/gpt-5.6-sol)).
> Nothing about the app's behaviour changes: the specification is ~3,645 estimated tokens either way.

**`MIDJOURNEY_VERSION` went stale exactly as its own comment predicted.** It said `--v 7` while
Midjourney's default moved to V8.1 on 10 June 2026 and V8.2 on 24 July 2026. It is now `--v 8.2`.
A pinned third-party version is a claim with an expiry date; it wants re-checking, not trusting.

> **Corrected after shipping — the `FLUX` row described a superseded generation.** FLUX.2 replaced
> FLUX.1 on 25 November 2025, and this row went on naming a T5 encoder and a 77-token CLIP window
> that FLUX.2 does not have: [dev] encodes with `Mistral3SmallEmbedder`, [klein] with
> `Qwen3Embedder`, and there is no CLIP stage at all
> ([text encoders](https://deepwiki.com/black-forest-labs/flux2/3.2-text-encoders)). The **512
> survived by coincidence** — Black Forest Labs' own FLUX.2 inference code sets `MAX_LENGTH` to 512
> — which is the worst way for a figure to stay right, because nothing about it was still being
> checked.
>
> The consequential half is that 512 was never true of all of Flux. The hosted tier advertises
> **32K text input tokens** ([FLUX.2](https://bfl.ai/models/flux-2)), so a FLUX.2 [pro] user was
> being told a prompt their endpoint reads comfortably was seven times over budget. The target is
> therefore **split**: `FLUX` for the open weights, `FLUX_API` for pro/max/flex. One entry could
> only ever have been wrong for one half of Flux's users.
>
> A third finding came out of the same check, and it is the one that changed the *prompt* rather
> than a number. Flux's positive restatement — the sentence that exists precisely because
> [Black Forest Labs state](https://docs.bfl.ai/guides/prompting_guide_flux2) "FLUX.2 does not
> support negative prompts" — was **appended**, roughly 3,600 tokens into a prompt the open weights
> stop reading at 512. It could not reach the model it was written for. It now leads, which is also
> what BFL's own "word order matters — FLUX.2 pays more attention to what comes first" calls for.

> **Two targets added: `QWEN_IMAGE` and `SEEDREAM`.** Both were checked for currency *first*, which
> is the habit the Flux and Midjourney findings above earned. That check immediately changed one of
> them: the obvious Seedream entry was 4.5, and 4.5 is superseded — 5.0 Lite shipped February 2026
> and **5.0 Pro became the flagship on 8 July 2026**. Adding 4.5 would have reproduced the Flux
> defect in the same change that fixed it.
>
> - **`QWEN_IMAGE`** (Qwen-Image 3.0, 21 July 2026) takes **4.5K tokens** — the tightest ceiling
>   recorded here that the ~3,600-token specification still fits inside. *(First written as "the
>   only target it fits inside", which review showed was plainly false: `FLUX_API`, `GPT_IMAGE` and
>   both Gemini models have far more room. The true and useful claim is the narrow margin, not a
>   superlative.)* Alibaba document `negative_prompt` as a
>   parameter, so it earns a negative block; **unweighted**, because SD's `(term:1.3)` is an
>   Automatic1111/compel convention parsed by those front-ends rather than anything Qwen defines.
>   Not a thinking model, so no self-audit. Worth recording that 3.0 shipped cloud-only — no
>   weights, no model card, no benchmarks — unlike 1.0 and 2.0.
> - **`SEEDREAM`** (Seedream 5.0) is the table's first `deliberates: true, emitsText: false`. It
>   reasons over the brief and plans its layout before rendering, so the self-audit is actionable;
>   it returns JPEG or PNG and nothing else, so the manifest is not. `targetCapabilities.test.ts`
>   had anticipated exactly this split in a comment — "a reasoning model that returns none" — and
>   the two flags now genuinely disagree somewhere, which a test pins so they cannot silently
>   re-converge.
>
> Its wrapper is the one instruction here that tells a target **what to sacrifice**, and that is
> specific rather than decorative: ByteDance document that overloaded briefs drop instructions, and
> a model that drops by *choice* can be told what to drop, where a truncating encoder cuts by
> position and cannot.

> The V8.1 date above was first recorded here as 11 June 2026; Midjourney's
> [Version](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version) page dates the
> switch to **10 June 2026**, and it is corrected in place because it is an external fact this
> document got wrong rather than a record of anything the project did.

> **Corrected after shipping — four wrappers stated the *pixel-art* edge rules for every render
> style.** The blocks above were written while this app was pixel-art-only, which is the same
> starting point §2 of this document was written to fix, and the terms came through the rewrite
> unchanged: "crisp hard edges" leading the Flux sentence, `anti-aliased edges, smooth gradients` in
> SD's negative block, `blurred edges, anti-aliased edges` in Qwen's, and `shadow, gradient` bare in
> Midjourney's `--no`. The template emits those rules only under
> `[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]`, so on the eight other styles each wrapper argued
> with §2 of the prompt it was wrapping: a `PAINTED_2D` sheet asked for "soft blended forms" and had
> blending weighted against it in the same prompt, and a `RENDERED_3D` sheet asked for "material
> shading and soft form shadow" while smooth gradients — which is what that shadow is made of — were
> negated. On Flux it was worse than a contradiction, because that wrapper leads: the wrong claim
> about edges got the position BFL's word-order guidance says is strongest, and the `Style:` line
> that would have corrected it sits past the 512-token ceiling the same wrapper is written around.
>
> The edge and gradient clauses are now a function of the sheet, held in `RENDER_STYLE_SURFACE`
> beside the §2 wording they have to agree with, and the rule that record is kept to is that **a term
> may be negated only where the style's own §2 line asserts its absence** — so `anti-aliased edges`
> belongs to the two pixel styles alone, `smooth gradients` to the styles that state flat fills, and
> the three that describe a soft surface negate nothing about one. Flux's leading sentence carries
> the positive half, which on the open-weight tier is the only statement of the style that gets read
> at all.
>
> Four narrower corrections travelled with it, each the same shape:
>
> - **`--no shadow` became `--no cast shadow`, and `--no gradient` came out.** Midjourney documents
>   `--no` as a comma-separated list of things to avoid, and at the time this shipped it was not clear
>   how it reads a multi-word *entry*, so each term was chosen to be acceptable under either reading.
>   A cast shadow is the placement §0 forbids: taken whole it stops negating a form shadow, and taken
>   word by word it is no worse than the bare term it replaces. `gradient` cannot take the qualifier
>   it needs, because that word is `background` — which, read word by word, would put the one term the
>   bullet above keeps out of this list back into it, against a sheet built around a keyable
>   background. That loss is unrecoverable rather than a wash, so the gradient claim is the style's
>   own there too, or nothing.
> - **Flux's "no shadows" became "no cast shadow"** for a related reason: unqualified, the plural took
>   the form shadow that gives a component its volume along with the one on the ground.
> - **SD's `blurry` became the style's `blurred edges`.** It sat inside the run that was replaced, and
>   unlike `motion blur` and `jpeg artifacts` beside it — which name an artefact whatever the style —
>   it names the surface, so a sheet asking for soft blended forms was weighting against something a
>   reading of "blurry" overlaps with. It is now the same claim Qwen's block already spelled that way,
>   emitted where §2 asserts a hard edge and withheld on the three styles that ask for a soft one.
> - **`extra limbs, merged limbs` is emitted only where limbs are components.** It was in both
>   negative blocks on every category, including the ones whose components are tiles, panels and
>   frames — weight spent on a failure those sheets cannot have. Which categories those are is a
>   record of its own (`LIMBS_ARE_COMPONENTS`) rather than a read of `PERMITTED_KINDS`, deliberately:
>   that table answers which kind of entry a *plan* may name, and it calls a walker's legs a vehicle's
>   mechanism, which is right for an inventory and wrong for a negative prompt. VEHICLE offers
>   `Walker / Mech` and `Articulated Walker Legs`, so a third leg is a failure that sheet really can
>   have, and it keeps the pair.
>
> What did **not** change is the assembly pair: `assembled character, posed figure` is stated in a
> figure's vocabulary on every category, and that is a gap rather than a contradiction — every other
> category's §8 excludes characters outright, so those two terms still negate something those sheets
> genuinely must not contain. Saying it in each category's own words is a separate change.

> **Settled afterwards — Midjourney answers how `--no` reads a multi-word entry, for two different
> systems: one of them outright, the other from two statements of its own.** The bullet above chose
> its terms to be acceptable under either reading because neither answer had been found. Both were
> available:
>
> - **What reads the words independently is the moderation system**, and the
>   [No](https://docs.midjourney.com/hc/en-us/articles/32173351982093-No) page says so outright, with
>   a multi-word example: `--no modern clothing` "will read that as `no modern` and `no clothing`".
>   The consequence it documents is a false content warning, not a changed image.
> - **What gets drawn takes the phrase whole** — an inference across two pages rather than a sentence
>   to quote. The No page states that "using the `--no` parameter is the same as weighing part of a
>   multi-prompt to `-0.5`", and
>   [Multi-Prompts & Weights](https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights)
>   gives the substitution — `vibrant tulip fields --no red` is `vibrant tulip fields:: red::-0.5` —
>   and says what divides one concept from the next, which is `::` and not the space: "if you prompt
>   `space ship` Midjourney will consider those words together", where `space:: ship` asks it "to
>   think about `space` and `ship` as distinct elements". An entry with no `::` in it is one segment
>   at one weight.
>
> **The weak link in that chain is a version**, and it is the trap the `--raw` correction above
> already records. The multi-prompt page scopes itself to "versions 1, 2, 3, 4, Niji 4, 5, Niji 5, 6,
> Niji 6, and 6.1", which does not include the `--v 8.2` the wrapper pins. The No page is current for
> that version and restates the `-0.5` equivalence itself, so that half of the chain is
> version-current; `::` as the divider is not restated anywhere current. It belongs with the flag
> syntax that wants re-checking when `MIDJOURNEY_VERSION` moves.
>
> So `cast shadow` is doing what it was written to do rather than being a wash, and the terms in this
> list are read as concepts. The moderation reading is not a licence to ignore, though — it is the
> standing constraint on anything added here: **every word of a multi-word entry has to be one this
> app is content to have read alone.**
>
> One thing this does **not** settle is the `background` bullet further up. Read whole,
> `gradient background` would not negate the background, so decomposition is no longer what keeps it
> out — what keeps it out is that bullet, which bans the word rather than the bare term. Whether it
> still wants to be that wide is a decision to argue against the bullet, and the wrapper's doc
> comment says the same. As things stand all this channel says about a gradient is the style's own
> `smooth gradients`, while SD's and Qwen's blocks carry that **and** a `gradient background` of
> their own on every style — so Midjourney says less than they do in every configuration, and on the
> three styles whose §2 lines assert nothing about a gradient's absence (`PAINTED_2D`,
> `RENDERED_3D`, `CLAY_RENDER`) it says nothing at all.

> **Settled afterwards — the `background` rule stays at the word, and it is precautionary rather
> than a reading of the flag.** That is the decision the note above left open, and this is what it
> now rests on, because the argument that originally produced it no longer holds: the bullet further
> up removed a **bare** `background` entry, which is unarguable, and the width came later.
>
> **What keeps `gradient background` out is what a wrong answer would cost**, and that is worth
> stating carefully, because the tempting version of it is false. The list carries four multi-word
> entries and **not one of them is safe read word by word** — the rule is not that they are.
> `cast shadow` decomposes to the bare `shadow` it replaced, which is a wash. `blurred edges` and
> `anti-aliased edges` decompose to a bare `edges` at `-0.5`, on exactly the styles whose §2 line
> asserts a hard one, and `smooth gradients` to a bare `smooth`. Those three risks are real.
>
> **What separates them from this one is kind, not size.** All three return a sheet that argues with
> its own style statement and comes back softer than it was asked for — a degraded sheet, and a
> degraded sheet can be generated again. `gradient background` decomposed puts `-0.5` on the colour
> the whole sheet is registered against, and an unkeyable sheet is not a worse result but a useless
> one: the compositing step it exists for cannot be run at all.
>
> **So it is the recoverability that decides it, not the balance of evidence**, and two further facts
> are why that has to do the work:
>
> - **The atomicity half of the chain is the half nothing current states.** What makes an entry one
>   concept is `::` being the divider rather than the space, and that is only on the multi-prompt
>   page, which scopes itself away from the pinned `--v 8.2`. The note above records this; it is the
>   same trap as `--style raw`.
> - **The flag is unverifiable without a subscription**, so this is a risk the repository cannot
>   retire by testing — no gate here will ever report it.
>
> Where being wrong degrades a sheet, that is worth accepting for a term that earns its place; where
> it destroys one, it is not.
>
> **One correction this carries with it.** The note above says of the bullet that it "bans the word
> rather than the bare term" — that describes the rule as it stood, not the bullet, which removed a
> bare entry and said nothing about the word. Both statements are left where they are, per the rule
> against rewriting a plan's history; this is where the two are reconciled.
>
> So the ban is on the **word**, and it is not a claim about how `--no` reads. Better evidence that
> entries are atomic does not on its own reopen it — what would is that evidence arriving as a page
> current for the pinned version, or the failure ceasing to be unrecoverable.
>
> **What it costs is one negative term, stated here so it is not rediscovered as a gap.** Midjourney
> remains the one channel of three carrying no fixed `gradient background`: all it says about a
> gradient is the style's own `smooth gradients`, and on `PAINTED_2D`, `RENDERED_3D` and
> `CLAY_RENDER` it says nothing. §0's uniform key field is stated in the prompt body, which
> Midjourney reads in full, and the `--no` list was never what carried it. No compiled prompt
> changed.

> **Corrected after shipping — that separate change, and the last fixed string in the three
> channels.** `(assembled character:1.3), (posed figure:1.3)` opened SD's block, `assembled
> character, posed figure, complete figure` opened Qwen's, and `no assembled figure` closed Flux's
> leading sentence, on all nine categories. The note above is right that the terms were not *wrong*
> elsewhere — what was missing is the claim they exist to make. Every sheet has an assembled-whole
> failure and only two have it in a figure's vocabulary: a building's is the finished structure
> instead of its modules, a terrain's a view of the ground instead of separable tiles, an interface's
> a screenshot instead of a kit, an effect's one composited picture instead of a sequence. So the
> highest-weighted term in the block was spent naming something seven of the nine sheets could not
> contain, while their own failure went unnamed. `CATEGORY_ASSEMBLY` holds one entry per category —
> bare terms for the two negative blocks, and a clause worded as English for Flux's prose — and SD
> applies its own `(term:1.3)` at the wrapper, so the weighting stays this channel's convention
> rather than becoming the record's.
>
> **What may go in a list is bounded by the same judgement `--no` is**, and it costs more here than
> it looks: a term belongs only where no word of it names something that sheet's own prompt
> requires. That is why BUILDING has one term and not two — every candidate for a second names what
> its components already are, its §4 guard calling every entry "a structural or tile component" —
> and why EFFECT may say neither "effect" nor "frame" nor "sequence", each of which its §4 requires.
> TERRAIN loses the sharper half of its failure outright: the tiles-already-laid reading cannot be
> stated without "tiles", "ground" or "field", and negating any of them would take either the
> subject or §9's edge agreement with it, so what is left is the composed-*view* reading, on
> `diorama` and `vista` from §8's own line. Qwen's third term went too — `complete figure` is
> `assembled character` said again, and one record cannot hold two spellings of an entry without the
> categories diverging by target, which is the argument that turned `blurry` into `blurred edges`
> above.
>
> **Two terms cleared §4 and were still wrong, and what they cost is the test rather than the
> wording.** `stacked layers` reads as EFFECT's own failure — its plan says in as many words that no
> frame "is a layer to be stacked on another" — but *Secondary Layer* is what that category calls the
> smoke trailing its core, a shipped preset pins `Layered Multi-Core Cluster`, and §4 asks for
> "whatever secondary layer the subject named". `inventory icon` is what an ITEM sheet comes back as
> when it fails, and "inventory" is what the template calls the count-and-order contract, in the
> title of §4 itself. Neither word is in a plan entry, which is all the first version of
> `categoryAssembly.test.ts` read. It now opposes the terms with three sources — the plans, the
> category's own field labels and option pools, which §1 carries verbatim, and the template's section
> headings — with singular and plural counted as one word, since *Layer* against `layers` is how the
> first of them got through. Two things stay out of that opposition on purpose: a category's **own
> name**, because no component of a CHARACTER sheet is a character, and the **`exclusions` pools**,
> whose options are prohibitions rather than names.
>
> **What this change does *not* touch is the template's own three statements of the same claim**, and
> they are stated in a figure's vocabulary on all nine categories: §4's "Do not draw an assembled
> figure anywhere on the sheet", §8's "Assembled or posed complete figures", and §9's "nothing on the
> sheet is an assembled or part-assembled figure". So the note above is wrong that the negative
> channel was the only place left — it was the last of the *wrappers*, and the body reaches every
> target rather than three. Giving those three lines a category is the same shape of work as
> `[DEFINE:CATEGORY_EXCLUSIONS]` and belongs in its own change, against the template and its §3
> mirror together.

> **Done in that later change — the three body lines now take a category too, and they take three
> defines rather than one.** `[DEFINE:CATEGORY_ASSEMBLY_INSTRUCTION]`,
> `[DEFINE:CATEGORY_ASSEMBLY_EXCLUSION]` and `[DEFINE:CATEGORY_ASSEMBLY_AUDIT]` fill §4's closing
> sentence, §8's bullet and §9's check from three new fields on the same `CategoryAssembly` record the
> wrappers read — one record per category, holding one claim in all five of the voices the app states
> it in, which is what stops a category naming its failure one way in a negative prompt and another in
> the body. **Splicing one string into all three was the option rejected**, because they are not one
> sentence: §4 tells a generator what not to draw, §8 lists a thing absent from the image, and §9 is a
> check a reader applies to the delivered sheet component by component. That last one is why the audit
> form qualifies every noun — the mistake `CATEGORY_AUDIT_TEXT` records making, where "no exhaust"
> failed a VEHICLE sheet on a component §4 required, is available again the moment a check says "no
> laid tiles" to a category whose inventory is fourteen of them.
>
> **The word-by-word rule that bounds `negatives` does not reach the body forms, and the difference is
> what a clause can say that a term cannot.** A weighted `frame` suppresses every entry on an EFFECT
> sheet; "the frames overlaid into one composited picture" states a *relation between* them and bans
> only that. So EFFECT may say "frames" here, and the two categories whose usual deliverable is a
> repeating field — TERRAIN and BUILDING — recover the half their negative channels had to give up
> outright, the tiles-already-laid reading, now stated in all three body sections and in none of the
> wrappers.
>
> **BUILDING is the one this nearly missed, and the reason is worth recording.** Its `negatives` hold
> `assembled building` and nothing else, so a first draft wrote all three body forms for that reading
> alone — "the modules fitted together into the assembled building". `TILESET_MODULAR` is this
> category's *default and fallback* mode and its plan is sixteen entries of `kind: 'tile'`, so on the
> sheet a BUILDING subject compiles by default those forms named a component class §4 never
> introduces, and the failure that sheet actually returns — a room or a wall drawn instead of a grid
> of separable tiles — went unnamed in every section. Writing a body form from the negative term is
> the move to distrust: the term is bounded by what a weighted word would suppress, and that bound is
> why the term is narrow.
>
> **Two clauses moved rather than being written**, and both left their old homes in the same commit:
> TERRAIN was the only category whose assembly failure had reached the body at all, in
> `CATEGORY_EXCLUSION_TEXT`'s "any composed landscape, vista or diorama drawn in place of the
> component grid" and `CATEGORY_AUDIT_TEXT`'s "nothing drawn as a landscape view rather than as a
> separate piece". Each sat in the list its replacement now lands in — three bullets from it in §8,
> two checks in §9 — so keeping both would have had §8 excluding one thing twice and §9 checking it
> twice, in two wordings each, far enough apart that neither copy reads as a restatement of the other.
> That is the duplication a per-category record exists to remove.

---

## 8. Defects fixed

**8.1 `|| 'DEFINED'` fallbacks put a content-shaped token in the highest-weighted section.** §1.

**8.2 The camera instruction contradicted itself.** *"one fixed orthographic 3/4 top-down
dimetric/isometric camera at approximately 35° elevation"* names **three mutually exclusive
projections** in one sentence — three-quarter top-down, dimetric and isometric are different
things. A model resolves the ambiguity arbitrarily, which is why consecutive generations disagree
about the angle. Now one named projection, parameterised.

**8.3 The camera was hardcoded** at 35° in an app meant to support various styles. A side-scroller
or pure top-down sheet was not expressible.

**8.4 `FULL_DIRECTIONAL_POSE_LIBRARY` asks for 111 components in one image — removed.** No current
model reliably produces 111 correctly isolated, consistently scaled components in one generation.
It produces a plausible subset and merges or drops the rest, and "verify the count" cannot save it
because models do not reliably count their own output. A mode whose only outcome is a
silently-wrong sheet is worse than no mode, and the project keeps no compatibility obligation, so
it is **deleted rather than deprecated**.

**Treat ~40 components as the practical ceiling** per generation; even 43 is ambitious. The
replacement for anything larger is N single-direction sheets sharing an `IDENTITY_LOCK`, which also
gets more attention per component.

**8.5 Directions were hardcoded to three** while `DIRECTIONAL_MODE` implied they varied.

**8.6 Pure white is a poor background default.** It bleeds into light-coloured edges and makes
alpha-keying ambiguous — white armour on a white field has no recoverable boundary. Magenta
`#FF00FF` is the sprite-sheet convention because it collides with almost nothing. Kept as an
option; changed as the default.

**8.7 Critical constraints were at the bottom.** Background, pixel density and "no text" lived in
§8–9. Attention weighting favours early tokens, and these are the constraints that fail most often.
Now section 0, repeated as a self-audit at the end — the right use of redundancy.

**8.8 Exclusions were scattered across four places.** Consolidated into §8.

**8.9 No consistency mechanism between generations.** `IDENTITY_LOCK` (§5).

**8.10 Nothing identified which component is which.** Labels are correctly banned, but no ordering
rule replaced them, so every extracted cell needed manual identification. Now strict reading order.

**8.11 Pivot registration was underspecified.** "Shared pivots" without saying what makes two
pivots share. §4.

**8.12 Mirroring guidance was absent.** Nothing warned that asymmetric details must not flip.

**8.13 `2×2 native pixels` was a fixed literal** across four resolution profiles. Now derived.

**8.14 No rig support at all** — the template produced pose libraries only. §4.

### Found after shipping, in v2 itself

**R1. "One camera, unchanged for every component … elevation, azimuth … identical across all of
them" was read as *every component faces the same way*.** A `CORE_DIRECTIONAL_VARIANTS` sheet came
back with its front-three-quarter, right-side and back-three-quarter heads all at roughly the same
three-quarter angle, differing only in detail — and torsos and pelvises with them. The sentence
intends a fixed *camera*; a generator can just as well read it as a fixed *subject orientation*, and
it will, because three-quarter views are the ones that show a face. "Primary assembly direction:
front-three-quarter" then reinforces exactly the wrong reading.

The fix is to make the transformation mechanical rather than nominal: **camera azimuth is fixed;
object yaw varies**, the two are named as different quantities, and each required facing is stated
as a numbered object yaw with what that yaw hides — occlusion being the half a flattering
three-quarter view cannot fake. `constants/promptText/rotation.ts` holds the yaw and the presented
surfaces per facing, `utils/directionalRotation.ts` composes section 3's list from whichever facings
the sheet actually covers, and the comparison rules — landmarks, silhouette, no mirroring, no
left/right swap, the directional audit — are emitted only where one sheet carries more than one
facing.

**The three-quarter facings are `45°` and `135°`, not `0°` and `180°`.** `front-three-quarter` is a
turned pose, which is why `DEPTH_ORDER_TEXT` distinguishes a near arm from a far one for it and does
not for `front`. Taking the trio as front/side/back and numbering it `0/90/180` would have asked for
a rotation the set does not describe.

**R2. The two southern diagonals named the wrong near arm.** Facing north your right hand points
east, so facing south-west it points north-west — away from a camera sitting south of the subject,
making the *left* arm the near one. `DEPTH_ORDER_TEXT` had it the other way for `south-west` and
`south-east` (and the other way again for the two northern diagonals, which were right). Harmless
while nothing else stated which side a facing presents; a contradiction inside one prompt the moment
R1's rotation list did.

**R3. §9's verification list skipped a number on the app's most ordinary sheet.** Its last two
checks are conditional and independent — a cut-out-rig check and a pixel-art check, hand-numbered 7
and 8 — so a pixel-art sheet in `POSE_LIBRARY` mode emitted `…6. 8.`, a checklist whose seventh
check appears to have gone missing in the one section meant to be worked through item by item. It is
the same class of error the §3 mirror's own commentary calls out for headings ("a `## 11.` with no 10
above it reads as an authoring error"), reached by the same route: a numeral written down beside a
condition that decides whether its neighbour exists. Fixed at the cause rather than at the two call
sites — see `[N].` in §1, which numbers at render time.

The list is gated on `DELIBERATES`, so the gap reached the five targets sent it and no others. That
bounds the defect; it does not make the fix narrower, because **§0's contract is one conditional item
from the identical failure and every target gets §0**. Numbering by hand was the defect. Doing it by
hand in one fewer place would have been the same defect with better luck.

**R4. §0's category tripwire asked a diffusion model to speak.** "…this specification is malformed.
Say so rather than resolving it" names a text channel, in the highest-weighted section of the
prompt, on seven of the eleven targets that have no such channel. It is the argument `deliberates`
already makes about §9's self-audit, applied to the other capability, and the paragraph is now gated
on `RETURNS_TEXT` for it. Note what the clause actually guards: the category and the inventory are
compiled from a single value, so they can only disagree if *this app* is wrong — which makes it a
report addressed to the maintainer, and worth nothing from a target that cannot file one.

**Gating it caught a second clause on the way out, which is the part worth recording.** §0's
precedence list opened "Where two instructions pull against each other **without contradicting the
category**" — and that qualifier is not a turn of phrase, it is a cross-reference. Both strings
entered the template in the same change (`bd954d2`, "Let a category decide what its own sheet
contains"), whose message says why: "Category and inventory cannot legitimately disagree, so a
disagreement is now named as a malformed specification **rather than ranked**." The carve-out exists
to hand the category case to the tripwire instead of the ranking. Gating one and not the other would
have left seven targets reading an exception for a rule they were never given — and, worse, left §4's
guard ("an error in this specification, not an instruction to follow") unreconciled with a ranking
that puts the inventory *above* subject identity, which is the exact behaviour `bd954d2` was written
to stop. The carve-out now lives inside the gated block, stated outright ("a category disagreement is
a fault to report, never a conflict to rank"), and the shared sentence is unqualified. A test asserts
the two are present together or absent together, so they cannot be separated again.

The general lesson is worth more than the fix: **making a paragraph conditional is not a local edit
if anything else was written against it.** The tripwire read as self-contained, and the sentence that
depended on it sat two paragraphs away with no marker saying so.

**R5. §8's exclusions sat outside the precedence order entirely.** §1 states what the subject has and
§8 states what must be absent, and the two are assembled independently — §8's subject-specific line
is one of the same sixteen free-text fields §1's attributes come from, and the standing bullets above
it are fixed per category. So a worn detail, a material or a silhouette note can be requested by one
and prohibited by the other, and §0's ranking had nothing to say about it: it ordered "subject
identity" against "the render style" and never mentioned a *negative* instruction at all, which
leaves the generator to invent a resolution. Reported by an adherence report on a delivered sheet,
whose §1 named an integrated worn item that a later exclusion in §8 prohibited; the resolution it
warns against is the compromise — the excluded element reinterpreted as an integrated, decorative or
non-separate version, with both instructions counted as honoured. The conflict needs only a positive
attribute and an exclusion naming the same element, so it is a property of the template rather than
of that subject.

**Where the new rule stops is the half worth stating.** Ranking an exclusion above §1 and §2 is
uncontroversial — both describe what a component *shows*, and losing a flourish costs nothing
structural. Letting it reach §4 would be the opposite: the count and inventory head that same
ranking, and §4's placement rule makes grid position the only identity map, so a component quietly
dropped to honour an exclusion mis-maps every component after it. The addition therefore says
outright that an exclusion never deletes an inventory entry — the entry is drawn, and a specification
excluding one of its own components is a contradiction the *sheet* should survive rather than obey.
It is unconditional, unlike R4's tripwire: this one asks for a drawing decision rather than a report,
so a target with no text channel needs it just as much.

**R6. R1's occlusion half is false from directly overhead, and §9 audits for it anyway.** The yaw
list states each facing as a rotation *and* as a claim about what that rotation hides — "the front is
fully presented", "the left side is completely hidden", "no front-facing feature is visible at all" —
and every one of those is true at any elevation below the vertical and of none at it. From 90° the
same top surface faces the camera at every yaw: the views differ by an in-plane rotation and nothing
else. §3 went on promising a front/rear difference the stated camera cannot produce, and §9's
directional audit then failed the sheet for not delivering it, so a generator honouring the camera
failed the audit and one honouring the audit abandoned the camera. `PURE_TOPDOWN` is one click from
the studio's own defaults and writes exactly that elevation, and the earlier note that "the
projection decides how much apparent turn a given yaw produces" covers only the *turn*, never the
occlusion.

So the occlusion prose is now a function of the facing **and** the elevation, which is what R1's flat
`Record<Direction, string>` could not express: `PLAN_FACING_TEXT` states where each yaw points in the
frame and where the subject's own two sides land, the §3 rules and the §9 audit item that speak of
hidden and presented surfaces have plan-view counterparts about in-plane rotation, and §5's depth
order — a near/far question with no near side left to answer it — becomes one line about height above
the ground. The area-flavoured wording went with it: "hides most of what a front view presented" is a
claim about *how much of the image* a surface occupies, which the elevation changes continuously, so
both halves now name the surfaces instead.

**Two controls described one camera, and could disagree outright.** The second half of the same
defect: the projection's own sentence and the elevation are adjacent lines of §3, and the number was
free across 0–90° whatever the projection said, so `Directly overhead. Only the top of forms is
visible` could sit one line above `Camera elevation: 0° above the horizon`. Every projection but the
angled-overhead one *is* a camera geometry, so it now fixes the elevation — an isometric at 40° is
not isometric — and only `THREE_QUARTER_TOPDOWN`, whose description is satisfied by any elevation
strictly between the two extremes, leaves it open. That also makes the vertical reachable from
exactly one projection, which is the projection that names it.

**R7. R5's rule was stated once, at the far end of the document from the list that triggers it.**
The ranking R5 added went into §0, where the precedence order is settled, and a sheet still came back
carrying the excluded item: §1 named a holstered sidearm, §8 said "No weapons", and the model that
drew it reported the pair as a conflict it had *resolved* rather than one the specification had
already decided. So the defect this time is distance, not absence — R5's clause is correct and
unchanged, and §8 now closes by restating it beside the bullets that provoke it.

**Restating a rule is the thing this template is otherwise careful not to do**, so what makes this
one worth its lines is that neither side of the conflict can be computed away. `worn_details` and
`exclusions` are two of the same sixteen free-text fields, so deciding that "No weapons" overrules a
holster but not a pauldron is a judgement about English — and the app composes prompt text and makes
no outbound model call, by design. A pre-resolved subject description is therefore not available at
any price; putting the answer beside the question is. The alternatives are recorded on the issue that
raised it: leave it, mark the overlapping field inside §1 by some conservative test, or surface the
overlap in the studio for the person who wrote both strings. The second was rejected outright — a
test that fired wrongly would drop a requested detail in the section the template calls the sole
authority for the subject's design, which is a worse failure than the one being fixed.

**The copy carries R5's boundary with it, and a draft that did not is the trap worth recording.**
That draft opened the exception with "Components are the exception, because the count ranks first" —
true, and yet every object drawn on the sheet *is* a component, so a reader stopping at the emphasis
had just been told the whole image was exempt from the ban above it. R5's own phrasing is what closes
that: the ranking decides what a component **shows**, not which components exist. The copy also says
"leave the element out **of the image** entirely" rather than "leave it out", because §10's manifest
and §11's adherence report ask for text *beside* the image, and the unqualified form reaches them.
Both are cases of the same thing — a restatement is only as safe as the qualifiers that travelled
with it, and the ones that get dropped are the ones the original stated in a separate sentence.

**R8. §0 forbade the one enlargement pixel art is made of, and never said which of two things a
target component size was.** ChatGPT 5.6 Sol drew an eight-way character sheet from a configuration
stating `16 × 32 px` and reported back that the components were "visually hundreds of delivered
pixels tall" and carried "far more interior detail than a true 16 × 32 sprite could contain", the
image model having "treated `16 × 32` more as stylistic guidance than a measurable constraint". That
was the only reading available to it. §0's fifth item says to render every component directly at the
delivered output resolution and not to upscale a smaller one; §2 then states a component size of
16 × 32 on a sheet the current image models deliver at something over a thousand pixels wide.
Twelve components at 16 × 32 *delivered* pixels there are specks, and twelve legible ones have been
enlarged from a native grid — which that item appeared to forbid in as many words. With nothing
saying which was meant, the size stopped being a constraint and became a mood.

The app had already answered the question at the other end. `utils/targetSizeGrid.ts` reads a
*returned* sheet as a native grid drawn at an integer scale, and the whole `PixelGrid` apparatus in
the Quantise tab exists downstream of that — so the tool that reads the image back assumed exactly
what the prompt that requested it forbade. The fix is to say which, in the prompt. §0's fifth item
now names **resampling** as the thing it forbids and carries a carve-out for a native grid presented
at a whole-number multiple — both inside the gate, so a prompt with no grid is word for word what it
was, and an ungated scoping sentence does not spend twenty tokens on every prompt the app composes
to carve out something that sheet never asked for; §2 gains a block stating that the size *is* that grid, that the
sheet delivers it enlarged by a whole number, and that the enlargement adds no detail; and §9's audit
gains one check on what the finished sheet holds, which is the check the reported sheet walked past.

**The figure is derived, and it is a floor.** `utils/nativeGridScale.ts` finds the largest
whole-number scale at which the sheet still seats every component at that size — the arithmetic
`targetSizeGrid` already performed in the other direction, now shared as `componentGridScale` so the
tab and the prompt cannot disagree about one sheet. It reasons from a *nominal* canvas
(`constants/sheetCanvas.ts`), because a generator decides the delivered pixel dimensions and a prompt
only asks for a shape: the long edge is taken as 1024, under what the current models return at these
ratios, so a figure derived there fits on the sheets that come back larger. SD 1.5 at 512 is the one
named target it does not fit, and that file records why the miss is affordable — its documented
ceiling is the 77-token CLIP context, so the block this figure feeds never reaches it. That is also
why the prompt says "N× or more" rather than pinning the multiple: an exact figure against a canvas
the generator actually has would be reconciled by resampling, the one thing being ruled out.

**Four configurations state nothing at all, and each silence is the decision.** A style that is not
pixel art has no native grid to enlarge, and §0's rule is right there unqualified. A resolution
profile other than `CUSTOM` *is* a scale and states its own figure — the gate `minFeatureSize` and
`smallScaleDiscipline` already apply to this same field, and a second derived figure beside one of
them would be two answers to one question. A size that does not parse leaves nothing to enlarge; the
field is free prose, and a shipped preset holds *"48 × 96 px assembled (2 metres tall at 48 px per
metre)"*. And a component already large enough to fill its share of the canvas comes back as 1,
where the delivered pixels *are* the native ones and §0 needs no help from §2 to say so.

**Found after shipping: §2's pixel discipline named the grid, and the grid was gated away from it.**
Its minimum-feature bullet read "No feature smaller than N × N **native** pixels" on every pixel-art
sheet, while the block above defining a native pixel is gated on `NATIVE_GRID` — a far narrower
condition, since it additionally wants the `CUSTOM` profile, a size that parses and an enlargement of
at least 2. `DEFAULT_OUTPUT_CONFIG` is `PIXEL_ART` on `HIGH_RESOLUTION` with an empty target size, so
the first prompt the app ever showed anybody stated a measurement in a unit the document never
established — and the two guesses available to a generator are far apart: three delivered pixels of a
thousand-pixel image, or three cells of an unstated grid that might be eight times coarser. That is
precisely the floor on interior detail the whole native-grid apparatus exists to make enforceable.

The fix is at the pairing rather than at the bullet. The bullet is **not** gated — every pixel-art
sheet needs a floor on interior detail — so what varies is the *unit*, and it now arrives inside
`[DEFINE:MIN_FEATURE_SIZE]` from the same `nativeGridScale` answer the gate is computed from:
*native pixels* where §2 defines one, *delivered pixels* where it does not. §0's
render-at-the-delivered-resolution rule is what establishes the second, and the native-grid block's
carve-out is the only exception to it — so at 1:1 the two units name the same pixel, which is the
same reasoning that has `nativeGridScale` return `null` there. The template no longer writes a unit
of its own beside the figure, because a template that does is a second place that has to agree with
the gate, and it did not. `promptCompiler.test.ts` now sweeps style × profile × size × aspect ×
category and fails on any prompt naming a native pixel without the block that defines one — a
term-before-definition check that generalises to the next term gated apart from its definition.

**What the wording had to keep true.** `smallScaleDiscipline` deliberately never restates the size,
because the target names a typical whole figure rather than a hard per-component dimension — a hand
drawn beside a torso is in proportion to it, per §0's one-scale rule. The new block says the same:
the grid is what a *whole subject* is drawn on, with every smaller piece in proportion to it on that
same grid. What is uniform across the sheet is the pixel, not the cell.

---

## 9. Kept deliberately

Already right in the current template; the rewrite must not lose them:

- **"Sole authority … do not invent details elsewhere."** Strong anti-embellishment framing.
- **"Materials define visual identity, not rendering complexity."** Well-observed, targeting a real
  failure where "Damascus steel" produces swirling microtexture on a 20-pixel forearm.
- **The microtexture ban list.** Specific and correct; kept verbatim behind the pixel conditional.
- **"Do not target a larger virtual canvas than the delivered image."** Promoted to section 0.
- **"Each inventory entry must produce exactly one visible component."** Precise and checkable.
- **The rigid-segment rule.** The core insight of the template.
- **Per-category field sets** reusing sixteen shared keys — good design, keeps the compiler simple
  while the UI stays domain-appropriate.
- **The numbered-section structure**, with section 0 added and the ordering changed.

---

## 10. Follow-ups beyond the template

**This list is closed.** Four of the five shipped; the fifth was removed rather than built, for a
reason that is architectural rather than a matter of effort. Each entry keeps its original text and
its original number — later documents cite these by number — with what actually happened recorded
underneath it.

1. **Validate that every `[DEFINE:*]` is consumed** at build time; a missed substitution currently
   reaches the model as literal template text.

   *Shipped.* Substitution in `src/utils/templateEngine.ts` throws on a token it has no value for,
   so a missed one cannot reach a model at all, and
   [`src/constants/promptTemplate.test.ts`](../../src/constants/promptTemplate.test.ts) walks the
   template's `_DESCRIPTION` tokens and fails when one has no `_TEXT` map to fill it from.

2. **Cap or split on `COMPONENT_BUDGET`** rather than emitting an unachievable count (§8.4).

   *Shipped, resolved as "report, never cap".* `componentBudget` is a field on `OutputConfig` and
   `ComponentBudgetNotice` says so before the prompt is copied, but nothing in the compiled prompt
   reads it: a sheet quietly trimmed to fit would state a count its own inventory contradicts, which
   is the self-contradiction v2 exists to remove. The *split* half of this item is item 5.

3. **Capture `IDENTITY_LOCK` from an accepted sheet** rather than asking the user to write it — a
   vision model can produce the digest from the approved image.

   *Half shipped; the other half removed rather than built.* §5's digest has two kinds of line, and
   only one of them needs a model.

   The **palette** does not — the colours are simply *in* the pixels. `IdentityPaletteCapture` sits
   under the identity lock in the studio, and takes a sheet two ways: from the Quantise tab, which is
   where the sheet just accepted already is, or from a file dropped or chosen here, for one the tab
   does not hold. Either way its dominant colours are read out, ordered by how much of the subject
   they cover, with the background key excluded, and written into the lock as a `Palette:` segment.
   It replaces an earlier palette rather than accumulating, so re-reading sheet two of eight cannot
   leave two disagreeing lists in a field that says *reproduce exactly*. The route from the tab reads
   the **quantised result** rather than the image dropped into it, and refuses one whose background
   key is still painted on, because the segment is meant to state the colours the reader settled. The
   image is decoded in the tab and never leaves it.

   > The **prose** half is **removed rather than built, as this item framed it.** "Cyan visor across
   > upper face" and "three amber chest lights in a vertical row" need eyes on the image, which means
   > the outbound vision-model call this application deliberately never makes: it composes prompt
   > *text* for the user to paste elsewhere, handles no API key, and has no server to proxy one
   > through. That is an architectural property, not a gap, so it is deleted with the reason stated
   > rather than left on the list implying it is merely unstarted.

   The prose lines are nonetheless **no longer typed from scratch**, by a route this item never
   considered: the studio already holds most of the answer. `IdentitySubjectDigest` sits beside the
   palette capture and restates the subject definition as `Form:`, `Features:` and `Colour:`
   segments, folded through the same labelled-segment mechanism, so what the user wrote survives and
   pressing it again rewrites only its own lines. That is a *starting point* rather than the digest —
   the concrete, countable detail §5 asks for still has to be read off the accepted sheet and edited
   in by hand, which is the part only eyes on the image can supply.

4. **A post-generation quantisation step for pixel-art targets.** Independent of the prompt: models
   return smooth artwork downscaled far more often than true pixel art, however the request is
   phrased. Palette reduction plus grid alignment on the *returned image* is the only reliable
   guarantee. No prompt wording fixes this.

   *Shipped* as the Quantise tab — grid detection, modal-colour alignment, exact downscale and
   variance-minimising palette reduction, entirely in the tab and with nothing uploaded. The plan is
   [done/post-generation-quantisation.md](done/post-generation-quantisation.md).

5. **A sheet-splitter** that takes an N-direction rig request and queues N single-direction runs
   with a shared identity lock, since that is now the expected workflow for anything rigged.

   *Shipped.* `primaryDirection` on `OutputConfig`, the pure `src/utils/sheetRuns.ts`, and a
   `SheetSplitModal` that derives the runs rather than storing them and reads which are done from
   the history, so a batch survives closing the drawer to set the identity lock mid-way.
