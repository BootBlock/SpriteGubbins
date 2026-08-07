# Baseline prompt — revised template

> **Status:** 📘 REFERENCE — shipped. This is the template the compiler now emits, kept for the reasoning behind each rule rather than as open work; the change that landed it is [done/prompt-template-v2-integration.md](done/prompt-template-v2-integration.md).
>
> Two places the implementation departs from the text below, both deliberate and both noted in that document's status log: `TILESET_MODULAR` asks for **14** components, matching the tile list §6 enumerates rather than the "sixteen" its prose states; and `DIRECTIONS` ships without `CUSTOM`, because a free list needs a field to hold it and no shipped preset uses one.

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

Three forms, all flat — no nesting:

| Form | Includes the block when |
| --- | --- |
| `[IF:KEY=A,B]` | `KEY` is `A` or `B` |
| `[IF:KEY!=A,B]` | `KEY` is neither |
| `[IF:KEY]` | `KEY` is set and non-empty *(truthiness; used by `IDENTITY_LOCK`, `SOCKETS`, `EMIT_MANIFEST`)* |

**Use `[IF:KEY]` rather than `[OPTIONAL:…]` whenever the content spans more than one line.**
`[OPTIONAL:…]` is strictly single-line by contract, so a multi-line optional would silently leave
its tail behind when the value is unset — which is a worse failure than the one §1 exists to fix.

---

## 2. Parameters

Everything the application exposes today is retained. **NEW** marks additions.

### Subject — unchanged

The sixteen `SUBJECT_FIELD_KEYS` across all five categories, plus `CATEGORY`. All become
`[OPTIONAL:…]`.

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

| Value | Description emitted | Typical elevation |
| --- | --- | --- |
| `THREE_QUARTER_TOPDOWN` | Angled overhead. Both the top and the front of forms are visible; the vertical screen axis carries both height and depth | 30–45° |
| `PURE_TOPDOWN` | Directly overhead. Only the top of forms is visible | 90° |
| `TRUE_ISOMETRIC` | 2:1 diamond isometric, equal foreshortening on both ground axes | 30° |
| `DIMETRIC_2_1` | Two-axis dimetric with unequal foreshortening | 26.57° |
| `OBLIQUE_45` | Front face undistorted, depth projected at 45° | n/a |
| `ORTHOGRAPHIC_SIDE` | Flat side elevation, no perspective. Platformer convention | 0° |
| `ORTHOGRAPHIC_FRONT` | Flat front elevation, no perspective | 0° |

`CAMERA_ELEVATION` is a number in degrees, defaulting per projection and overridable.

### `DIRECTIONS` — **NEW**

Was hardcoded to three even though `DIRECTIONAL_MODE` implied it varied. An 8-direction set — what
a cut-out rig for a top-down game needs — could not be requested at all.

| Value | Set |
| --- | --- |
| `SINGLE_FRONT` | Front only |
| `THREE_CLASSIC` | Front-three-quarter, right side, back-three-quarter *(the current hardcoded set)* |
| `FOUR_CARDINAL` | South, west, north, east |
| `EIGHT_COMPASS` | S, SW, W, NW, N, NE, E, SE |
| `CUSTOM` | Free list |

### Rigging — **NEW**, see §4

| Parameter | Values |
| --- | --- |
| `RIG_MODE` | `NONE` · `POSE_LIBRARY` · `CUTOUT_RIG` |
| `JOINT_CAP_STYLE` | `ROUNDED` · `SQUARED` · `TAPERED` |
| `OVERLAP_MARGIN` | `NONE` · `HALF_CAP` · `FULL_CAP` |
| `SOCKETS` | list, e.g. `head, chest, back, hand_left, hand_right` |
| `EMIT_MANIFEST` | boolean — request a companion JSON manifest (text targets only) |

### Other — **NEW**

| Parameter | Values | Why |
| --- | --- | --- |
| `BACKGROUND_KEY` | `MAGENTA_FF00FF` · `PURE_WHITE` · `PURE_BLACK` · `TRANSPARENT` | White is a poor extraction default (§8.6) |
| `COMPONENT_BUDGET` | integer | Lets the app cap or split a request beyond what a model can deliver (§8.4) |
| `IDENTITY_LOCK` | free text | Carries an identity digest into follow-up sheets (§5) |
| `SPRITE_TARGET_SIZE` | free text, e.g. `48 × 96 px` | An explicit pixel target, which the profile names only vaguely |

