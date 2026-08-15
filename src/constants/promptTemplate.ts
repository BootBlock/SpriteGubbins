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
 * The rig section is conditional and five of the nine categories have no rig at all, so a
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
 * **The adherence report is a third mention of those checks, and it deliberately does not restate
 * them.** It points at the layout section's list instead, because the two are asking for different
 * things from the same checks — that list audits *before* delivery so the sheet can still be fixed,
 * and the report audits what was actually delivered so the *template* can be. Writing the list out
 * again there would be the diluting third copy `utils/modelWrapperText/sol.ts` describes, in the
 * section least able to afford it.
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
[N]. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION], filling all space between
   components. No gradient, texture, vignette, cast shadow, contact shadow or ground plane.
[N]. No text, labels, numbers, captions, watermarks or signatures anywhere in the image, and nothing
   annotating it: no arrows, callouts or grid lines, and no frame or border around the image or
   around a component.
[N]. One consistent scale across every component: [DEFINE:SCALE_EXAMPLE_DESCRIPTION].
[N]. Render every component directly at the delivered output resolution. Do not compose at a larger
   virtual canvas and downscale, and do not upscale a smaller one.
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
above is this sheet's own.** The other sheets are generated separately, each from its own copy of
this specification, and section [SEC:ASSEMBLY] says what each of them carries. Draw this sheet's inventory and
nothing else: never add a component because the set looks incomplete without it, and never drop one
because another sheet carries something like it.
[/IF]
[IF:RETURNS_TEXT]

**The subject's category decides what kind of components this sheet may contain; the inventory in
section [SEC:INVENTORY] then names the exact set within that kind.** These two can never legitimately disagree. If
the inventory below describes components that do not belong to a [DEFINE:CATEGORY] — anatomy on a
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
and inventory · each component's identity and grid position · the object orientation each component
is asked for · the fixed camera, one scale and pivot compatibility · subject identity · the render
style · surface aesthetics. Nothing later overrides anything earlier, so a general aesthetic
preference never overrules a component's stated direction.
[IF:VALIDATION_PASS]

**This sheet's render style is a validation pass, and what it states about the surface outranks the
subject's colour and material attributes.** Section [SEC:STYLE] says what the pass withholds and what
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

This section is the **sole authority** for the subject's design. Do not invent, infer or embellish
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

Every fitted, applied and worn attribute listed above — cladding, armour, harness, markings and
surface detail alike — is **painted onto** the component it sits on, never drawn as a separate piece.
[IF:ADDITIONAL_ANATOMY]
[IF:ANATOMY_PER_VIEW]
**[DEFINE:ADDITIONAL_ANATOMY_LABEL]** is the single exception: section [SEC:INVENTORY] lists each piece named there
separately, drawn at every facing this sheet covers and counted once per view, like the components
beside it.
[/IF]
[IF:ANATOMY_PER_VIEW!=yes]
**[DEFINE:ADDITIONAL_ANATOMY_LABEL]** is the single exception: section [SEC:INVENTORY] lists each piece named there
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
[OPTIONAL:SPRITE_TARGET_SIZE  | - Target component size: [DEFINE:SPRITE_TARGET_SIZE]]
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
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]

### Pixel discipline
- Build every form from deliberate, contiguous pixel clusters placed by intent.
- No feature smaller than [DEFINE:MIN_FEATURE_SIZE] native pixels.
- Diagonals use clean, regular staircase patterns. Equivalent edges on matching components — a
  left-side piece and its right-side counterpart — use identical staircase patterns.
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

### One fixed camera, and components that turn beneath it

**The camera never moves.** Camera position, camera elevation, **camera azimuth**, projection type,
focal characteristics, sprite scale, pixel density and lighting direction are identical for every
component on the sheet. A component drawn through a *different camera* — another elevation,
projection, scale or key-light direction — is a defect.

**A direction is never produced by moving the camera.** It is produced by rotating the *component*
about its own local vertical axis beneath that fixed camera. **Camera azimuth is fixed; object yaw
is what varies.** Those are two different quantities: "one camera" constrains the first and says
nothing about the second, so it never means that every component faces the same way.

### The object yaws this sheet requires

[DEFINE:DIRECTIONAL_ROTATION]
[IF:MULTI_DIRECTION]

