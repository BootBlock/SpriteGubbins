import {
  ASPECT_RATIO_CHOICES,
  DIRECTIONAL_MODE_CHOICES,
  LIGHTING_MODEL_CHOICES,
  OUTLINE_STYLE_CHOICES,
  OUTPUT_TOOLTIPS,
  PALETTE_LIMIT_CHOICES,
  RESOLUTION_PROFILE_CHOICES,
  SURFACE_DETAIL_CHOICES,
} from '../../constants/output.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { Badge } from '../common/Badge.tsx';
import { SelectField } from '../common/SelectField.tsx';

/**
 * How the sheet should be rendered — the seven technical directives.
 *
 * Every label here is a human name for an identifier that goes verbatim into the compiled prompt,
 * which is why the choices come from `constants/output.ts` rather than being written out as options:
 * the identifier, its label and its compiler branch are then one edit rather than three.
 */
export function OutputConfig() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  return (
    <section className="animate-fade-in space-y-4 rounded-2xl border border-foundry-700 bg-foundry-800/80 p-5 shadow-2xl backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 border-b border-foundry-700 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <span aria-hidden="true" className="text-accent-soft">
            ⚙️
          </span>
          2. Output Configuration
        </h2>
        <Badge>Technical Directives</Badge>
      </div>

      <SelectField
        label="Directional Coverage Mode"
        tooltip={OUTPUT_TOOLTIPS.directionalMode}
        value={output.directionalMode}
        choices={DIRECTIONAL_MODE_CHOICES}
        onChange={(value) => {
          setOutputField('directionalMode', value);
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

      <SelectField
        label="Palette Limit Strategy"
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

      <SelectField
        label="Sheet Canvas Aspect Ratio"
        tooltip={OUTPUT_TOOLTIPS.aspectRatio}
        value={output.aspectRatio}
        choices={ASPECT_RATIO_CHOICES}
        onChange={(value) => {
          setOutputField('aspectRatio', value);
        }}
      />
    </section>
  );
}