---

## 3. The template

Everything between the rules is the emitted prompt.

---

```
# MODULAR SPRITE-SHEET SPECIFICATION — [DEFINE:CATEGORY]

You are producing a **reference sheet for game-asset extraction**: an exploded grid of isolated,
reusable components that a tool will cut apart and reassemble. It is not an illustration, a scene,
or a character portrait. Every rule below serves extraction.

## 0. NON-NEGOTIABLE OUTPUT CONTRACT

Satisfy this section before any aesthetic consideration.

1. Exactly [DEFINE:COMPONENT_COUNT] components, each visibly separate, none touching or
   overlapping.
2. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION], filling all space between
   components. No gradient, texture, vignette, cast shadow, contact shadow or ground plane.
3. No text, labels, numbers, captions, watermarks, signatures, arrows, callouts, frames, borders
   or grid lines anywhere in the image.
4. One consistent scale across every component: a hand drawn beside a torso is in proportion to it.
5. Render every component directly at the delivered output resolution. Do not compose at a larger
   virtual canvas and downscale, and do not upscale a smaller one.
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
6. One square-pixel grid at one pixel density across the entire sheet. No anti-aliasing on
   silhouette edges, no smooth gradients, no sub-pixel blending, no vector-smooth curves.
[/IF]

---

## 1. SUBJECT DEFINITION

This section is the **sole authority** for the subject's design. Do not invent, infer or embellish
any attribute not stated here.

**An attribute that is absent from this list is yours to decide** — choose the plainest option
consistent with what *is* stated, rather than inventing a distinctive one. Absence is a delegation,
not an omission to be filled dramatically.

- Category: [DEFINE:CATEGORY]
[OPTIONAL:SPECIES             | - Species / Archetype: [DEFINE:SPECIES]]
[OPTIONAL:GENDER              | - Presentation / Form: [DEFINE:GENDER]]
[OPTIONAL:AGE                 | - Age / Vitality: [DEFINE:AGE]]
[OPTIONAL:ROLE                | - Role / Function: [DEFINE:ROLE]]
[OPTIONAL:SETTING             | - Setting / Theme: [DEFINE:SETTING]]
[OPTIONAL:BUILD               | - Build / Proportions: [DEFINE:BUILD]]
[OPTIONAL:SILHOUETTE          | - Silhouette & hard edges: [DEFINE:SILHOUETTE]]
[OPTIONAL:FACE_HEAD           | - Head & sensory features: [DEFINE:FACE_HEAD]]
[OPTIONAL:ANATOMY             | - Anatomy base: [DEFINE:ANATOMY]]
[OPTIONAL:CLOTHING            | - Clothing / armour / harness: [DEFINE:CLOTHING]]
[OPTIONAL:WORN_DETAILS        | - Integrated worn details: [DEFINE:WORN_DETAILS]]
[OPTIONAL:PRIMARY_COLOURS     | - Primary colours (dominant): [DEFINE:PRIMARY_COLOURS]]
[OPTIONAL:ACCENT_COLOURS      | - Accent colours (highlights only): [DEFINE:ACCENT_COLOURS]]
[OPTIONAL:MATERIALS           | - Materials & surface identity: [DEFINE:MATERIALS]]
[OPTIONAL:ADDITIONAL_ANATOMY  | - Additional genuine anatomy: [DEFINE:ADDITIONAL_ANATOMY]]

Clothing, armour, footwear, augmetics and worn details are **painted onto** the anatomical
component they sit on — never separate pieces unless listed under additional anatomy. Do not infer
props, weapons or equipment from the role: if it is not listed above, it does not exist.

Material descriptions define **visual identity, not rendering complexity**. Translate every
material into the simplified shapes and controlled value bands of the selected render style.

[IF:IDENTITY_LOCK]
### Identity lock — match a previous sheet
This sheet depicts the same individual as a previously generated one. Reproduce exactly:
[DEFINE:IDENTITY_LOCK]
Where this conflicts with anything above, the identity lock wins.
[/IF]

---

## 2. RENDER STYLE

- Style: [DEFINE:RENDER_STYLE_DESCRIPTION]
- Surface-detail intensity: [DEFINE:SURFACE_DETAIL_DESCRIPTION]
- Resolution profile: [DEFINE:RESOLUTION_PROFILE_DESCRIPTION]
[OPTIONAL:SPRITE_TARGET_SIZE  | - Target component size: [DEFINE:SPRITE_TARGET_SIZE]]
- Palette strategy: [DEFINE:PALETTE_DESCRIPTION]
- Edge / outline treatment: [DEFINE:OUTLINE_DESCRIPTION]
- Lighting model: [DEFINE:LIGHTING_DESCRIPTION]

[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
### Pixel discipline
- Build every form from deliberate, contiguous pixel clusters placed by intent.
- No feature smaller than [DEFINE:MIN_FEATURE_SIZE] native pixels.
- Diagonals use clean, regular staircase patterns. Equivalent edges on matching components
  (left arm vs right arm) use identical staircase patterns.
- No doubled contours, overlapping outline strokes or irregular edge chatter.
- Do not render materials as microtexture: no scratches, etched strokes, fabric weave, pores,
  grain, crosshatching, repeated reflective streaks, sparkle noise, scattered single-pixel
  highlights or painterly brush marks. Materials read through **colour and value blocking**.
- **Do not produce smooth artwork that has been downscaled.** Every pixel is placed deliberately;
  the image must survive inspection at 1:1 with no anti-aliased edges.
[/IF]
[IF:RENDER_STYLE!=PIXEL_ART,RETRO_PIXEL_ART]
### Surface discipline
- Keep surface treatment consistent across every component; a technique used on one limb is used
  on all of them.
- Detail serves silhouette and material read, not density. Preserve readable component scale
  before preserving surface detail.
[/IF]

---

## 3. PROJECTION AND CAMERA

- Projection: [DEFINE:PROJECTION_DESCRIPTION]
- Camera elevation: [DEFINE:CAMERA_ELEVATION]° above the horizon
- Directions required: [DEFINE:DIRECTIONS_DESCRIPTION]
- Primary assembly direction: [DEFINE:PRIMARY_DIRECTION]

**One camera, unchanged for every component on the sheet.** Elevation, azimuth, projection type,
scale and lighting direction are identical across all of them. A component drawn at a different
angle from its neighbours is a defect, not variety.

---

## 4. COMPONENT INVENTORY

[DEFINE:COMPONENT_BREAKDOWN]

Each entry produces **exactly one** visible component. Do not merge entries, substitute duplicates,
add filler, or omit entries. Do not draw an assembled figure anywhere on the sheet, including as a
reference or key.

### Placement is the only identity map

Labels are forbidden by section 0, so **grid position is how each component is identified**. Lay
the components out in strict reading order — left to right, then top to bottom — in exactly the
order the inventory above lists them. A reordered, merged or omitted entry silently mis-maps every
component after it.

---

[IF:RIG_MODE=CUTOUT_RIG]
## 5. CUT-OUT RIG REQUIREMENTS

These components are bound to a skeleton and rotated independently at runtime. The rig, not the
artwork, supplies all motion.

### Rest orientation
Draw every piece in its **neutral rest orientation**, not posed: limb segments straight and
aligned along their bone axis, hands relaxed, feet flat. Never draw a pre-bent arm or leg — flexion
comes from the rig rotating separate rigid segments.

### Pivot registration
- Each piece's joint end carries a consistent [DEFINE:JOINT_CAP_DESCRIPTION] cap, and **the pivot
  is the centre of that cap**.
- Matching pivots share a diameter: an upper arm's elbow cap matches its lower arm's elbow cap
  exactly, so the two rotate about one point.
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
details stay on the correct side rather than flipping with the mirror — a holstered sidearm does
not swap hips between the left and right leg sets.

[IF:SOCKETS]
### Attachment sockets
Keep these regions clear of fine detail and busy contrast, so equipment can be overlaid later
without fighting what is underneath: [DEFINE:SOCKETS]
[/IF]

### Depth order for this direction
[DEFINE:DEPTH_ORDER_DESCRIPTION]
[/IF]
[IF:RIG_MODE=POSE_LIBRARY]
## 5. RIGID SEGMENTS AND PIVOTS

Every articulated part is a separate **rigid** component. Never draw a pre-bent arm or leg —
flexion comes from assembling separately oriented rigid segments around shared pivots. Matching
pivots share a diameter and cap geometry so segments register when assembled.
[/IF]

---

## 6. REQUIRED ASSEMBLY CAPABILITY

The component set must assemble cleanly into: [DEFINE:ASSEMBLY_POSES]

---

## 7. IDENTITY CONSISTENCY

Every component belongs to the **same single subject**. Hold constant across all of them:
silhouette language and proportion · joint and attachment geometry · clothing and structural
regions · primary colour blocking · large identifying accents · material treatment.

---

## 8. EXCLUSIONS

Absent from the image entirely:

- Backgrounds, environments, ground planes, floor tiles, terrain, sky, props and scenery.
- All shadows: cast, contact, drop, and ambient occlusion onto the background.
- Text, labels, numbers, captions, watermarks, signatures, arrows, callouts, frames, borders,
  grid lines, colour swatches and legends.
- Assembled or posed complete figures.
- Motion blur, speed lines, glow bleeding beyond a component's silhouette, particle effects.
[OPTIONAL:EXCLUSIONS | - Subject-specific: [DEFINE:EXCLUSIONS]]

---

## 9. LAYOUT AND SELF-AUDIT

Arrange components in a clean exploded grid in [DEFINE:ASPECT_DESCRIPTION] format, generously and
uniformly spaced, in the reading order fixed by section 4. Nothing touches, overlaps, or is cropped
by the image edge.

Before delivering, verify:

1. Component count is exactly [DEFINE:COMPONENT_COUNT].
2. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION] with no shadow or texture.
3. No text or labels anywhere.
4. Components appear in the exact order the inventory lists them.
5. One camera and one scale across every component.
[IF:RIG_MODE=CUTOUT_RIG]
6. Every limb segment is straight and unposed, with matching joint caps at shared pivots.
[/IF]
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
7. One pixel grid and density throughout, with no anti-aliased silhouette edges.
[/IF]

[IF:EMIT_MANIFEST]
---

## 10. COMPANION MANIFEST

Alongside the image, output a JSON manifest as text — grid position, part name, bone parent, and
the pivot as a fraction of the component's cell:

{"grid":{"cols":0,"rows":0},"pieces":[{"index":0,"name":"","parent":null,"pivot":[0.5,0.1]}]}

The manifest describes what you actually drew. If a component moved or was omitted, say so there
rather than describing the ideal.
[/IF]

Generate the sheet now.
```

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
| `ANATOMY` | `MODULAR BUILDING TILES` |
| `EXCLUSIONS` | `No characters, no props, no baked lighting, no shadow` |

