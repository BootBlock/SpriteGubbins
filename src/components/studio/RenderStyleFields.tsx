import {
  LIGHTING_MODEL_CHOICES,
  OUTLINE_STYLE_CHOICES,
  OUTPUT_TOOLTIPS,
  PALETTE_LIMIT_CHOICES,
  RENDER_STYLE_CHOICES,
  RESOLUTION_PROFILE_CHOICES,
  SURFACE_DETAIL_CHOICES,
} from '../../constants/output/index.ts';
import { paletteFor } from '../../constants/palettes/index.ts';
import { validationPassFor } from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import type { ValidationPass } from '../../types/rendering.ts';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';
import { PaletteField } from './PaletteField.tsx';

/**
 * What the Render Style control says about itself once a validation pass is chosen.
 *
 * The counterpart of `PaletteField`'s own sentence, and there for the same reason: three controls
 * leave the panel at once — four for the silhouette — and a disappearance the page never accounts
 * for reads as a bug rather than as a rule. It describes the state the configuration is now in
 * rather than explaining what the setting is, which is `OUTPUT_TOOLTIPS.renderStyle`'s job behind
 * the ⓘ this control already carries.
 *
 * The list is assembled from the same `withholdsLight` the lighting control is withdrawn on, so the
 * sentence cannot name a control that is still there or miss one that has gone.
 */
function supersession(pass: ValidationPass | null): string {
  if (pass === null) return '';

  const withdrawn = ['surface detail', 'the colour budget', 'the outline system'];
  if (pass.withholdsLight) withdrawn.push('the lighting model');

  return `A validation pass: it states the surface itself, so ${withdrawn.slice(0, -1).join(', ')} and ${withdrawn.at(-1) ?? ''} withdraw, and the prompt carries what the pass withholds in their place.`;
}

/**
 * How the sheet is drawn.
 *
 * Render style leads and resolution is separate from it, which is the point: welding the two
 * together is what made the previous template pixel-only, and a painted sheet and a pixel sheet can
 * share a resolution profile perfectly well.
 *
 * **Palette Limit appears only where no palette is pinned**, and Palette is ordered directly above
 * it so that the control deciding this is the one met first. A pinned palette supersedes the budget
 * everywhere — the compiler drops the budget line, and the quantiser maps onto the palette rather
 * than counting colours — so a visible control there would be offering a setting the prompt does not
 * carry. That is the test `RiggingFields` and `ProjectionFields` already apply to their own
 * conditional fields, and this control failed it: on a Mega Drive or a Game Boy the budget sat on
 * screen, fully operable, changing nothing.
 *
 * The question is asked as `paletteFor(…) === null` rather than `=== 'FREE'` because that is where
 * "no palette" is defined — `PALETTES` maps the one to the other, so every reader of the rule gets
 * it from the same lookup and none of them can drift. `PaletteField` decides whether to explain the
 * supersession on exactly that predicate, which is what keeps the explanation and the withdrawal
 * from ever both being absent.
 *
 * **Four controls answer to the render style in the same way**, because two of the ten styles are
 * validation passes rather than finished looks. `CLAY_RENDER` and `SILHOUETTE_ONLY` state the
 * surface themselves — one untextured material, one flat fill — so surface detail, the colour budget
 * and the outline system describe a surface the sheet is not drawing, and the compiler drops all
 * three from section 2. The silhouette takes the lighting model with them: a flat fill has nowhere
 * for a key light to land. Left on screen they would be three or four settings the prompt no longer
 * carries, which is exactly the failure the colour budget's own withdrawal above answers.
 *
 * Hiding it does not discard it. `paletteLimit` is untouched in the store while the palette is
 * pinned, and none of the four is touched while a pass is chosen, so the values the user chose are
 * what the sheet falls back to the moment they go back to a finished style — which is the whole
 * workflow a validation pass is for.
 *
 * **The two withdrawals of the colour budget are not the same withdrawal**, and the difference is
 * worth knowing before reading `colorPlanFor`. A pinned palette supersedes the budget *everywhere* —
 * it is the answer to "which colours may be used", so the quantiser maps onto it and stops counting.
 * A validation pass supersedes it only *in the prompt*: it says this sheet has no colour to budget,
 * which is a statement about one sheet rather than about the project's colour policy, and the
 * quantiser goes on reducing whatever image it is handed to the budget the user set. So the budget
 * is reached by leaving the pass, exactly as it is reached by clearing the palette.
 */
export function RenderStyleFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  const pass = validationPassFor(output.renderStyle);

  return (
    <>
      <SelectField
        label="Render Style"
        tooltip={OUTPUT_TOOLTIPS.renderStyle}
        value={output.renderStyle}
        choices={RENDER_STYLE_CHOICES}
        description={supersession(pass)}
        onChange={(value) => {
          setOutputField('renderStyle', value);
        }}
      />

      {pass === null && (
        <SelectField
          label="Surface Detail Intensity"
          tooltip={OUTPUT_TOOLTIPS.surfaceDetail}
          value={output.surfaceDetail}
          choices={SURFACE_DETAIL_CHOICES}
          onChange={(value) => {
            setOutputField('surfaceDetail', value);
          }}
        />
      )}

      <SelectField
        label="Resolution Profile"
        tooltip={OUTPUT_TOOLTIPS.resolutionProfile}
        value={output.resolutionProfile}
        choices={RESOLUTION_PROFILE_CHOICES}
        onChange={(value) => {
          setOutputField('resolutionProfile', value);
        }}
      />

      <TextField
        label="Target Component Size"
        tooltip={OUTPUT_TOOLTIPS.spriteTargetSize}
        value={output.spriteTargetSize}
        placeholder="48 × 96 px"
        onChange={(value) => {
          setOutputField('spriteTargetSize', value);
        }}
      />

      <PaletteField />

      {paletteFor(output.palette) === null && pass === null && (
        <SelectField
          label="Palette Limit"
          tooltip={OUTPUT_TOOLTIPS.paletteLimit}
          value={output.paletteLimit}
          choices={PALETTE_LIMIT_CHOICES}
          onChange={(value) => {
            setOutputField('paletteLimit', value);
          }}
        />
      )}

      {pass === null && (
        <SelectField
          label="Outline System"
          tooltip={OUTPUT_TOOLTIPS.outlineStyle}
          value={output.outlineStyle}
          choices={OUTLINE_STYLE_CHOICES}
          onChange={(value) => {
            setOutputField('outlineStyle', value);
          }}
        />
      )}

      {!pass?.withholdsLight && (
        <SelectField
          label="Lighting & Shading Model"
          tooltip={OUTPUT_TOOLTIPS.lightingModel}
          value={output.lightingModel}
          choices={LIGHTING_MODEL_CHOICES}
          onChange={(value) => {
            setOutputField('lightingModel', value);
          }}
        />
      )}
    </>
  );
}
