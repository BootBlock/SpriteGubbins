import { CATEGORY_OPTIONS } from '../../constants/categories/index.ts';
import { SUBJECT_FIELD_GROUPS } from '../../constants/subjectGroups.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { subjectGroupDigest } from '../../utils/studioDigests.ts';
import { CollapsibleSection } from '../common/CollapsibleSection.tsx';
import { ComboBox } from '../common/ComboBox.tsx';
import { SectionToggleAll } from '../common/SectionToggleAll.tsx';
import { CategorySelector } from './CategorySelector.tsx';

/**
 * What is being drawn: the category, and the sixteen fields that describe the subject, in five
 * foldable groups.
 *
 * `SUBJECT_FIELD_GROUPS` decides which fields appear and in what order; the category supplies each
 * one's label, tooltip and option pool. Nothing is written out field by field, so a category stays a
 * *data* change — but the panel is no longer one flat run of sixteen. Sixteen identical rows with no
 * hierarchy left the reader to work out for themselves that five of them describe what the thing
 * *is* and two describe how it is *painted*; the groups say so. Each one gets a `ComboBox`, because
 * the option pool is a set of suggestions rather than a constraint.
 *
 * **The two-up grid is a container query, not a breakpoint.** Whether two fields fit side by side is
 * a fact about this panel's width, and the same panel is full-width when the studio's columns stack
 * and half-width when they don't — only its own measurement knows which. Below 34rem of panel the
 * fields stay in a single column, which is also what keeps the pairing inside Baymard's stated
 * exception: two related fields per line, never a form split into two columns.
 *
 * **The category selector sits above all five groups**, not inside one. It is not a seventeenth
 * field: switching it resets every field below it and swaps the whole option vocabulary, so it
 * governs the groups rather than belonging to one.
 */
export function SubjectForm() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const setField = useSubjectStore((state) => state.setField);
  const randomizeSubject = useSubjectStore((state) => state.randomizeSubject);
  const showToast = useUIStore((state) => state.showToast);

  const { label: categoryLabel, fields } = CATEGORY_OPTIONS[category];
  // Keyed for lookup because the groups name fields by key while a category defines them as a list.
  // Built per render: `fields` changes with the category, and a module-level map could not.
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

  // The panel is a *named* group. The Randomise button below is a group of its own, and Tailwind's
  // `group-hover:` matches any `group` ancestor — so an unnamed one out here would roll its dice
  // from a pointer anywhere in the panel.
  return (
    <section className="animate-fade-in glass-panel group/panel space-y-4 rounded-2xl border border-foundry-700 p-5 shadow-2xl transition-colors duration-300 hover:border-tab/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foundry-700 pb-3">
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

        <div className="flex items-center gap-2">
          <SectionToggleAll sections={SUBJECT_FIELD_GROUPS} panelLabel="Subject Definition" />

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
      </div>

      <div className="border-b border-foundry-700 pb-4">
        <CategorySelector />
      </div>

      {/* The query container: `@[34rem]` below measures this box, not the viewport. */}
      <div className="@container">
        {SUBJECT_FIELD_GROUPS.map((group) => (
          <CollapsibleSection
            key={group.id}
            id={group.id}
            defaultOpen={group.defaultOpen}
            heading={group.heading}
            digest={subjectGroupDigest(subject, group.keys)}
          >
            {/*
              A group with an odd number of fields ends on a lone cell with a ~270px void beside it,
              which reads as a control that failed to render rather than as the end of the group.
              The last child of an odd-length list takes the whole row instead — four of the five
              groups are odd, so this is the common case, not the exception.
            */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 @[34rem]:grid-cols-2 @[34rem]:[&>*:last-child:nth-child(odd)]:col-span-2">
              {group.keys.map((key) => {
                const field = fieldsByKey.get(key);
                // `Map.get` is typed `V | undefined`, so this is required whatever the compiler
                // flags say. Unreachable in practice — `subjectGroups.test.ts` pins that every key
                // resolves in all five categories — and a missing one should leave a hole rather
                // than take the panel down.
                if (!field) return null;

                return (
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
                );
              })}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </section>
  );
}
