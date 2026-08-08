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
 * **Neither of those two lists writes its own numerals**, because both are assembled conditionally
 * and a hand-numbered list cannot survive that: section 9's rig and pixel-art checks appear
 * independently, so numbering them 7 and 8 emitted `…6. 8.` on a pixel-art sheet without a cut-out
 * rig — on the targets that see that list at all, since the whole of it sits behind
 * `[IF:DELIBERATES]`. `[N].` is numbered at render time by `applyNumbering`, so an item that is
 * dropped takes its number with it.
 *
 * **The adherence report is a third mention of those checks, and it deliberately does not restate
 * them.** It points at section 9's list instead, because the two are asking for different things
 * from the same checks — section 9 audits *before* delivery so the sheet can still be fixed, and the
 * report audits what was actually delivered so the *template* can be. Writing the list out again
 * there would be the diluting third copy `utils/modelWrapperText.ts` describes, in the section least
 * able to afford it.
 *
 * The report's own number is written twice — 11 behind the manifest, 10 without it — the same way
 * section 9's heading already varies by target. Both of the sections it can follow are numbered
 * fixed; only the last one can be preceded by a section that isn't there. A "## 11." with no 10
 * above it reads as an authoring error, and a reader who cannot trust the numbering cannot follow a
 * cross-reference either — which matters here, because the report's whole job is to cite sections
 * back.
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

## 0. NON-NEGOTIABLE OUTPUT CONTRACT

Satisfy this section before any aesthetic consideration.

[N]. Exactly [DEFINE:COMPONENT_COUNT] components, each visibly separate, none touching or
   overlapping.
[N]. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION], filling all space between
   components. No gradient, texture, vignette, cast shadow, contact shadow or ground plane.
[N]. No text, labels, numbers, captions, watermarks, signatures, arrows, callouts, frames, borders
   or grid lines anywhere in the image.
[N]. One consistent scale across every component: a hand drawn beside a torso is in proportion to it.
[N]. Render every component directly at the delivered output resolution. Do not compose at a larger
   virtual canvas and downscale, and do not upscale a smaller one.
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
[N]. One square-pixel grid at one pixel density across the entire sheet. No anti-aliasing on
   silhouette edges, no smooth gradients, no sub-pixel blending, no vector-smooth curves.
[/IF]
[IF:RETURNS_TEXT]

**The subject's category decides what kind of components this sheet may contain; the inventory in
section 4 then names the exact set within that kind.** These two can never legitimately disagree. If
the inventory below describes components that do not belong to a [DEFINE:CATEGORY] — anatomy on a
building, floor tiles on a character — this specification is malformed. Say so rather than resolving
it: drawing what the inventory asks for is how a sheet ends up being the wrong subject entirely.
**That settles before the precedence order below is reached** — a category disagreement is a fault
to report, never a conflict to rank.
[/IF]
[IF:MULTI_DIRECTION]

**A component the inventory lists in more than one direction is one component, drawn once per
direction.** Each of those drawings is that same geometry turned to the object yaw section 3 gives
it — never one view repeated, never a mirrored copy, never the same view with its details moved.
Section 3 states how far each turn goes and what it must reveal; this is the contract that the turns
happen at all, and it is the clause a directional sheet misses most often.
[/IF]

**Where two instructions pull against each other**, satisfy them in this order: the component count
and inventory · each component's identity and grid position · the object orientation each component
is asked for · the fixed camera, one scale and pivot compatibility · subject identity · the render
style · surface aesthetics. Nothing later overrides anything earlier, so a general aesthetic
preference never overrules a component's stated direction.

**An exclusion in section 8 outranks every attribute that asks for the same visible element.**
Where the subject definition, the render style or any other description names something section 8
excludes, leave that element out of the image entirely — never satisfy both by drawing a reduced,
integrated or decorative version of it. That decides what a component *shows*, not which components
exist: where section 4 lists an entry section 8 excludes, draw the entry, because the count and
inventory rank first and an omitted one mis-maps every component after it.

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
component they sit on, never drawn as separate pieces. Additional genuine anatomy is the single
exception: section 4 lists each named piece separately and counts it there. Do not infer props,
weapons or equipment from the role: if it is not listed above, it does not exist.

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

## 3. PROJECTION, CAMERA AND OBJECT ORIENTATION

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
markings · the number and placement of every distinctive feature. Only what the rotation reveals or
hides may change. A feature on the component's left rear stays on its left rear: it lands somewhere
else on screen after the turn, and it must never migrate, multiply, vanish or be redrawn to make two
views look different. The variety comes from rotation, not mutation.

### Landmarks are the evidence that it rotated

Every directional component has a **front axis** and a **rear axis** — the ends that would lead and
trail if it moved forward. For this subject: [DEFINE:LANDMARK_DESCRIPTION]

Those landmarks turn with the component. **If a component's front axis still points roughly the same
way on screen in two of its views, that pair has failed** and must be redrawn.

### Silhouette and occlusion carry the direction

- Reduced to flat black silhouettes, the views would still be individually identifiable. Direction
  comes from rotated geometry, never from different highlights, markings, glow or rearranged small
  details.
- Rotation changes what is visible. A side view occludes the far side's features and foreshortens
  what is left of the front. A rear view hides most of what a front view presented and gives the
  rear surfaces the room they lose there. **A rear view showing as much of the front as the front
  view does is a failed rotation**, not a stylistic choice.
- **A mirrored copy is not a rotation.** Mirroring flips handedness in the image without exposing a
  single surface that turning the component would reveal, so it may never stand in for a turned view.
- **Rotation never swaps anatomical left and right.** A right-side view is this same subject turned
  until its right side faces the camera; asymmetric features stay on the side of the subject they
  belong to at every yaw.

