import { create } from 'zustand';
import type { SpriteDecision, SpriteEdit, SpritePin } from '../types/spriteAssignment.ts';
import { samePin } from '../utils/spritePin.ts';

/**
 * What the reader has said about the sprites on the sheet in hand, and which one they are looking at.
 *
 * **A store rather than the tab's own state, because two columns are editing one answer.** The
 * preview labels sit in the sticky pane on the right and the controls that change them sit in the
 * panel column on the left, with `QuantiseWorkspace`'s grid and three components between them. The
 * selection is the same case one step further: clicking a sprite in the preview is how a reader says
 * which row of the panel they want, so it is a fact about the tab and not about either view.
 *
 * **Separate from `useQuantiseStore`, which holds dials.** A dial is a way of reading *any* sheet
 * from this generator — which is why the quantise presets save them and the undo stack steps through
 * them — and a decision that the third sprite is the left arm is true of exactly one image. Putting
 * one among the other would put it in a saved preset, where it would name the wrong piece of
 * somebody else's sheet.
 *
 * **Nothing here survives a change of sheet.** Both of the store actions that change the image —
 * `setSource` and `clear` — call {@link SpriteAssignmentState.forget} in the same breath, as they
 * already do for the worker's answers. A pin is a coordinate on one result, so a decision carried
 * over would land on whatever the next sheet happens to have drawn there.
 *
 * Nothing here is persisted, for the reason the tab's own state is not: the plan is explicit that no
 * image is written to the database, and a decision about a sheet that is not there describes nothing.
 */
export interface SpriteAssignmentState {
  /**
   * Every decision the reader has made, in the order they made them.
   *
   * A list rather than a map because the key is a point and a `Map` keyed by an object compares by
   * identity. Bounded by the sheet's own sprite count, so a scan is the right shape here — the
   * ceiling is `SCATTERED_SPRITE_CEILING` at 512.
   */
  readonly edits: readonly SpriteEdit[];
  /** The sprite the reader is working on, so the preview and the panel agree, or `null` for none. */
  readonly selected: SpritePin | null;
  /**
   * Say something about one sprite, or take back whatever was said — `null` is the reader choosing
   * reading order again.
   *
   * One action for all three decisions, because they are exclusive: a sprite that is joined to
   * another cannot also be left out, and a second call simply replaces the first.
   */
  decide(pin: SpritePin, decision: SpriteDecision | null): void;
  select(pin: SpritePin | null): void;
  /** Drop every decision — the button beside the list, and what a new sheet triggers. */
  forget(): void;
}

export const useSpriteAssignmentStore = create<SpriteAssignmentState>((set) => ({
  edits: [],
  selected: null,

  decide: (pin, decision) => {
    set((state) => {
      if (decision === null) {
        return { edits: state.edits.filter((edit) => !samePin(edit.pin, pin)) };
      }
      // Replaced in place rather than re-appended. The list's order is the order the reader first
      // spoke about each sprite, and `shapeSheet` breaks a tie by it — two decisions that a later
      // merge lands on one sprite, where the earlier keeps it. Changing one's mind about a name
      // should not quietly move that sprite to the back of the queue.
      const at = state.edits.findIndex((edit) => samePin(edit.pin, pin));
      if (at === -1) return { edits: [...state.edits, { pin, decision }] };
      return { edits: state.edits.map((edit, index) => (index === at ? { pin, decision } : edit)) };
    });
  },

  select: (selected) => {
    set({ selected });
  },

  forget: () => {
    set({ edits: [], selected: null });
  },
}));
