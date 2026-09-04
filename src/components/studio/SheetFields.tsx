import { COMPONENT_BUDGET_RANGE } from '../../constants/componentBudget.ts';
import {
  ASPECT_RATIO_CHOICES,
  BACKGROUND_KEY_CHOICES,
  DIRECTIONAL_MODE_TOOLTIPS,
  directionalModeChoices,
  OUTPUT_TOOLTIPS,
  sheetChoices,
} from '../../constants/output/index.ts';
import {
  resolveMode,
  resolveRigMode,
  resolveSheetIndex,
  sheetSeriesFor,
} from '../../constants/sheetPlans/index.ts';
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
  // floors and walls one click away from a character. Both lists read the chosen direction set,
  // because the set decides how many parts a directional pairing has and how many generations each
  // of them takes — the mode list through the whole configuration, since a batch is a property of
  // one and `sheetBatch` is where that expansion is written down.
  const mode = resolveMode(category, output.directionalMode);
  const modeChoices = directionalModeChoices(category, output, parseAdditionalAnatomy(additionalAnatomy));
  const inventoryParts = sheetChoices(category, mode, output.directions);

  return (
    <>
      <SelectField
        label="Sheet Contents"
        tooltip={OUTPUT_TOOLTIPS.directionalMode}
        value={mode}
        choices={modeChoices}
        // What the *chosen* sheet is, where the ⓘ above explains what the setting is. The four
        // accounts differ from each other in a way no single sentence covers — one is a run list of
        // one subject’s variants, one turns a subject, one draws rig pieces and settles Rig Mode,
        // one tiles — which is the case this prop exists for, and the reason the ⓘ no longer recites
        // two of them at whoever has chosen a third.
        description={DIRECTIONAL_MODE_TOOLTIPS[mode]}
        onChange={(value) => {
          // The inventory part goes back to the first in the same write. Every mode has one, and a
          // stored index left pointing at a part the new mode does not have would put the select
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
            // Against the sheets the new mode produces rather than against the mode's name,
            // because the rig a pairing can carry is its inventories' answer. This is the only
            // control that can change it: the rig belongs to the whole series, so the Inventory Part
            // select below cannot leave the store holding one its own sheets refuse.
            rigMode: resolveRigMode(
              category,
              sheetSeriesFor(category, value, output.directions),
              output.rigMode,
            ),
            sheetIndex: 0,
          });
        }}
      />

      {/* Only where the pairing's inventory genuinely splits, which is a narrower test than the split
          button's — a rig covers one facing per sheet and is several generations of a single part, so
          it is a batch with nothing for this control to choose between. A select offering one option
          is a control with nothing to do.

          **It is `Inventory Part` and not `Sheet of Series` because the prompt already spends the
          word.** `SERIES_POSITION`, `SERIES_TOTAL` and section 6's `The sheets in this series` all
          count *generations* — the batch, which is this list with its `'run'` parts multiplied out by
          the direction set — and `SheetProgress` states the same figure as `Sheet N of M`. A control
          naming the other axis with the same word put two ordinals on one panel and let a reader
          take `Sheet 2 of 6` as six of whatever they had chosen here. */}
      {inventoryParts.length > 1 && (
        <SelectField
          label="Inventory Part"
          tooltip={OUTPUT_TOOLTIPS.sheetIndex}
          // Resolved through the inventory rather than read raw, so a stored index the pairing does
          // not have shows the part the compiler is actually producing instead of an empty control.
          value={resolveSheetIndex(category, mode, output.directions, output.sheetIndex)}
          choices={inventoryParts}
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
          setOutputField('componentBudget', value);
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