Each of these is the easy way out of the rules above, and each is a defect: two views of one
component facing effectively the same way · a "side" view that is the three-quarter view with
altered details · a rear view still presenting its face or front · a view produced by mirroring
another · a view produced by moving the camera · direction signalled by changing details while the
orientation stays put.

### What "primary assembly direction" means

It is the direction for every component the inventory does **not** give a direction of its own, and
the direction the assembled pose faces. It is not a house style for the sheet. **Wherever section 4
names a direction for a component, that direction wins outright** — never pull a directional
component back towards the primary assembly direction because the rest of the sheet uses it.
[/IF]

---

## 4. COMPONENT INVENTORY

[DEFINE:CATEGORY_GUARD]

[DEFINE:COMPONENT_BREAKDOWN]

Draw every entry in full, and one separate visible component for each item it names — an entry
marked **×N** names N of them. Do not merge entries, substitute duplicates, add filler, or omit
entries. Do not draw an assembled figure anywhere on the sheet, including as a reference or key.

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
not swap hips between the left and right leg sets. **This is the only mirroring the sheet permits:**
a left piece and a right piece are two different parts, whereas a direction is a rotation, and
section 3 forbids producing one by mirroring another.
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

## 5. RIGID SEGMENTS AND PIVOTS

Every articulated part is a separate **rigid** component. Never draw a pre-bent arm or leg —
flexion comes from assembling separately oriented rigid segments around shared pivots. Matching
pivots share a diameter and cap geometry so segments register when assembled.

---
[/IF]

## 6. REQUIRED ASSEMBLY CAPABILITY

The component set must assemble cleanly into: [DEFINE:ASSEMBLY_POSES]

---

## 7. IDENTITY CONSISTENCY

Every component belongs to the **same single subject**. Hold constant across all of them:
silhouette language and proportion · joint and attachment geometry · clothing and structural
regions · primary colour blocking · large identifying accents · material treatment.

Where a component appears at more than one object yaw, it is one persistent three-dimensional form
seen after a turn — every feature stays attached to the same physical region of it, as section 3
requires.

---

## 8. EXCLUSIONS

Absent from the image entirely:

- [DEFINE:CATEGORY_EXCLUSIONS]
- All shadows: cast, contact, drop, and ambient occlusion onto the background.
- Text, labels, numbers, captions, watermarks, signatures, arrows, callouts, frames, borders,
  grid lines, colour swatches and legends.
- Assembled or posed complete figures.
- Motion blur, speed lines, glow bleeding beyond a component's silhouette, particle effects.
[OPTIONAL:EXCLUSIONS | - Subject-specific: [DEFINE:EXCLUSIONS]]

---

[IF:DELIBERATES]
## 9. LAYOUT AND SELF-AUDIT
[/IF]
[IF:DELIBERATES!=yes]
## 9. LAYOUT
[/IF]

Arrange components in a clean exploded grid in [DEFINE:ASPECT_DESCRIPTION] format, generously and
uniformly spaced, in the reading order fixed by section 4. Nothing touches, overlaps, or is cropped
by the image edge.
[IF:DELIBERATES]

Before delivering, verify:

[N]. Component count is exactly [DEFINE:COMPONENT_COUNT].
[N]. Background is uniform [DEFINE:BACKGROUND_KEY_DESCRIPTION] with no shadow or texture.
[N]. No text or labels anywhere.
[N]. Components appear in the exact order the inventory lists them.
[N]. One camera, one scale and one light direction across every component — nothing on the sheet was
   drawn through a camera that moved.
[N]. [DEFINE:CATEGORY_AUDIT]
[IF:RIG_MODE=CUTOUT_RIG]
[N]. Every limb segment is straight and unposed, with matching joint caps at shared pivots.
[/IF]
[IF:RENDER_STYLE=PIXEL_ART,RETRO_PIXEL_ART]
[N]. One pixel grid and density throughout, with no anti-aliased silhouette edges.
[/IF]
[IF:MULTI_DIRECTION]

### Directional audit

Then, for every component the inventory asks for in more than one direction, trace its front axis in
each of its views and confirm:

- The front axis points a visibly different way in each view.
- The side view reads as a side, not as a second three-quarter view.
- The rear view hides most of what the front view presented, and shows rear surfaces in its place.
- Every view is the same geometry at the same scale through the same unmoved camera, differing by
  rotation rather than by redesign.

If two views of one component still face effectively the same way, **the sheet has failed**. Redraw
that component at the object yaw section 3 gives it rather than delivering the sheet.
[/IF]
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
[IF:EMIT_PROMPT_FEEDBACK]

---
[IF:EMIT_MANIFEST]

## 11. ADHERENCE REPORT
[/IF]
[IF:EMIT_MANIFEST!=yes]

## 10. ADHERENCE REPORT
[/IF]

After the sheet is delivered, and as text beside it, report on what you actually produced. Nothing
in this section changes the image — write the report from the delivered pixels, never from the plan
you drew them to.

### The audit

Section 9 still stands: fix what you can before delivering. This report is about the sheet you did
deliver, so work section 9's checks — and its directional audit, where the sheet has one — once more
against the finished image, and state for each whether it holds. Where one does not, say what the
image contains instead, concretely: "three heads, all at roughly the same yaw" rather than
"directional coverage could be improved". A check you cannot settle by looking at the image is
reported as unverified rather than as passed.

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

- **Write about the instruction, not the artwork.** "Redraw the rear torso" cannot be acted on
  there. "Section 3 fixes the yaw but never states that a rear view must hide the face, so a second
  three-quarter view satisfies it" can.
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
