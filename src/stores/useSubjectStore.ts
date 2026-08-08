import { create } from 'zustand';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { resolveMode, resolveRigMode } from '../constants/sheetPlans/index.ts';
import type { SubjectCategory, SubjectDefinition, SubjectFieldKey } from '../types/subject.ts';
import { useOutputStore } from './useOutputStore.ts';

/**
 * What is being drawn: the category and the sixteen answers that describe the subject.
 *
 * Deliberately holds no compiled prompt, word count or token estimate. All three are functions of
 * this state and the output configuration, so they are derived where they are displayed — mirroring
 * them into a store would be the same "syncing derived state" defect the specification bans, only
 * moved out of a component where the lint rules can no longer see it.
 */
export interface SubjectState {
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;

  /** Switch category. Resets the subject: the field *pools* differ, so the answers cannot carry over. */
  setCategory(category: SubjectCategory): void;
  setField(key: SubjectFieldKey, value: string): void;
  /**
   * Replace both at once — what loading a preset does.
   *
   * The two arguments are not separable: a subject only means anything against the category whose
   * labels and pools it was written for, so setting them in two steps would leave the store briefly
   * describing a creature with a building's answers. The output store's `setOutputConfig` is the
   * same idea for the technical half.
   */
  setSubject(category: SubjectCategory, subject: SubjectDefinition): void;
  /** Reroll every field from the current category's option pool. */
  randomizeSubject(): void;
  /** Back to the current category's defaults, without changing category. */
  resetSubject(): void;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  category: DEFAULT_PRESET.category,
  subject: DEFAULT_PRESET.subject,

  setCategory: (category) => {
    set({ category, subject: defaultSubjectFor(category) });
    // Carry the sheet mode across too, because it does not survive a category change unchanged: the
    // modes are category-scoped, and a stale one is how a character came to be described by a
    // tileset's inventory. `resolveMode` keeps the current mode wherever the new category also
    // supports it — switching CHARACTER → CREATURE should not silently reset a cut-out rig — and
    // falls back to that category's default only where it genuinely cannot be honoured.
    //
    // Reaching into the other store rather than deriving this: the compiler resolves the pairing
    // again on every compile, so the *prompt* is safe either way, but a store left holding a mode
    // its own category cannot produce is state that a saved preset would then persist.
    // The sheet of the series goes back to the first whether or not the mode survives, because the
    // series is keyed on the *pairing*: a category the mode still supports can have a shorter series,
    // so a CHARACTER left on sheet two and switched to an OBJECT would hold an index that pairing does
    // not have. The compiler resolves such an index rather than trusting it, so this is not what makes
    // the prompt correct — it is what stops a saved preset persisting a sheet nobody can select, since
    // the sheet control is hidden for a single-sheet series and could not put it back.
    //
    // The rig travels with it, for the same reason and against the same table: a rig is a claim
    // about how the subject is built, so it does not survive becoming a different kind of subject.
    // `resolveRigMode` keeps a cut-out rig across CHARACTER → CREATURE and drops it to `NONE` on the
    // five categories that articulate about nothing — which is what stops a preset saved after such
    // a switch persisting a rig its own category has no joints for.
    const output = useOutputStore.getState();
    const mode = resolveMode(category, output.output.directionalMode);
    const rigMode = resolveRigMode(category, output.output.rigMode);
    if (
      mode !== output.output.directionalMode ||
      rigMode !== output.output.rigMode ||
      output.output.sheetIndex !== 0
    ) {
      output.setOutputConfig({ ...output.output, directionalMode: mode, rigMode, sheetIndex: 0 });
    }
  },

  setField: (key, value) => {
    set((state) => ({ subject: { ...state.subject, [key]: value } }));
  },

  setSubject: (category, subject) => {
    set({ category, subject });
  },

  randomizeSubject: () => {
    const { fields } = CATEGORY_OPTIONS[get().category];
    const subject = { ...get().subject };
    for (const field of fields) {
      const choice = field.options[Math.floor(Math.random() * field.options.length)];
      // A field with an empty pool keeps its current value rather than being blanked. No pool in
      // `src/constants/categories/` is empty, but `noUncheckedIndexedAccess` is right to ask.
      if (choice !== undefined) subject[field.key] = choice;
    }
    set({ subject });
  },

  resetSubject: () => {
    set({ subject: defaultSubjectFor(get().category) });
  },
}));
