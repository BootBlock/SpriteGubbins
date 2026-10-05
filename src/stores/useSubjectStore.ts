import { create } from 'zustand';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { CustomIconDraft, CustomIconRefusal } from '../types/customIconDraft.ts';
import type { CustomIconEntry, IconRoster } from '../types/iconRoster.ts';
import type { OutputConfig } from '../types/output.ts';
import type { StudioHistory, StudioPosition } from '../types/studioHistory.ts';
import type { SubjectState } from '../types/subjectState.ts';
import { checkCustomIcon } from '../utils/checkCustomIcon.ts';
import { iconPickId } from '../utils/iconPickId.ts';
import { outputFollowingBase } from '../utils/outputFollowingBase.ts';
import { resolveOutputForSubject } from '../utils/resolveOutputForSubject.ts';
import { outputForReset } from '../utils/outputForReset.ts';
import { outputForRoster } from '../utils/outputForRoster.ts';
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
      // settles the claims a category can refuse. Written back only where something moved, so
      // a switch that decides nothing leaves that object alone.
      settleOutput((output) => resolveOutputForSubject(category, subject, output, from));
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

  addCustomIcon: (draft, library) => saveCustomIcon(draft, null, library),

  updateCustomIcon: (id, draft, library) => saveCustomIcon(draft, id, library),

  removeCustomIcon: (id) => {
    writeRoster((roster) => ({ ...roster, picks: roster.picks.filter((pick) => iconPickId(pick) !== id) }));
  },

  setIconLook: (look) => {
    if (get().subject.icons?.look !== look) writeRoster((roster) => ({ ...roster, look }));
  },

  setIconColourMode: (colourMode) => {
    if (get().subject.icons?.colourMode !== colourMode) writeRoster((roster) => ({ ...roster, colourMode }));
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
      settleOutput((output) => outputFollowingBase(category, before, subject, output));
    });
  },

  resetSubject: () => {
    act(() => {
      const { category, subject: before } = get();
      const subject = defaultSubjectFor(category);
      set({ subject });
      settleOutput((output) => outputForReset(category, before, subject, output));
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

/**
 * Write the output configuration `settle` answers with for the one in force, where it answers with a
 * different one: `resolveOutputForSubject` after a category switch, `outputFollowingBase` after a reroll,
 * `outputForReset` after a reset, and `outputForRoster` after a roster change. Each hands back the same
 * object, or `null`, for a change that decides nothing, and that writes nothing.
 */
function settleOutput(settle: (output: OutputConfig) => OutputConfig | null): void {
  const { output, setOutputConfig } = useOutputStore.getState();
  const settled = settle(output);
  if (settled !== null && settled !== output) setOutputConfig(settled);
}

/**
 * Add or replace an entry of the reader's own once `checkCustomIcon` has passed it against the roster
 * and `library`, or return why not. A replacement equal to what it replaces records nothing, because
 * `recordStudio` compares the rosters by value.
 */
function saveCustomIcon(
  draft: CustomIconDraft,
  replacing: string | null,
  library: readonly CustomIconEntry[],
): readonly CustomIconRefusal[] {
  const roster = useSubjectStore.getState().subject.icons;
  if (roster === undefined) return [];
  const { entry, refusals } = checkCustomIcon(draft, roster.picks, replacing, library);
  if (entry === null) return refusals;
  writeRoster((roster) => ({ ...roster, picks: withCustomIcon(roster.picks, entry, replacing) }));
  return [];
}

/**
 * Put a changed roster on the subject as one act, with the sheet index pulled back inside the series it
 * now draws and the background key and palette moved to ones the set can take — a tick, a clear, a new
 * look or colour mode, or an entry of the reader's own added, changed or removed.
 *
 * Both stores move in the one act, so an undo restores the roster, the sheet the reader was on, the key
 * and the palette together. A look or a colour mode leaves the series its length, so for one the index
 * never moves; only a tint mask moves the key, off `PURE_WHITE`, and the palette, onto `FREE`
 * (`outputForRoster`).
 */
function writeRoster(change: (roster: IconRoster) => IconRoster): void {
  const { category, subject } = useSubjectStore.getState();
  if (subject.icons === undefined) return;
  const next = { ...subject, icons: change(subject.icons) };
  act(() => {
    useSubjectStore.setState({ subject: next });
    settleOutput((output) => outputForRoster(category, subject, next, output));
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