### Rotation, not redesign

Each directional set is **one** physical component, turned — not several designs of it. Hold
constant across its views: overall dimensions and proportions · joint, socket and attachment
geometry · colour blocking and material regions · plate, panel and armour arrangement · identifying
markings · the number and placement of every distinctive feature. Only what the turn itself changes
may change. A feature on the component's left rear stays on its left rear: it lands somewhere
else on screen after the turn, and it must never migrate, multiply, vanish or be redrawn to make two
views look different. The variety comes from rotation, not mutation.

### Landmarks are the evidence that it rotated

Every directional component has a **front axis** and a **rear axis** — the ends that would lead and
trail if it moved forward. For this subject: [DEFINE:LANDMARK_DESCRIPTION]

Those landmarks turn with the component. **If a component's front axis still points roughly the same
way on screen in two of its views, that pair has failed** and must be redrawn.

### Silhouette and rotation carry the direction

- Reduced to flat black silhouettes, the views would still be individually identifiable. Direction
  comes from rotated geometry, never from different highlights, markings, glow or rearranged small
  details.
[IF:PLAN_VIEW!=yes]
- Rotation changes what is visible. A side view occludes the far side's features and foreshortens
  what is left of the front. A rear view shows the rear surfaces a front view hid and gives them the
  room the front loses there. **A rear view still presenting the surfaces the front view presented
  is a failed rotation**, not a stylistic choice.
- **A mirrored copy is not a rotation.** Mirroring flips handedness in the image without exposing a
  single surface that turning the component would reveal, so it may never stand in for a turned view.
[IF:MIRROR_PAIRS]
- **This sheet pairs views that are each other's reflection** — [DEFINE:MIRROR_PAIRS_DESCRIPTION] —
  which is exactly where a mirrored copy is most tempting to substitute. The members of a pair are
  opposite turns of one object: a feature the subject carries on one side only sits at full
  prominence in the member that turns that side towards the camera, and the other member keeps at
  most what its own yaw above leaves visible of it — never the feature at full prominence, flipped.
  Two views identical up to reflection are one view delivered twice, not two views.
[/IF]
[/IF]
[IF:PLAN_VIEW]
- **This camera is directly overhead, so a turn hides nothing and reveals nothing.** Every view shows
  the same top surface, and the direction is carried by where that surface points: the component
  turns within the image plane, and its front and rear ends, its two flanks and every asymmetry it
  carries turn with it. **A view whose top surface points the way another's does is a failed
  rotation**, not a stylistic choice.
- **A mirrored copy is not a rotation.** Flipping a view does point its front axis where some other
  yaw would have pointed it, which is what makes the substitution tempting — but it turns nothing.
  The subject's own left and right come out swapped, so what it produces is a left-handed copy of a
  view this sheet already holds rather than a view of its own.
[IF:MIRROR_PAIRS]
- **This sheet pairs views that are each other's reflection** — [DEFINE:MIRROR_PAIRS_DESCRIPTION] —
  which is exactly where a mirrored copy is most tempting to substitute, and from directly overhead
  nothing else in the image contradicts one. The members of a pair are opposite turns of one object,
  so a feature the subject carries on one side only stays on that side of its own body in both —
  which puts it above the middle of the frame in one member and below it in the other. Flipping one
  to make the other leaves it on the same side of that line, on the subject's wrong side.
[/IF]
[/IF]
- **Rotation never swaps the subject's own left and right.** Every view is this same subject turned
  through the yaw stated above, so an asymmetric feature stays on the side of the subject it belongs
  to at every one of them; a view that moved one across is a different subject, not a different
  angle.

Each of these is the easy way out of the rules above, and each is a defect: two views of one
component facing effectively the same way · a "side" view that is the three-quarter view with
altered details · a rear view that is the front view with its details moved · a view produced by
mirroring another · a view produced by moving the camera · direction signalled by changing details
while the orientation stays put.

### What "primary assembly direction" means

It is the direction for every component the inventory does **not** give a direction of its own, and
the direction the assembled pose faces. It is not a house style for the sheet. **Wherever section [SEC:INVENTORY]
names a direction for a component, that direction wins outright** — never pull a directional
component back towards the primary assembly direction because the rest of the sheet uses it.
[/IF]

