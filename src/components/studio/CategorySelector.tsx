import { CATEGORY_OPTIONS } from '../../constants/categories/index.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { SelectField } from '../common/SelectField.tsx';

/**
 * The five categories, paired with their display names. Derived from the option pool once at module
 * scope rather than on every render — the pool is a compile-time constant, so this cannot go stale.
 */
const CATEGORY_CHOICES = SUBJECT_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_OPTIONS[value].label,
}));

/**
 * Which kind of thing is being described.
 *
 * The biggest lever in the studio, because it swaps the whole field vocabulary: `species` is
 * "Species / Archetype" for a character and "Structure Type" for a building, with an entirely
 * different option pool behind it. Switching therefore resets the subject — which is why this
 * confirms out loud, rather than silently discarding what the user had typed.
 */
export function CategorySelector() {
  const category = useSubjectStore((state) => state.category);
  const setCategory = useSubjectStore((state) => state.setCategory);
  const showToast = useUIStore((state) => state.showToast);

  return (
    <SelectField
      label="Subject Category"
      tooltip={OUTPUT_TOOLTIPS.category}
      value={category}
      choices={CATEGORY_CHOICES}
      onChange={(next) => {
        setCategory(next);
        showToast(`Switched category to ${CATEGORY_OPTIONS[next].label}`);
      }}
    />
  );
}
