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
 * Taken from `docs/todo/baseline-prompt-new.md` §3.
 */
export const PROMPT_TEMPLATE = `# MODULAR SPRITE-SHEET SPECIFICATION — [DEFINE:CATEGORY]

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
[/IF]
[IF:SOCKETS]

### Attachment sockets
Keep these regions clear of fine detail and busy contrast, so equipment can be overlaid later
without fighting what is underneath: [DEFINE:SOCKETS]
[/IF]
[IF:RIG_MODE=CUTOUT_RIG]

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

Generate the sheet now.`;
