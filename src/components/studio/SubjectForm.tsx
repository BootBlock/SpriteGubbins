import { CATEGORY_OPTIONS } from '../../constants/categories/index.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { ComboBox } from '../common/ComboBox.tsx';
import { CategorySelector } from './CategorySelector.tsx';

/**
 * What is being drawn: the category, and the sixteen fields that describe the subject.
 *
 * The fields are rendered from the category's own definition rather than written out one by one, so
 * a category is a *data* change and never a change here. Each one gets a `ComboBox`, because the
 * option pool is a set of suggestions rather than a constraint.
 */
export function SubjectForm() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const setField = useSubjectStore((state) => state.setField);
  const randomizeSubject = useSubjectStore((state) => state.randomizeSubject);
  const showToast = useUIStore((state) => state.showToast);

  const { label: categoryLabel, fields } = CATEGORY_OPTIONS[category];

  // The panel is a *named* group. The Randomise button below is a group of its own, and Tailwind's
  // `group-hover:` matches any `group` ancestor — so an unnamed one out here would roll its dice
  // from a pointer anywhere in the panel.
  return (
    <section className="animate-fade-in glass-panel group/panel space-y-4 rounded-2xl border border-foundry-700 p-5 shadow-2xl transition-colors duration-300 hover:border-tab/40">
      <div className="flex items-center justify-between gap-3 border-b border-foundry-700 pb-3">
        <h2 className="flex items-center gap-2.5 text-sm font-bold text-ink">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-tab/15 text-sm ring-1 ring-tab/30 transition-all duration-500 group-hover/panel:scale-110 group-hover/panel:ring-tab/60"
          >
            👤
          </span>
          <span className="font-mono text-tab">1.</span>
          Subject Definition
        </h2>

        <button
          type="button"
          onClick={() => {
            randomizeSubject();
            showToast(`Randomised ${categoryLabel} properties`);
          }}
          className="group flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1.5 text-xs font-black text-foundry-950 shadow-md transition-transform duration-200 hover:scale-[1.04] active:scale-[0.96]"
        >
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-500 group-hover:rotate-180"
          >
            🎲
          </span>
          Randomise
        </button>
      </div>

      <CategorySelector />

      <div className="space-y-3.5 pt-1">
        {fields.map((field) => (
          <ComboBox
            key={field.key}
            label={field.label}
            tooltip={field.tooltip}
            value={subject[field.key]}
            options={field.options}
            onChange={(value) => {
              setField(field.key, value);
            }}
          />
        ))}
      </div>
    </section>
  );
}