---

## [SECTION:INVENTORY]. COMPONENT INVENTORY

[DEFINE:CATEGORY_GUARD]

[DEFINE:COMPONENT_BREAKDOWN]

Draw every entry in full, and one separate visible component for each item it names — an entry
marked **×N** names N of them, an entry naming or referring to several facings names one drawing at
each, and an entry carrying both names N separate components at each of those facings. Do not merge
entries, substitute duplicates, add filler, or omit entries. Do not draw an assembled figure
anywhere on the sheet, including as a reference or key.

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

Labels are forbidden by section [SEC:CONTRACT], so **grid position is how each component is identified**. Lay
the components out in strict reading order — left to right, then top to bottom — in exactly the
order the inventory above lists them. A reordered, merged or omitted entry silently mis-maps every
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
- Each piece's joint end carries a consistent [DEFINE:JOINT_CAP_DESCRIPTION] cap, and **the pivot
  is the centre of that cap**.
- Matching pivots share a diameter: the cap on one segment's joint end matches the cap on the
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

**That is the finished series' capability, and not this sheet's alone.** It is reached once every
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
[IF:IDENTITY_LOCK]
The identity lock in section [SEC:SUBJECT] is the record of what the other sheets actually drew, which is why it
wins wherever it and the subject definition above it disagree.
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
- Text, labels, numbers, captions, watermarks, signatures and legends; and anything annotating the
  sheet: arrows, callouts, colour swatches, grid lines, and frames or borders around the image or
  around a component.
- Assembled or posed complete figures.
- Motion blur, speed lines, glow bleeding beyond a component's silhouette, and any particle
  effect the inventory in section [SEC:INVENTORY] does not name.
[OPTIONAL:EXCLUSIONS | - Subject-specific: [DEFINE:EXCLUSIONS]]

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
[N]. No text or labels anywhere.
[N]. Components appear in the exact order the inventory lists them.
[N]. Every component stops at its own joins — no entry arrives with a neighbouring piece attached,
   and nothing on the sheet is an assembled or part-assembled figure.
[N]. One camera, one scale and one light direction across every component — nothing on the sheet was
   drawn through a camera that moved.
[N]. [DEFINE:CATEGORY_AUDIT]
[IF:RIG_MODE=CUTOUT_RIG]
[N]. Every articulated segment is straight and unposed, with matching joint caps at shared pivots.
[/IF]
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
[N]. One pixel grid and density throughout, with no anti-aliased silhouette edges.
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
  the subject carries on one side only lands wherever that member's own yaw in section [SEC:CAMERA] puts
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
[IF:EMIT_MANIFEST]

---

## [SECTION:MANIFEST]. COMPANION MANIFEST

Alongside the image, output a JSON manifest as text — grid position, part name, bone parent, and
the pivot as a fraction of the component's cell:

{"grid":{"cols":0,"rows":0},"pieces":[{"index":0,"name":"","parent":null,"pivot":[0.5,0.1]}]}

The manifest describes what you actually drew. If a component moved or was omitted, say so there
rather than describing the ideal.
[/IF]
[IF:EMIT_PROMPT_FEEDBACK]

---

## [SECTION:REPORT]. ADHERENCE REPORT

After the sheet is delivered, and as text beside it, report on what you actually produced. Nothing
in this section changes the image — write the report from the delivered pixels, never from the plan
you drew them to.

### The audit

Section [SEC:LAYOUT] still stands: fix what you can before delivering. This report is about the sheet you did
deliver, so work section [SEC:LAYOUT]'s checks — and its directional audit, where the sheet has one — once more
against the finished image, and state for each whether it holds. Where one does not, say what the
image contains instead, concretely: "three of the five directional views at roughly the same yaw"
rather than "directional coverage could be improved". A check you cannot settle by looking at the
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

- **Write about the instruction, not the artwork.** "Redraw the third component's rear view" cannot
  be acted on there. "Section [SEC:CONTRACT] fixes the component count but never says a component may not
  arrive with a neighbouring piece still attached, so two entries merged into one satisfy it" can.
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

Generate the sheet now.
[IF:EMIT_PROMPT_FEEDBACK]

Then write the adherence report — after the image has been delivered, never in place of it.
[/IF]`;
