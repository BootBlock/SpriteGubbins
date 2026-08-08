import { TARGET_MODELS } from '../../constants/models.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';

/** The generators offered, paired with their display names. See {@link TARGET_MODELS}. */
const MODEL_CHOICES = TARGET_MODELS.map((model) => ({ value: model.id, label: model.name }));

/**
 * Which generator the prompt is being written for.
 *
 * Not merely a label: each model gets a different wrapper — a reasoning contract, CLI flags, a
 * negative-prompt block, a directive prefix — so this changes the *shape* of the compiled output,
 * not just its wording. Its own panel, above the preview, because it governs everything below it.
 */
export function TargetModelSelector() {
  const targetModel = useOutputStore((state) => state.output.targetModel);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  return (
    <section className="animate-fade-in glass-panel rounded-2xl border border-foundry-700 p-4 shadow-xl transition-colors duration-300 hover:border-tab/40">
      <SelectField
        label="3. Target AI Generator"
        tooltip={OUTPUT_TOOLTIPS.targetModel}
        value={targetModel}
        choices={MODEL_CHOICES}
        onChange={(value) => {
          setOutputField('targetModel', value);
        }}
      />
    </section>
  );
}
