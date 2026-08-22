import { create } from 'zustand';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { StudioHistory, StudioPosition } from '../types/studioHistory.ts';
import type { SubjectCategory, SubjectDefinition, SubjectFieldKey } from '../types/subject.ts';
import { resolveOutputForCategory } from '../utils/resolveOutputForCategory.ts';
import {
  currentStudioPosition,
  openStudioHistory,
  recordStudio,
  redoStudio,
  undoStudio,
} from '../utils/studioHistory.ts';
import { useOutputStore } from './useOutputStore.ts';

/**
 * What is being drawn: the category and the sixteen answers that describe the subject.
 *
 * Deliberately holds no compiled prompt, word count or token estimate. All three are functions of
 * this state and the output configuration, so they are derived where they are displayed — mirroring
 * them into a store would be the same "syncing derived state" defect the specification bans, only
 * moved out of a component where the lint rules can no longer see it.
 *
 * It does hold the studio's undo stack, because the four acts that fill it are four of the methods
 * below — a stack kept anywhere else is one a new call site can forget to record into.
 */
export interface SubjectState {
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  /** Every position the studio has been in, and which of them it is at. */
  readonly history: StudioHistory;

  /** Switch category. Resets the subject: the field *pools* differ, so the answers cannot carry over. */
  setCategory(category: SubjectCategory): void;
  setField(key: SubjectFieldKey, value: string): void;
  /**
   * Replace the whole studio at once — what loading a preset, restoring a prompt and restoring a
   * session all do. The three parts are not separable.
   *
   * A subject only means anything against the category whose labels and pools it was written for, so
   * setting those in two steps would leave the store briefly describing a creature with a building's
   * answers. The output has to land inside the same act for a different reason: a load that happens
   * to leave the sixteen answers alone would otherwise record nothing while replacing every output
   * setting, which is the loss this stack exists to prevent. It arrives as a *write* rather than a
   * value because the callers want different halves — a preset keeps the reader's companion outputs,
   * where a history entry is the configuration that produced its prompt and takes the lot.
   */
  setStudio(category: SubjectCategory, subject: SubjectDefinition, writeOutput: () => void): void;
  /** Reroll every field from the current category's option pool. */
  randomizeSubject(): void;
  /** Back to the current category's defaults, without changing category. */
  resetSubject(): void;
  /**
   * Start the stack again at the position the studio is in now, recording nothing — what restoring
   * a saved session does. That position is the one the reader is *starting* from, and recording it
   * as a step would offer them an undo back to a default studio they never saw.
   */
  openStudio(): void;
  /** Step back to the position before the last act, subject and output settings together. */
  undoStudio(): void;
  /** Step forward into a position stepped back from. */
  redoStudio(): void;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  category: DEFAULT_PRESET.category,
  subject: DEFAULT_PRESET.subject,
  history: openStudioHistory({
    category: DEFAULT_PRESET.category,
    subject: DEFAULT_PRESET.subject,
    output: useOutputStore.getState().output,
  }),

  setCategory: (category) => {
    act(() => {
      set({ category, subject: defaultSubjectFor(category) });
      // A category switch is the one act that also invalidates the technical half;
      // `resolveOutputForCategory` settles the six claims a category can refuse. Written back only
      // where something moved, so a switch that decides nothing leaves that object alone.
      const store = useOutputStore.getState();
      const resolved = resolveOutputForCategory(category, store.output);
      if (resolved !== store.output) store.setOutputConfig(resolved);
    });
  },

  setField: (key, value) => {
    // Records nothing. A single field is reversible by typing the old value back, and a step per
    // keystroke is a stack nobody can get back through — see `types/studioHistory.ts`, which also
    // says why an edit made after an act is not lost by an undo despite never being recorded.
    set((state) => ({ subject: { ...state.subject, [key]: value } }));
  },

  setStudio: (category, subject, writeOutput) => {
    act(() => {
      set({ category, subject });
      writeOutput();
    });
  },

  randomizeSubject: () => {
    act(() => {
      const { fields } = CATEGORY_OPTIONS[get().category];
      const subject = { ...get().subject };
      for (const field of fields) {
        const choice = field.options[Math.floor(Math.random() * field.options.length)];
        // A field with an empty pool keeps its current value rather than being blanked. No pool in
        // `src/constants/categories/` is empty, but `noUncheckedIndexedAccess` is right to ask.
        if (choice !== undefined) subject[field.key] = choice;
      }
      set({ subject });
    });
  },

  resetSubject: () => {
    act(() => {
      set({ subject: defaultSubjectFor(get().category) });
    });
  },

  openStudio: () => {
    set({ history: openStudioHistory(livePosition()) });
  },

  undoStudio: () => {
    step(undoStudio(get().history, livePosition()));
  },

  redoStudio: () => {
    step(redoStudio(get().history, livePosition()));
  },
}));

/** The studio as it stands, across both stores — one entry's worth of state. */
function livePosition(): StudioPosition {
  const { category, subject } = useSubjectStore.getState();
  return { category, subject, output: useOutputStore.getState().output };
}

/**
 * Perform one of the acts that replaces the whole subject, with the position before it recorded.
 *
 * A wrapper round all four rather than two lines inside each: what makes this stack trustworthy is
 * that no route into the store discards sixteen answers without leaving a step behind, and a fifth
 * method added later is likelier to reach for a wrapper than to remember the two lines.
 */
function act(perform: () => void): void {
  const before = livePosition();
  perform();
  const { history } = useSubjectStore.getState();
  useSubjectStore.setState({ history: recordStudio(history, before, livePosition()) });
}

/**
 * Move the cursor, and put the studio back into the position it lands on.
 *
 * Written straight into both stores rather than through `setCategory`, which would re-resolve the
 * output against the category being restored and hand back a configuration nobody ever had. A
 * position on the stack is a studio that existed: it is replayed, never recomputed.
 */
function step(history: StudioHistory): void {
  const { category, subject, output } = currentStudioPosition(history);
  useSubjectStore.setState({ category, subject, history });
  useOutputStore.getState().setOutputConfig(output);
}
