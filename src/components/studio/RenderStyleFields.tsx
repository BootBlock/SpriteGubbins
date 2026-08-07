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

/**
 * How the sheet is drawn.
 *
 * Render style leads and resolution is separate from it, which is the point: welding the two
 * together is what made the previous template pixel-only, and a painted sheet and a pixel sheet can
 * share a resolution profile perfectly well.
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

      <SelectField
        label="Palette Limit"
        tooltip={OUTPUT_TOOLTIPS.paletteLimit}
        value={output.paletteLimit}
        choices={PALETTE_LIMIT_CHOICES}
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
