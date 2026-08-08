import { TARGET_MODELS } from '../../constants/models.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';

/** The generators offered, paired with their display names. See {@link TARGET_MODELS}. */
const MODEL_CHOICES = TARGET_MODELS.map((model) => ({ value: model.id, label: model.name }));

/**
 * What each target does to the prompt, keyed by id, so the panel can show the chosen one's.
 *
 * Built once from the same entries the choices come from, and a `Map` rather than a `find` per
 * render for the reason `HistoryEntry`'s name table is one: `TARGET_MODELS` is a compile-time
 * constant, so re-scanning it on every keystroke in the studio is work with no possible change in
 * answer.
 */
const MODEL_DESCRIPTIONS = new Map(TARGET_MODELS.map((model) => [model.id, model.description]));

/**
 * Which generator the prompt is being written for.
 *
 * Not merely a label: each model gets a different wrapper — a reasoning contract, CLI flags, a
 * negative-prompt block, a directive prefix — so this changes the *shape* of the compiled output,
 * not just its wording. Its own panel, above the preview, because it governs everything below it.
 *
 * **The selected target's own explanation sits under the control, always visible**, rather than
 * behind the ⓘ beside it — the same arrangement `CheckboxField` uses for the reason an option is
 * unavailable, and for the same reason. The ⓘ here explains what a target model *is*, which is one
 * sentence for all eleven; the part that actually differs — which flags Midjourney gets, why Flux
 * takes prose instead of a negative block, what Seedream is told to sacrifice — can only be written
 * per target. Guidance that answers "what did the thing I just picked change?" is worth the four
 * lines it costs, and putting it behind a hover would leave it about as findable as it was when
 * nothing rendered it at all.
 */
export function TargetModelSelector() {
  const targetModel = useOutputStore((state) => state.output.targetModel);
  const setOutputField = useOutputStore((state) => state.setOutputField);

  return (
    <section className="animate-view-fade-in glass-panel rounded-2xl border border-foundry-700 p-4 shadow-xl transition-colors duration-585 hover:border-tab/40">
      <SelectField
        label="3. Target AI Generator"
        tooltip={OUTPUT_TOOLTIPS.targetModel}
        value={targetModel}
        choices={MODEL_CHOICES}
        // Every id in the union has an entry — `targetCapabilities.test.ts` pins that the table
        // covers it — so the miss is unreachable rather than merely unlikely. Empty rather than a
        // stand-in sentence if it ever were reachable: a missing explanation is recoverable, and one
        // borrowed from a different target is a confidently wrong account of what the prompt does.
        description={MODEL_DESCRIPTIONS.get(targetModel) ?? ''}
        onChange={(value) => {
          setOutputField('targetModel', value);
        }}
      />
    </section>
  );
}
