import { RENDER_STYLES } from '../../types/rendering.ts';
import type { RenderStyle, ValidationPass } from '../../types/rendering.ts';

/**
 * The two render styles that withhold the sheet's surface rather than describing one, and what each
 * says in its place.
 *
 * Section 2 printed six independent lines — style, surface detail, resolution, colour budget,
 * outline, lighting — and every one was a lookup on its own field. That works for the eight styles
 * that say *how* a surface is drawn. It contradicts the two that say a surface is being **withheld**:
 * a solid single-colour silhouette arrived under a colour budget with a floor of sixteen, beside a
 * surface-detail line asking for "base colour blocking and essential joints", beside an outline line
 * promising that "forms separate by value and hue contrast alone" — on a sheet with one value and one
 * hue. No setting a user could reach made those agree, because the pass and the settings are answers
 * to the same question.
 *
 * The template already owned the mechanism: `[IF:PALETTE!=yes]` drops the colour budget where a
 * pinned palette supersedes it. This is that shape, applied to the other thing that supersedes it.
 *
 * **Both halves of each entry are the pass's own statement of the surface**, which is why the prose
 * has to be emphatic about what is *not* drawn: dropping the four lines leaves a generator free to
 * fall back on its prior for the style name alone, and its prior for "clay render" includes a
 * material read that the pass exists to remove.
 */
const VALIDATION_PASSES: Readonly<Record<RenderStyle, ValidationPass | null>> = {
  PIXEL_ART: null,
  RETRO_PIXEL_ART: null,
  PAINTED_2D: null,
  CEL_SHADED: null,
  VECTOR_FLAT: null,
  HAND_DRAWN_INK: null,
  RENDERED_3D: null,
  LOW_POLY_3D: null,

  CLAY_RENDER: {
    // Lit, and deliberately so: a clay model is read by the way light falls across it, and taking
    // the key light away would leave the one thing this pass is run to judge invisible.
    withholdsLight: false,
    text: [
      '**This render style is a validation pass, and it withholds the surface.** Every component is',
      'one untextured material in one colour throughout — no colour regions, no markings, no texture,',
      'and nothing drawn on a surface that is not a change in the form itself. Nor is there an outline',
      'where a component meets the background: the light stated above is the only thing separating one',
      'form from another, and whether that is enough is what this pass is run to find out.',
      '',
      'Where the subject definition above names a colour, a material or a finish, this pass supersedes',
      'it. Draw the forms those attributes belong to — a plate, a strap and a horn are all shapes — in',
      'the single material above, and none of their colour or surface. Everything else the subject',
      'definition states is unaffected. Do not add colour or texture back to make a form read: a form',
      'that does not read under one material is the finding, not a fault to correct.',
    ].join('\n'),
  },

  SILHOUETTE_ONLY: {
    // Nothing for a key light to land on. Every lighting option this app offers describes how light
    // falls across a surface, and this pass has removed the surface — the flattest of the three still
    // says "even illumination … so a game engine can light the sprite itself".
    withholdsLight: true,
    text: [
      '**This render style is a validation pass, and it withholds everything inside the silhouette.**',
      'Every component is one solid fill of a single colour against the background field — no interior',
      'detail, no markings, no light, no shade, and no outline distinct from the fill itself. What is',
      'being checked is whether each shape is still recognisable at target size on that basis alone.',
      '',
      'Where the subject definition above names a colour, a material or a finish, this pass supersedes',
      'it: a flat fill has none of them. Everything else it states still decides the outline that fill',
      'takes, and is drawn into that outline rather than onto the fill. Do not add detail back to make',
      'a shape read: a shape that does not read as a fill is the finding, not a fault to correct.',
    ].join('\n'),
  },
};

/**
 * The pass this style is, or `null` for the eight styles that describe a finished surface.
 *
 * The single answer to that question in the app. The compiler's two conditionals, the studio
 * controls that withdraw and the digest that reports what is left all ask it here, so a third pass
 * added to the record above reaches every one of them without a second edit — and a test walks
 * `RENDER_STYLES` to prove it does.
 */
export function validationPassFor(style: RenderStyle): ValidationPass | null {
  return VALIDATION_PASSES[style];
}

/**
 * What section 2 carries in place of the lines a validation pass supersedes, and `''` for a style
 * that supersedes nothing.
 *
 * Named for the convention the template and this folder share — a `[DEFINE:FOO_DESCRIPTION]` is
 * filled from `FOO_TEXT` — and *derived* rather than written out, because the same record decides
 * which lines the paragraph is standing in for. Two hand-written records would let a pass drop the
 * outline line and then say nothing about the edge.
 *
 * The cast is sound for the reason `defaultSubjectFor` refuses one: this map is built from
 * `RENDER_STYLES`, which is the array that *defines* the union, so it is complete by construction
 * rather than by assertion.
 */
export const VALIDATION_PASS_TEXT: Readonly<Record<RenderStyle, string>> = Object.fromEntries(
  RENDER_STYLES.map((style) => [style, VALIDATION_PASSES[style]?.text ?? '']),
) as Record<RenderStyle, string>;
