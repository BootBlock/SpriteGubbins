import { COMPONENT_BUDGET_RANGE } from '../../constants/componentBudget.ts';
import {
  ASPECT_RATIO_CHOICES,
  BACKGROUND_KEY_CHOICES,
  directionalModeChoices,
  OUTPUT_TOOLTIPS,
} from '../../constants/output/index.ts';
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
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);

  const modeChoices = directionalModeChoices(parseAdditionalAnatomy(additionalAnatomy));

  return (
    <>
      <SelectField
        label="Sheet Contents"
        tooltip={OUTPUT_TOOLTIPS.directionalMode}
        value={output.directionalMode}
        choices={modeChoices}
        onChange={(value) => {
          setOutputField('directionalMode', value);
        }}
      />

      <NumberField
        label="Component Budget"
        tooltip={OUTPUT_TOOLTIPS.componentBudget}
        value={output.componentBudget}
        min={COMPONENT_BUDGET_RANGE.min}
        max={COMPONENT_BUDGET_RANGE.max}
        step={1}
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
