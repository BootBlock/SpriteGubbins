import { create } from 'zustand';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { CustomIconDraft, CustomIconRefusal } from '../types/customIconDraft.ts';
import type { IconRoster } from '../types/iconRoster.ts';
import type { StudioHistory, StudioPosition } from '../types/studioHistory.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import type { SubjectState } from '../types/subjectState.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { iconPickId } from '../utils/iconPickId.ts';
import { outputFollowingBase } from '../utils/outputFollowingBase.ts';
import { resolveOutputForSubject } from '../utils/resolveOutputForSubject.ts';
import { sheetIndexWithinSeries } from '../utils/sheetIndexWithinSeries.ts';
import { toggleIconPicks } from '../utils/toggleIconPicks.ts';
import { withCustomIcon } from '../utils/withCustomIcon.ts';
import {
  currentStudioPosition,
  openStudioHistory,
  recordStudio,
  redoStudio,
  undoStudio,
} from '../utils/studioHistory.ts';
import { useOutputStore } from './useOutputStore.ts';

/** The studio's subject, its icon roster and its undo stack — see {@link SubjectState}. */
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
      // Read before the write, because the subject being left is half of what settles a loaded rig
      // contract: a document loaded for a character is not a claim about a creature, however well
      // the creature's sheets would take a rig.
      const from = { category: get().category, subject: get().subject };
      const subject = defaultSubjectFor(category);
      set({ category, subject });
      // A category switch invalidates the most of the technical half; `resolveOutputForSubject`
      // settles the seven claims a category can refuse. Written back only where something moved, so
      // a switch that decides nothing leaves that object alone.
      const store = useOutputStore.getState();
      const resolved = resolveOutputForSubject(category, subject, store.output, from);
      if (resolved !== store.output) store.setOutputConfig(resolved);
    });
  },

  setField: (key, value) => {
    // Records nothing unless the edit moves the sheet. A field is reversible by typing the old value
    // back, and a step per keystroke is a stack nobody can get back through — see
    // `types/studioHistory.ts`, which also says why an edit made after an act is not lost by an undo
    // despite never being recorded. A base whose plans cannot draw the stored sheet is the exception:
    // it settles the mode, the rig and the sheet index, and typing the old base back returns the field
    // without returning those, so that edit is an act. It records only on the keystroke whose plans
    // move the output, never on the keystrokes between.
    const { category, subject } = get();
    const next = { ...subject, [key]: value };
    const output = outputFollowingBase(category, subject, next, useOutputStore.getState().output);
    if (output === null) {
      set({ subject: next });
      return;
    }
    act(() => {
      set({ subject: next });
      useOutputStore.getState().setOutputConfig(output);
    });
  },

  setStudio: (category, subject, writeOutput) => {
    act(() => {
      set({ category, subject });
      writeOutput();
    });
  },

  toggleIcons: (ids, on) => {
    const toggled = toggleIconPicks(get().subject.icons?.picks ?? [], ids, on, ICON_ROSTER_CAPACITY);
    writeRoster((roster) => ({ ...roster, picks: toggled.picks }));
    return get().subject.icons === undefined ? [] : toggled.refused;
  },

  clearIcons: () => {
    writeRoster((roster) => ({ ...roster, picks: [] }));
  },

  addCustomIcon: (draft) => saveCustomIcon(draft, null),

  updateCustomIcon: (id, draft) => saveCustomIcon(draft, id),

  removeCustomIcon: (id) => {
    writeRoster(({ look, picks }) => ({ look, picks: picks.filter((pick) => iconPickId(pick) !== id) }));
  },

  setIconLook: (look) => {
    if (get().subject.icons?.look !== look) writeRoster((roster) => ({ ...roster, look }));
  },

  randomizeSubject: () => {
    act(() => {
      const { category, subject: before } = get();
      const subject = { ...before };
      for (const field of CATEGORY_OPTIONS[category].fields) {
        const choice = field.options[Math.floor(Math.random() * field.options.length)];
        // A field with an empty pool keeps its current value rather than being blanked. No pool in
        // `src/constants/categories/` is empty, but `noUncheckedIndexedAccess` is right to ask.
        if (choice !== undefined) subject[field.key] = choice;
      }
      set({ subject });
      followBase(category, before, subject);
    });
  },

  resetSubject: () => {
    act(() => {
      const { category, subject: before } = get();
      const subject = defaultSubjectFor(category);
      set({ subject });
      followBase(category, before, subject);
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

/** Write {@link outputFollowingBase}'s answer, where it has one. */
function followBase(category: SubjectCategory, before: SubjectDefinition, after: SubjectDefinition): void {
  const { output, setOutputConfig } = useOutputStore.getState();
  const settled = outputFollowingBase(category, before, after, output);
  if (settled !== null) setOutputConfig(settled);
}

/**
 * Add or replace an entry of the reader's own once `checkCustomIcon` has passed it, or return why not.
 * A replacement equal to what it replaces records nothing, because `recordStudio` compares the rosters
 * by value.
 */
function saveCustomIcon(draft: CustomIconDraft, replacing: string | null): readonly CustomIconRefusal[] {
  const roster = useSubjectStore.getState().subject.icons;
  if (roster === undefined) return [];
  const { entry, refusals } = checkCustomIcon(draft, roster.picks, replacing);
  if (entry === null) return refusals;
  writeRoster(({ look, picks }) => ({ look, picks: withCustomIcon(picks, entry, replacing) }));
  return [];
}

/**
 * Put a changed roster on the subject as one act, with the sheet index pulled back inside the series it
 * now draws — a tick, a clear, a new look, or an entry of the reader's own added, changed or removed.
 *
 * Both stores move in the one act, so an undo restores the roster and the sheet the reader was on
 * together. A look leaves the series its length, so for one the index never moves.
 */
function writeRoster(change: (roster: IconRoster) => IconRoster): void {
  const { category, subject } = useSubjectStore.getState();
  if (subject.icons === undefined) return;
  const next = { ...subject, icons: change(subject.icons) };
  act(() => {
    useSubjectStore.setState({ subject: next });
    const { output, setOutputConfig } = useOutputStore.getState();
    const settled = sheetIndexWithinSeries(category, next, output);
    if (settled !== output) setOutputConfig(settled);
  });
}

/** The studio as it stands, across both stores — one entry's worth of state. */
function livePosition(): StudioPosition {
  const { category, subject } = useSubjectStore.getState();
  return { category, subject, output: useOutputStore.getState().output };
}

/**
 * Perform one of the acts an undo steps back over, with the position before it recorded.
 *
 * A wrapper round every one rather than two lines inside each: what makes this stack trustworthy is
 * that no route into the store discards what typing cannot bring back without leaving a step behind,
 * and a method added later is likelier to reach for a wrapper than to remember the two lines.
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
