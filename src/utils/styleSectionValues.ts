import {
  backdropDescription,
  describeDisplayReduction,
  lightingDescription,
  minFeatureSize,
  outlineDescription,
  PALETTE_TEXT,
  RENDER_STYLE_TEXT,
  resolutionProfileDescription,
  smallScaleDiscipline,
  surfaceDetailDescription,
  VALIDATION_PASS_TEXT,
} from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import type { SheetFacts } from './promptFacts.ts';

/**
 * The tokens section 2, RENDER STYLE, is filled from — every line it states about how the sheet is drawn,
 * at what size, and how far it is reduced to be shown.
 *
 * **Its own module because the section is one concern** and `promptValues` had reached the module-size
 * target holding it. Each line here reads the same few facts — the style's settings, the sizing, the
 * plan — and several read each other's answers: the display floor names the outline only where the
 * outline line states one, and both the floor and the pixel-discipline minimum count in the unit the
 * native grid decides. Kept together, those pairings are visible in one place.
 *
 * Every value is the app's own prose, so `promptValues` spreads this record into the half it cites over.
 */
export function styleSectionValues(
  category: SubjectCategory,
  output: OutputConfig,
  facts: SheetFacts,
): Record<string, string> {
  const {
    plan,
    palette,
    keyColor,
    styleSettings,
    rig,
    sizing: { profile, stated, component, nativeScale, display },
    interiorDetail,
  } = facts;

  // The edge treatment section 2 prints, read once: the outline line and the display floor's outline
  // clause both answer from it, so the floor never names an outline the line above it withholds.
  const outline = outlineDescription(output.renderStyle, styleSettings.outline, keyColor);
  const outlined =
    facts.validationPass === null && outline !== '' && styleSettings.outline !== 'OUTLINE_LESS_ALBEDO';

  return {
    RENDER_STYLE_DESCRIPTION: RENDER_STYLE_TEXT[output.renderStyle],
    // Worded for the style, and for whether the sheet has a colour limit to stay inside: `TEXTURED`
    // said "still inside the palette limit" beside "no colour budget to hold to", and asked a pixel
    // sheet for the surface texturing its own pixel discipline forbids. See `surfaceDetailDescription`.
    SURFACE_DETAIL_DESCRIPTION: surfaceDetailDescription(output, styleSettings, palette !== null),
    // Takes the same answer the target-size line does, because the two are printed one after the
    // other and `CUSTOM` is the profile that defers to that line. Left as the flat lookup, it told
    // the generator to work to a component size where one is stated, directly above a line stating a
    // size and saying no component is it.
    //
    // **Keyed on the field, not on the sheet**, unlike the gate below. The assembled wording points
    // at a size "stated below", and on a rig sheet with the box empty there is no line below — so
    // the sheet's answer would leave the prompt pointing at nothing. The base wording covers that
    // case as it always did, by saying *where one is stated*.
    //
    // The sheet's scale unit is the third argument for the reason section 0's scale example is the
    // sheet's: the profile that states a height states it of something, that something was a figure
    // on the nine categories whose sheets hold none, and a category key named a parallax band on the
    // BACKGROUND sheet that draws no band. See `SheetPlan.scaleUnit`.
    //
    // The fit is the fourth. Both share rungs are a share of a cell on every sheet, because a share of
    // the sheet height was decided by the component count or by the layout on every plan that carried
    // one — see `SHARE_RANGE` — and the fit says what occupies it: the largest component, or the one
    // square an icon sheet draws every icon to (audit finding P10).
    RESOLUTION_PROFILE_DESCRIPTION: resolutionProfileDescription(
      profile,
      stated?.quantity === 'ASSEMBLED',
      plan.scaleUnit,
      plan.fit,
    ),
    // A function of the target size as well as the profile, because `CUSTOM` is the one profile
    // that carries no scale of its own — see `minFeatureSize`. It carries its own unit, from the
    // same `nativeScale` answer `NATIVE_GRID` is: the figure counts native pixels only where the
    // block defining a native pixel is emitted, and delivered pixels everywhere else. The bullet
    // stated *native* unconditionally for as long as the two were separate, so every pixel-art
    // prompt on a stock profile — the default among them — measured against a unit it never
    // defined.
    MIN_FEATURE_SIZE: minFeatureSize(profile, stated, nativeScale !== null, rig),
    // Sprite-scale bullets join the pixel discipline only when the stated component, or the smallest
    // size it is displayed at, is small enough that silhouette carries the identity; `''` is what drops
    // the optional line.
    SMALL_SCALE_DISCIPLINE: smallScaleDiscipline(component, display),
    // How far each component is reduced to reach its smallest display size, and the narrowest stroke and
    // outline that survive it — `''` where the subject states no display size or no reduction, which
    // drops the line (audit finding P6). The unit is the pixel-discipline floor's, from the same
    // `nativeScale` answer.
    DISPLAY_REDUCTION:
      display === null ? '' : describeDisplayReduction(display, nativeScale !== null, outlined),
    // The field section 2's surface-detail level defers to, by section 1's own label (audit finding P11).
    // `[IF:INTERIOR_DETAIL_STATED]` decides whether it is read.
    INTERIOR_DETAIL_FIELD: interiorDetail?.label ?? '',
    // Emitted only where no palette is pinned, since a pinned one supersedes the budget outright —
    // the value is still supplied because `substitute` throws on a token it has no value for, and
    // the template's own `[IF:PALETTE!=yes]` is what decides whether the line survives to be filled.
    //
    // The budget, the outline and the lighting are the ones the render style lets the sheet be drawn
    // with — `styleSettings` — and each line is worded in the style's own terms, so a painted sheet's
    // key light casts graded shadow and a cel sheet's outline colours the ink contour its style line
    // names (issue #406). `''` where the style withdraws the line, which the template has already
    // dropped by then.
    PALETTE_DESCRIPTION: PALETTE_TEXT[styleSettings.paletteLimit],
    // A function of the key as well as the style, because section 0 reserves the key colour and a
    // pure black contour on a pure black field would be the one line in section 2 asking for it.
    OUTLINE_DESCRIPTION: outline,
    LIGHTING_DESCRIPTION: lightingDescription(output.renderStyle, styleSettings.lighting, category),
    // How a full-bleed square's backdrop takes the render style's surface, and where its outline runs.
    // Supplied for every sheet, as the outline is; `[IF:OWN_BACKDROP]` decides whether it is read.
    BACKDROP_DESCRIPTION: backdropDescription(output.renderStyle, styleSettings.outline),
    // Supplied for every style, as `PALETTE_DESCRIPTION` is, and `''` for the eight that describe a
    // finished surface — the template's own `[IF:VALIDATION_PASS]` is what decides whether the token
    // is still there to be filled.
    VALIDATION_PASS_DESCRIPTION: VALIDATION_PASS_TEXT[output.renderStyle],
    // Supplied whether or not the blocks survive, as `PALETTE_DESCRIPTION` is: `substitute` throws
    // on a token it has no value for, and the template's own `[IF:NATIVE_GRID]` is what decides
    // whether the token is still there to be filled.
    NATIVE_GRID_SCALE: nativeScale === null ? '' : String(nativeScale),
  };
}
