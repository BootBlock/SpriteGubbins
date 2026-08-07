import {
  ASPECT_RATIO_CHOICES,
  BACKGROUND_KEY_CHOICES,
  DIRECTIONAL_MODE_CHOICES,
  OUTPUT_TOOLTIPS,
} from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';

/**
 * What the sheet is, before anything about how it is drawn: how many components it carries, what
 * shape the canvas is, and what the components sit on.
 *
 * The directional mode leads because it is the single biggest lever — it sets the component count
 * the prompt states as a done-condition and the atlas calculator lays out.
 */
export function SheetFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  return (
    <>
      <SelectField
        label="Sheet Contents"
        tooltip={OUTPUT_TOOLTIPS.directionalMode}
        value={output.directionalMode}
        choices={DIRECTIONAL_MODE_CHOICES}
        onChange={(value) => {
          setOutputField('directionalMode', value);
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