Inventory for the three-quarter read — a floor, a wall **top**, and a wall **face** are three
distinct tiles, and it is the face that produces the angle:

```
Floor ×4 (one base, three low-frequency variants)
Wall top ×1 · Wall face ×1
Wall top corner: outer-left, outer-right, inner-left, inner-right
Wall face corner: left, right
Floor edge trim ×2
```

Sixteen tiles — comfortably inside one generation.

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

### `DALLE_3` / GPT-image
Prepend a short directive. This family **rewrites prompts before generation**, so terse absolute
phrasing survives better than elaborate structure — which is part of why section 0 sits at the top.

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
text with the image.

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

1. **Validate that every `[DEFINE:*]` is consumed** at build time; a missed substitution currently
   reaches the model as literal template text.
2. **Cap or split on `COMPONENT_BUDGET`** rather than emitting an unachievable count (§8.4).
3. **Capture `IDENTITY_LOCK` from an accepted sheet** rather than asking the user to write it — a
   vision model can produce the digest from the approved image.
4. **A post-generation quantisation step for pixel-art targets.** Independent of the prompt: models
   return smooth artwork downscaled far more often than true pixel art, however the request is
   phrased. Palette reduction plus grid alignment on the *returned image* is the only reliable
   guarantee. No prompt wording fixes this.
5. **A sheet-splitter** that takes an N-direction rig request and queues N single-direction runs
   with a shared identity lock, since that is now the expected workflow for anything rigged.
