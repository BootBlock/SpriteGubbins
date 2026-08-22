import { resolveDirectionSet } from '../../constants/categoryDirectionSets.ts';
import { resolveProjection } from '../../constants/categoryProjections.ts';
import { directionSetChoices, OUTPUT_TOOLTIPS, projectionChoices } from '../../constants/output/index.ts';
import {
  cameraElevationRange,
  DEFAULT_CAMERA_ELEVATIONS,
  DIRECTION_LISTS,
  resolveCameraElevation,
} from '../../constants/promptText/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { facingApplies, primaryFacing } from '../../utils/sheetDirections.ts';
import { NumberField } from '../common/NumberField.tsx';
import { SelectField } from '../common/SelectField.tsx';

/** One degree at a time, over whatever span the chosen projection leaves open. */
const ELEVATION_STEP = 1;

/**
 * Where the camera stands, and which facings the sheet covers.
 *
 * **Choosing a projection sets the elevation, and for all but one projection that is the end of it.**
 * The two are printed as adjacent lines of section 3, so a free number beside them is two statements
 * about where one camera stands and nothing checking they agree — `Directly overhead. Only the top
 * of forms is visible` sat one line above `Camera elevation: 0° above the horizon`. A projection
 * other than the angled-overhead one *is* a camera geometry, so its elevation is not a second
 * setting; the angled-overhead one is where a game's own ground read goes, and it takes the span
 * `cameraElevationRange` leaves it.
 *
 * **The camera is narrowed by the category as well, and for the same reason the set below is.** An
 * interface widget is screen-space art with no top surface and no depth axis, so a
 * `THREE_QUARTER_TOPDOWN` held over from a default session asked for a button under a 35° overhead
 * camera — a prompt disagreeing with itself rather than merely a degenerate one. INTERFACE is
 * offered `ORTHOGRAPHIC_FRONT` alone; the other eight categories are offered every camera, TERRAIN
 * included, because a cliff face is a landform seen from the side and one of the shipped presets is
 * exactly that.
 *
 * **The direction set is always on screen, because it now always does something.** A directional
 * core draws the chosen set's facings — splitting into a cardinal and a diagonal sheet on the
 * eight-compass set — and every `'run'` sheet reads the set as its run list. The one narrowing left
 * is the category's: an interface widget or a ground tile has no facing to turn to, so those two
 * offer `SINGLE_FRONT` alone, and the control stays on screen with its one option rather than
 * disappearing — the value is used, and a control that vanishes between categories hides a setting
 * the folded digest still reports.
 *
 * The primary facing appears only when the **selected sheet** is a run sheet over a set naming more
 * than one facing. Anywhere else it is inert: a directional core draws its plan's own facings
 * whatever this said, so a visible control would promise something the prompt does not carry.
 * `facingApplies` resolves the sheet through the category first, because a stored mode or index the
 * category cannot produce would otherwise hide or show the wrong control — hiding being the worse
 * way round, since the compiler still reads the field.
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

  // The camera, narrowed through the category exactly as the set above is: an interface widget is
  // composited onto the screen rather than photographed in a world, so it is drawn under
  // `ORTHOGRAPHIC_FRONT` and the select offers that alone. Resolved rather than read raw because a
  // stored projection — or one an art style reference applied — would otherwise put the select on a
  // value its own options do not contain.
  const projection = resolveProjection(category, output.projection);
  const cameraChoices = projectionChoices(category);

  // What that projection leaves the elevation, which for all but one of them is a single figure.
  // The field's own value is resolved through the same range below, for the reason the projection
  // above is resolved: a stored pairing the projection cannot be drawn at would otherwise leave the
  // control showing a camera the prompt does not carry.
  const elevationRange = cameraElevationRange(projection);
  const elevationIsFixed = elevationRange.min === elevationRange.max;

  return (
    <>
      <SelectField
        label="Projection"
        tooltip={OUTPUT_TOOLTIPS.projection}
        value={projection}
        choices={cameraChoices}
        onChange={(chosen) => {
          // Both in one write: two `setOutputField` calls would put a projection and a stale
          // elevation into the compiler between renders.
          setOutputConfig({
            ...output,
            projection: chosen,
            cameraElevation: DEFAULT_CAMERA_ELEVATIONS[chosen],
          });
        }}
      />

      <NumberField
        label="Camera Elevation (°)"
        tooltip={OUTPUT_TOOLTIPS.cameraElevation}
        value={resolveCameraElevation(projection, output.cameraElevation)}
        min={elevationRange.min}
        max={elevationRange.max}
        step={ELEVATION_STEP}
        disabledReason={
          elevationIsFixed
            ? `${projection} is a camera in its own right, and stands at ${String(elevationRange.min)}°. Choose THREE_QUARTER_TOPDOWN to set the elevation yourself.`
            : ''
        }
        onChange={(value) => {
          setOutputField('cameraElevation', value);
        }}
      />

      <SelectField
        label="Directions Covered"
        tooltip={OUTPUT_TOOLTIPS.directions}
        value={directions}
        choices={setChoices}
        onChange={(chosen) => {
          // The facing and the sheet go back with the set, in one write. A `north` held over into
          // `THREE_CLASSIC` is a facing that set never turns to, and a sheet index held over from a
          // longer series would point past the new set's own — the eight-compass pairing is the one
          // whose series has a sheet the others do not. All three reaching the compiler together is
          // what stops a render seeing the new set beside stale companions.
          setOutputConfig({ ...output, directions: chosen, primaryDirection: null, sheetIndex: 0 });
        }}
      />

      {facingApplies(category, output) && (
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
