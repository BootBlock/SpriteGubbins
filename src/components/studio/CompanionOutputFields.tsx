import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { deliberates, returnsText, supportsPromptFeedback } from '../../utils/targetCapabilities.ts';
import type { TargetModelId } from '../../types/output.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';

/**
 * The capability shortfalls a companion output can hit, each worded to follow "This target ".
 *
 * `NO_TEXT_CHANNEL` is a constant rather than a sentence beside each checkbox because it is one fact
 * with two readers — both options need that channel. Two spellings of it would drift apart the first
 * time the capability table moved and only one of them was corrected.
 */
const NO_TEXT_CHANNEL = 'returns an image only, with no channel for text';
const NO_SECOND_PASS = 'renders in one pass, so it has no step in which to re-read what it drew';

/**
 * Why the adherence report is unavailable here, naming every capability the target is missing.
 *
 * Assembled rather than picked, because the two shortfalls are independent: Seedream hits only the
 * second, every single-pass endpoint currently hits both, and naming just one of them would be true
 * and incomplete. Read off the same predicates the compiler gates on, so the explanation cannot
 * outlive the fact it describes.
 */
function feedbackUnavailableReason(target: TargetModelId): string {
  const missing = [
    ...(deliberates(target) ? [] : [NO_SECOND_PASS]),
    ...(returnsText(target) ? [] : [NO_TEXT_CHANNEL]),
  ];
  return missing.length === 0 ? '' : `This target ${missing.join(', and ')}.`;
}

/**
 * The two things the target can hand back *beside* the image.
 *
 * Grouped by what they need rather than by what they are for: both are text, so both are unavailable
 * the moment the target has no channel for text, and a user who has just been told why the component
 * map is greyed out should not have to discover the same fact again two groups further down.
 *
 * **These are the only two controls in the studio a preset cannot move.** They are a preference of
 * whoever is generating rather than a property of the archetype, so loading a preset leaves them
 * exactly as they were found — see `OutputConfig`, which is where the type says so.
 */
export function CompanionOutputFields() {
  const output = useOutputStore((state) => state.output);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  const target = output.targetModel;
  const componentMapAvailable = returnsText(target);

  return (
    <>
      <CheckboxField
        label="Request a companion component map"
        tooltip={OUTPUT_TOOLTIPS.emitComponentMap}
        checked={output.emitComponentMap && componentMapAvailable}
        disabledReason={componentMapAvailable ? '' : `This target ${NO_TEXT_CHANNEL}.`}
        onChange={(checked) => {
          setOutputField('emitComponentMap', checked);
        }}
      />

      <CheckboxField
        label="Ask the model to review the sheet against the prompt"
        tooltip={OUTPUT_TOOLTIPS.emitPromptFeedback}
        // Shown against the same gate the compiler uses, so a ticked box and a prompt without the
        // section can never disagree — and unticked on screen without discarding the preference, so
        // switching to Midjourney and back leaves the box as the user left it.
        checked={output.emitPromptFeedback && supportsPromptFeedback(target)}
        disabledReason={feedbackUnavailableReason(target)}
        onChange={(checked) => {
          setOutputField('emitPromptFeedback', checked);
        }}
      />
    </>
  );
}
