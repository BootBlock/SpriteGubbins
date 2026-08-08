import {
  LIGHTING_MODEL_CHOICES,
  OUTLINE_STYLE_CHOICES,
  OUTPUT_TOOLTIPS,
  PALETTE_LIMIT_CHOICES,
  RENDER_STYLE_CHOICES,
  RESOLUTION_PROFILE_CHOICES,
  SURFACE_DETAIL_CHOICES,
} from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';
import { PaletteField } from './PaletteField.tsx';

/** Why the colour budget is inert, shown against it while a palette is pinned. */
const SUPERSEDED_BY_PALETTE =
  'The pinned palette decides the colours, so this budget is not stated in the prompt and the quantiser ignores it. Set the palette to FREE to use it again.';

/**
 * How the sheet is drawn.
 *
 * Render style leads and resolution is separate from it, which is the point: welding the two
 * together is what made the previous template pixel-only, and a painted sheet and a pixel sheet can
 * share a resolution profile perfectly well.
 *
 * **Palette comes before Palette Limit** because it is the stronger statement of the two: a pinned
 * palette supersedes the budget everywhere, so a reader meeting the budget first would be choosing
 * a setting the control above it had already overruled.
 */
export function RenderStyleFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  return (
    <>
      <SelectField
        label="Render Style"
        tooltip={OUTPUT_TOOLTIPS.renderStyle}
        value={output.renderStyle}
        choices={RENDER_STYLE_CHOICES}
        onChange={(value) => {
          setOutputField('renderStyle', value);
        }}
      />

      <SelectField
        label="Surface Detail Intensity"
        tooltip={OUTPUT_TOOLTIPS.surfaceDetail}
        value={output.surfaceDetail}
        choices={SURFACE_DETAIL_CHOICES}
        onChange={(value) => {
          setOutputField('surfaceDetail', value);
        }}
      />

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

      <SelectField
        label="Palette Limit"
        tooltip={OUTPUT_TOOLTIPS.paletteLimit}
        value={output.paletteLimit}
        choices={PALETTE_LIMIT_CHOICES}
        // Left editable rather than disabled while a palette is pinned: the value is the user's own
        // and is what the sheet falls back to the moment they set the palette to FREE, so taking it
        // away would be discarding a setting to say it is inactive. `CompanionOutputFields` says the
        // same thing the same way about a manifest its target cannot return.
        description={output.palette === 'FREE' ? '' : SUPERSEDED_BY_PALETTE}
        onChange={(value) => {
          setOutputField('paletteLimit', value);
        }}
      />

      <SelectField
        label="Outline System"
        tooltip={OUTPUT_TOOLTIPS.outlineStyle}
        value={output.outlineStyle}
        choices={OUTLINE_STYLE_CHOICES}
        onChange={(value) => {
          setOutputField('outlineStyle', value);
        }}
      />

      <SelectField
        label="Lighting & Shading Model"
        tooltip={OUTPUT_TOOLTIPS.lightingModel}
        value={output.lightingModel}
        choices={LIGHTING_MODEL_CHOICES}
        onChange={(value) => {
          setOutputField('lightingModel', value);
        }}
      />
    </>
  );
}
