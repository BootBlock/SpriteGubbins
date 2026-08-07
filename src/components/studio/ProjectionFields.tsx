import { DIRECTION_SET_CHOICES, OUTPUT_TOOLTIPS, PROJECTION_CHOICES } from '../../constants/output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { NumberField } from '../common/NumberField.tsx';
import { SelectField } from '../common/SelectField.tsx';

/** Elevation is degrees above the horizon: below the ground or past vertical is not a camera. */
const ELEVATION = { min: 0, max: 90, step: 1 } as const;

/**
 * Where the camera stands, and which facings the sheet covers.
 *
 * Choosing a projection moves the elevation with it, because most of the time the projection *is*
 * the answer — a true isometric wants 30°, a pure top-down wants 90°. It stays editable for the
 * cases where a game has its own ground read.
 */
export function ProjectionFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const setOutputConfig = useOutputStore((state) => state.setOutputConfig);

  return (
    <>
      <SelectField
        label="Projection"
        tooltip={OUTPUT_TOOLTIPS.projection}
        value={output.projection}
        choices={PROJECTION_CHOICES}
        onChange={(projection) => {
          // Both in one write: two `setOutputField` calls would put a projection and a stale
          // elevation into the compiler between renders.
          setOutputConfig({
            ...output,
            projection,
            cameraElevation: DEFAULT_CAMERA_ELEVATIONS[projection],
          });
        }}
      />

      <NumberField
        label="Camera Elevation (°)"
        tooltip={OUTPUT_TOOLTIPS.cameraElevation}
        value={output.cameraElevation}
        min={ELEVATION.min}
        max={ELEVATION.max}
        step={ELEVATION.step}
        onChange={(value) => {
          setOutputField('cameraElevation', value);
        }}
      />

      <SelectField
        label="Directions Covered"
        tooltip={OUTPUT_TOOLTIPS.directions}
        value={output.directions}
        choices={DIRECTION_SET_CHOICES}
        onChange={(value) => {
          setOutputField('directions', value);
        }}
      />
    </>
  );
}
