import { COMPONENT_BUDGET_RANGE } from '../../constants/componentBudget.ts';
import {
  ASPECT_RATIO_CHOICES,
  BACKGROUND_KEY_CHOICES,
  directionalModeChoices,
  OUTPUT_TOOLTIPS,
  sheetChoices,
} from '../../constants/output/index.ts';
import { resolveMode, resolveRigMode, resolveSheetIndex } from '../../constants/sheetPlans/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { NumberField } from '../common/NumberField.tsx';
import { SelectField } from '../common/SelectField.tsx';

/**
 * What the sheet is, before anything about how it is drawn: how many components it carries, what
 * shape the canvas is, and what the components sit on.
 *
 * The directional mode leads because it is the single biggest lever — it sets the component count
 * the prompt states as a done-condition and the atlas calculator lays out.
 *
 * Its labels are built during render rather than read from a constant, because the subject's
 * additional anatomy is counted into that total: a menu promising 37 components beside a prompt
 * demanding 38 is how a user comes to expect the wrong number.
 */
export function SheetFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const setOutputConfig = useOutputStore((state) => state.setOutputConfig);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  const category = useSubjectStore((state) => state.category);

  // Only the modes this category can actually produce. Offering the others is what put a tileset's
  // floors and walls one click away from a character. Both lists take the chosen direction set,
  // because the set now decides how many sheets a directional pairing is and what each one costs.
  const mode = resolveMode(category, output.directionalMode);
  const modeChoices = directionalModeChoices(
    category,
    output.directions,
    parseAdditionalAnatomy(additionalAnatomy),
  );
  const seriesChoices = sheetChoices(category, mode, output.directions);

  return (
    <>
      <SelectField
        label="Sheet Contents"
        tooltip={OUTPUT_TOOLTIPS.directionalMode}
        value={mode}
        choices={modeChoices}
        onChange={(value) => {
          // The sheet goes back to the first in the same write. Every mode has one, and a stored
          // index left pointing at a series member the new mode does not have would put the select
          // below on a value its own options do not contain.
          //
          // The rig travels with it for the reason `setCategory` carries the same three fields: the
          // cut-out rig sheet draws the rig pieces themselves, so choosing it settles what they are
          // for, and a store left holding the rig the user had before is state a saved preset would
          // persist — a `POSE_LIBRARY` recorded against a sheet whose whole inventory is joints.
          // The compiler resolves it either way, so this is not what makes the prompt correct; it
          // is what stops the stored configuration disagreeing with the control showing it.
          setOutputConfig({
            ...output,
            directionalMode: value,
            rigMode: resolveRigMode(category, value, output.rigMode),
            sheetIndex: 0,
          });
        }}
      />

      {/* Only where the pairing genuinely takes more than one generation, which is the same test the
          split button applies — a select offering one option is a control with nothing to do. */}
      {seriesChoices.length > 1 && (
        <SelectField
          label="Sheet of Series"
          tooltip={OUTPUT_TOOLTIPS.sheetIndex}
          // Resolved through the series rather than read raw, so a stored index the pairing does not
          // have shows the sheet the compiler is actually producing instead of an empty control.
          value={resolveSheetIndex(category, mode, output.directions, output.sheetIndex)}
          choices={seriesChoices}
          onChange={(value) => {
            setOutputField('sheetIndex', value);
          }}
        />
      )}

      <NumberField
        label="Component Budget"
        tooltip={OUTPUT_TOOLTIPS.componentBudget}
        value={output.componentBudget}
        min={COMPONENT_BUDGET_RANGE.min}
        max={COMPONENT_BUDGET_RANGE.max}
        step={1}
        // Nothing else on this panel can take the budget over: it is a cap the user sets, and every
        // configuration has one.
        disabledReason=""
        onChange={(value) => {
          // A budget is a count of components, and `NumberField` treats `step` as a hint rather
          // than a check — so a typed `42.7` is refused here in the same way it refuses an
          // out-of-range entry, instead of reaching the warning as "a budget of 42.7".
          if (Number.isInteger(value)) setOutputField('componentBudget', value);
        }}
      />

      <SelectField
        label="Background Key"
        tooltip={OUTPUT_TOOLTIPS.backgroundKey}
        value={output.backgroundKey}
        choices={BACKGROUND_KEY_CHOICES}
        onChange={(value) => {
          setOutputField('backgroundKey', value);
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
    </>
  );
}
