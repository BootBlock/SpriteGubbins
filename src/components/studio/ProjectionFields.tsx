import { DIRECTION_SET_CHOICES, OUTPUT_TOOLTIPS, PROJECTION_CHOICES } from '../../constants/output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS, DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { directionSetApplies, primaryFacing } from '../../utils/sheetDirections.ts';
import { splitsIntoFacingRuns } from '../../utils/sheetRuns.ts';
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
 * else it is inert: a `CORE_DIRECTIONAL_VARIANTS` sheet draws its own five facings whatever this
 * said, so a visible control would promise something the prompt does not carry.
 *
 * **That argument always applied one control higher, and the set itself did not obey it.** The modes
 * that fix their own coverage discard `directions` exactly as they discard `primaryDirection`, so
 * "Directions Covered" sat on screen offering four choices the compiler threw away — in the state
 * the app *opens* in, since `CORE_DIRECTIONAL_VARIANTS` is the default mode and the default config.
 * Picking all eight compass points changed the summary line and nothing else. Both controls now hang
 * off the same question, asked at the resolution each needs: does the mode defer to the set at all,
 * and if it does, does the set name more than one facing.
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

      {directionSetApplies(output) && (
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
      )}

      {splitsIntoFacingRuns(output) && (
        <SelectField
          label="Primary Facing"
          tooltip={OUTPUT_TOOLTIPS.primaryDirection}
          value={primaryFacing(output)}
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
