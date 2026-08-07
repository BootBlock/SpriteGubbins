import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { wrapForModel } from './modelWrappers.ts';
import {
  ASPECT_TEXT,
  COMPONENT_BREAKDOWNS,
  LIGHTING_TEXT,
  OUTLINE_TEXT,
  PALETTE_TEXT,
  componentCountText,
} from './promptSections.ts';

/**
 * Compile the studio's state into the prompt the user copies.
 *
 * A pure function of its three arguments: the same state always produces the same text, which is
 * what lets the preview derive it during render (with `useMemo`) instead of mirroring it into
 * state through an effect — the anti-pattern the specification bans first.
 *
 * `|| 'DEFINED'` on the subject fields is not defensive noise. A field the user has cleared
 * should read as "the generator must decide this", not as an empty backtick pair that looks like
 * an authoring mistake in the middle of a specification.
 */
export function generatePrompt(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): string {
  const componentCount = componentCountText(output.directionalMode, subject.additional_anatomy);
  const breakdown = COMPONENT_BREAKDOWNS[output.directionalMode];
  const paletteText = PALETTE_TEXT[output.paletteLimit];
  const outlineText = OUTLINE_TEXT[output.outlineStyle];
  const lightingText = LIGHTING_TEXT[output.lightingModel];
  const aspectText = ASPECT_TEXT[output.aspectRatio];

  const prompt = `# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (${category})

## 1. SUBJECT DEFINITION — EDIT THIS SECTION

This is the sole authority for the subject's design. Do not invent details elsewhere.

- Category / Type: \`${category}\`
- Species / Archetype: \`${subject.species || 'DEFINED'}\`
- Gender / Presentation / State: \`${subject.gender || 'DEFINED'}\`
- Age / Vitality Presentation: \`${subject.age || 'DEFINED'}\`
- Role / Class / Function: \`${subject.role || 'DEFINED'}\`
- Setting / Theme: \`${subject.setting || 'DEFINED'}\`
- Build / Proportions / Scale: \`${subject.build || 'DEFINED'}\`
- Overall Silhouette & Hard Edges: \`${subject.silhouette || 'DEFINED'}\`
- Face, Head & Sensory Features: \`${subject.face_head || 'DEFINED'}\`
- Anatomy Base: \`${subject.anatomy || 'STANDARD'}\`
- Clothing / Armour / Harness: \`${subject.clothing || 'DEFINED'}\`
- Integrated Worn Details / Markings: \`${subject.worn_details || 'NONE'}\`
- Primary Colours: \`${subject.primary_colours || 'DEFINED'}\`
- Accent Colours: \`${subject.accent_colours || 'NONE'}\`
- Materials & Surface Identity: \`${subject.materials || 'DEFINED'}\`
- Explicit Exclusions: \`${subject.exclusions || 'NONE'}\`
- Additional Genuine Anatomy: \`${subject.additional_anatomy || 'NONE'}\`

Clothing, armour, footwear, cybernetics, and worn details must remain integrated into the appropriate anatomical components unless explicitly defined as separate anatomy. Do not infer props or equipment from the role/class.

Material and surface descriptions define the visual identity, not the permitted rendering complexity. Translate all materials into simplified pixel-art shapes and controlled value bands.

Do not represent materials using microtexture, scratches, etched strokes, fabric weave, pores, grain, crosshatching, repeated reflective streaks, sparkle noise, scattered single-pixel highlights, or painterly brush marks unless explicitly required by the selected rendering profile.

---

## 2. OUTPUT CONFIGURATION — EDIT TECHNICAL VALUES ONLY

### Directional coverage
- Selected mode: \`${output.directionalMode}\`
- Required directions: \`FRONT_THREE_QUARTER\`, \`RIGHT_SIDE\`, \`BACK_THREE_QUARTER\`
- Primary assembly direction: \`FRONT_THREE_QUARTER\`

### Surface-detail intensity
- Selected profile: \`${output.surfaceDetail}\`

### Resolution & Palette
- Selected profile: \`${output.resolutionProfile}\`
- Palette Strategy: \`${paletteText}\`
- Outline Contour Style: \`${outlineText}\`
- Lighting Model: \`${lightingText}\`
- Sheet Aspect Ratio: \`${aspectText}\`

Create every component directly at the generator's actual final output resolution. Do not describe, simulate, or internally target a larger virtual canvas than the delivered image.

Use one square-pixel grid and one consistent pixel density across the sheet. Preserve readable component scale before preserving surface detail.

---

## 3. OBJECTIVE

Generate one image containing an exploded, production-ready modular pose library. Every component must be isolated, reusable, consistently scaled, and compatible with adjoining components.

The active \`${output.directionalMode}\` configuration requires exactly \`${componentCount}\`:

${breakdown}

Each inventory entry must produce exactly one visible component. Do not merge entries, substitute duplicates, add filler, or omit components.

---

## 4. DIRECTION, CAMERA, AND PROJECTION

Use one fixed orthographic 3/4 top-down dimetric/isometric camera at approximately \`35°\` elevation.
Keep camera elevation, azimuth, projection, scale, and lighting unchanged for every component.

Pixel-projection rules:
- Use clean, deliberate staircase patterns for diagonal silhouettes.
- Keep equivalent diagonal edges consistent across matching components.
- Do not use doubled contours, overlapping outline strokes, or irregular edge chatter.

---

## 5. RIGID SEGMENT AND PIVOT RULES

Every limb or articulated part is a separate rigid component. Never draw a connected bent arm or leg.
Flexion must result only from assembling separately oriented rigid segments around shared pivots.

---

## 6. REQUIRED POSE CAPABILITY

The primary-direction library must assemble cleanly into:
- Neutral standing pose.
- Relaxed stance.
- Forward reach / action pose.
- Walking stride sequence with opposing limbs.
- Running stride with elbow and knee flexion.
- Shallow and deep crouch.

---

## 7. DESIGN CONSISTENCY

All variants must represent the exact same subject identity.
Preserve across poses and directions:
1. Silhouette and anatomy.
2. Joint and attachment geometry.
3. Major clothing or structural regions.
4. Primary colour blocking.
5. Large identifying accents.

---

## 8. CLEAN PIXEL ART, LIGHTING, AND BACKGROUND

- Construct every form from deliberate, contiguous native pixel clusters.
- Avoid details smaller than approximately \`2×2 native pixels\`.
- Render using \`${lightingText}\`.
- Apply outline system: \`${outlineText}\`.
- Solid pure-white \`#FFFFFF\` background only. No floor shadows, vignettes, or text labels.

---

## 9. SHEET LAYOUT & FINAL AUDIT

Arrange all parts in a clean exploded grid with generous white space in a \`${aspectText}\` format. No components may touch or overlap. Verify component count matches the \`${componentCount}\` requirement before completion.

---

## EXECUTION
Generate the complete modular sprite-component sheet now using the Subject Definition and selected Output Configuration exactly as written.`;

  return wrapForModel(prompt, output.targetModel, {
    componentCount,
    aspectRatio: output.aspectRatio,
  });
}

/** Words in the compiled prompt, as the preview counts them. */
export function countWords(prompt: string): number {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * A rough token estimate at the usual ~4-characters-per-token heuristic. Deliberately labelled
 * as an estimate in the UI — no tokeniser ships with the app, and the real count depends on
 * which model reads it.
 */
export function estimateTokens(prompt: string): number {
  return Math.round(prompt.length / 4);
}
