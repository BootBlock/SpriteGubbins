import { DIRECTION_SET_CHOICES, OUTPUT_TOOLTIPS, PROJECTION_CHOICES } from '../../constants/output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS, DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { sheetDirections } from '../../utils/sheetDirections.ts';
import { splitsIntoRuns } from '../../utils/sheetRuns.ts';
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
 *
 * The primary facing appears only when the direction set is a **run list** rather than a description
 * of one sheet — a mode covering one facing at a time, over a set naming more than one. Anywhere
 * else it is inert: a `CORE_DIRECTIONAL_VARIANTS` sheet draws its own three facings whatever this
 * said, so a visible control would promise something the prompt does not carry.
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
        onChange={(directions) => {
          // The facing is cleared with the set, in one write. A `north` held over into
          // `THREE_CLASSIC` is a facing that set never turns to, and both values reaching the
          // compiler together is what stops a render seeing the new set beside the old facing.
          setOutputConfig({ ...output, directions, primaryDirection: null });
        }}
      />

      {splitsIntoRuns(output) && (
        <SelectField
          label="Primary Facing"
          tooltip={OUTPUT_TOOLTIPS.primaryDirection}
          value={sheetDirections(output).assembly}
          choices={DIRECTION_LISTS[output.directions].map((direction) => ({
            value: direction,
            label: direction,
          }))}
          onChange={(value) => {
            setOutputField('primaryDirection', value);
          }}
        />
      )}
    </>
  );
}
