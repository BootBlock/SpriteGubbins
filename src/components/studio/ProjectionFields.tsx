import { resolveDirectionSet } from '../../constants/categoryDirectionSets.ts';
import { directionSetChoices, OUTPUT_TOOLTIPS, PROJECTION_CHOICES } from '../../constants/output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS, DIRECTION_LISTS } from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { directionSetApplies, primaryFacing } from '../../utils/sheetDirections.ts';
import { splitsIntoFacingRuns } from '../../utils/sheetBatch.ts';
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
 *
 * **The category is read here because that question is about the sheet's mode, not the stored one.**
 * `SheetFields` next door has always resolved the mode before showing it; these two conditions did
 * not, so a configuration naming a pairing its category cannot produce — which is what an imported
 * preset or a hand-edited session may hold — hid or showed the wrong control. Hiding is the worse
 * way round: the compiler still reads both fields, so the sheet's own direction set and depth order
 * came from controls the panel had decided were inert.
 *
 * **The set's *options* are the category's too, which is a third question again.** Whether the sheet
 * reads the set is the mode's answer; which sets the subject can be turned to is
 * `CATEGORY_DIRECTION_SETS`, and for an interface widget or a ground tile the answer is
 * `SINGLE_FRONT` alone. The control stays on screen there with its one option rather than
 * disappearing, exactly as "Sheet Contents" does for an EFFECT: the value is used — it is the
 * "Directions required" line of the prompt — and a control that vanishes between categories hides a
 * setting the folded digest still reports.
 */
export function ProjectionFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const setOutputConfig = useOutputStore((state) => state.setOutputConfig);
  const category = useSubjectStore((state) => state.category);

  // Resolved through the category rather than read raw, for the same reason `SheetFields` resolves
  // its sheet index: a stored set this subject cannot be turned to would otherwise put the select on
  // a value its own options do not contain. The facing list below takes it too, because the facings
  // offered have to be those of the set actually in force.
  const directions = resolveDirectionSet(category, output.directions);
  const setChoices = directionSetChoices(category);

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

      {directionSetApplies(category, output) && (
        <SelectField
          label="Directions Covered"
          tooltip={OUTPUT_TOOLTIPS.directions}
          value={directions}
          choices={setChoices}
          onChange={(chosen) => {
            // The facing is cleared with the set, in one write. A `north` held over into
            // `THREE_CLASSIC` is a facing that set never turns to, and both values reaching the
            // compiler together is what stops a render seeing the new set beside the old facing.
            setOutputConfig({ ...output, directions: chosen, primaryDirection: null });
          }}
        />
      )}

      {splitsIntoFacingRuns(category, output) && (
        <SelectField
          label="Primary Facing"
          tooltip={OUTPUT_TOOLTIPS.primaryDirection}
          value={primaryFacing(category, output)}
          choices={DIRECTION_LISTS[directions].map((direction) => ({
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
