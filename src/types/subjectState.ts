import type { CustomIconDraft, CustomIconRefusal } from './customIconDraft.ts';
import type { IconLook } from './iconRoster.ts';
import type { StudioHistory } from './studioHistory.ts';
import type { SubjectCategory, SubjectDefinition, SubjectFieldKey } from './subject.ts';

/**
 * What is being drawn: the category, the sixteen answers that describe the subject, and — for an icon
 * set — the roster of catalogue icons it asks for and the look they are drawn in.
 *
 * Deliberately holds no compiled prompt, word count or token estimate. All three are functions of
 * this state and the output configuration, so they are derived where they are displayed — mirroring
 * them into a store would be the same "syncing derived state" defect the specification bans, only
 * moved out of a component where the lint rules can no longer see it.
 *
 * It does hold the studio's undo stack, because the acts that fill it are the methods below — a stack
 * kept anywhere else is one a new call site can forget to record into.
 */
export interface SubjectState {
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  /** Every position the studio has been in, and which of them it is at. */
  readonly history: StudioHistory;

  /** Switch category. Resets the subject: the field *pools* differ, so the answers cannot carry over. */
  setCategory(category: SubjectCategory): void;
  /** Set one field. Recorded only where a new assembly base moves the sheet mode, the rig or the sheet. */
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
  /**
   * Tick or untick catalogue entries on the subject's icon roster, as one act an undo steps back over.
   *
   * The roster stays in catalogue order (`sortIconPicks`), and a tick that would take it past
   * `ICON_ROSTER_CAPACITY` components is refused entry by entry: the ids that did not fit are returned
   * so the caller can say so, and an empty list means every one was honoured. The sheet index is pulled
   * back inside the series the new roster draws in the same act. Does nothing on a subject with no
   * roster.
   */
  toggleIcons(ids: readonly string[], on: boolean): readonly string[];
  /**
   * Put an entry of the reader's own on the roster, as one act an undo steps back over.
   *
   * The draft passes `checkCustomIcon` first, against the roster as it stands, and a refused one changes
   * nothing: the refusals are returned for the form to show, and an empty list means it was added. It
   * sits at the end of its kind's shelves (`sortIconPicks`), and the sheet index is pulled back inside
   * the series in the same act. Refuses nothing and does nothing on a subject with no roster.
   */
  addCustomIcon(draft: CustomIconDraft): readonly CustomIconRefusal[];
  /**
   * Replace the reader's own entry `id` with a changed draft, as one act, measured as if the old entry
   * were gone — so it may keep its own slot name. It keeps its place unless its kind changes. Returns the
   * refusals as {@link addCustomIcon} does; a draft that changes nothing records nothing.
   */
  updateCustomIcon(id: string, draft: CustomIconDraft): readonly CustomIconRefusal[];
  /** Take the reader's own entry `id` off the roster, as one act an undo brings it back from. */
  removeCustomIcon(id: string): void;
  /** Untick every icon on the roster, as one act, leaving the overlay sheet alone in the series. */
  clearIcons(): void;
  /**
   * Draw the icon set in another look, as one act an undo steps back over.
   *
   * Every sheet of the series changes its wording and none changes its count, so the sheet index stays
   * where it is. Does nothing on a subject with no roster, or when the look is already in force.
   */
  setIconLook(look: IconLook): void;
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
