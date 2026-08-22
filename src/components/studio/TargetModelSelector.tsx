import { TARGET_MODELS } from '../../constants/models.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';
import { GeneratorSiteLink } from './GeneratorSiteLink.tsx';

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
 * The whole entry, keyed the same way, for the link button beside the control.
 *
 * A second `Map` rather than widening the one above, because the two are read for different things
 * and the description's fallback is not the link's: a missing description renders nothing, while a
 * missing entry has no button to render at all.
 */
const MODEL_ENTRIES = new Map(TARGET_MODELS.map((model) => [model.id, model]));

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
 *
 * **The button on the control's own row is where the prompt goes next.** A prompt composed here is
 * used somewhere else, and the app named the generator without ever saying where it is —
 * `GeneratorSiteLink` opens that generator's image page in a new tab. It costs the select 48px of
 * its row, which is why `--breakpoint-studio` sits where it does: see the token in `index.css`.
 */
export function TargetModelSelector() {
  const targetModel = useOutputStore((state) => state.output.targetModel);
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const entry = MODEL_ENTRIES.get(targetModel);

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
        // Unreachable for the same reason the description's fallback is, and answered differently:
        // an explanation that resolved to nothing can still render the control it belongs to, while
        // a link with no target is a button that would do nothing when pressed.
        action={entry && <GeneratorSiteLink name={entry.name} site={entry.generatorSite} />}
        onChange={(value) => {
          setOutputField('targetModel', value);
        }}
      />
    </section>
  );
}
