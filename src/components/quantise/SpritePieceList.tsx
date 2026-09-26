import { useEffect, useRef } from 'react';
import { SPRITE_ASSIGNMENT_GUIDANCE } from '../../constants/spriteAssignment.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import type { SpriteAssignment } from '../../types/spriteAssignment.ts';
import { samePin } from '../../utils/spritePin.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { SpritePieceRow } from './SpritePieceRow.tsx';
import { Button } from '../common/Button.tsx';

interface SpritePieceListProps {
  /** What the sheet's sprites came to, as `useSpriteAssignment` resolved it. */
  readonly assignment: SpriteAssignment;
  /** The studio's component names — empty where it is composing no sheet. */
  readonly inventory: readonly string[];
  /** Whether a newer result is on its way, so that {@link assignment} describes the previous one. */
  readonly busy: boolean;
}

/**
 * Every sprite on the sheet, what the download will call it, and the control that changes that.
 *
 * **The panel half of the feature; the preview's labels are the other.** Both read one
 * `SpriteAssignment` from `useSpriteAssignment`, so what a chip says on the artwork and what a row
 * says in the list cannot be two answers. Clicking a sprite on the preview selects it, and the list
 * scrolls the row for it into view.
 *
 * **It lists sprites, not pieces**, and that is the distinction the whole panel turns on. A piece is
 * what the download writes and can be two sprites joined; a sprite is what the reader can see a ring
 * around and click. A list of pieces would have no row for the second half of a join, so there would
 * be no way to undo one.
 *
 * **While a newer result is on its way the list stays mounted**, as the preview beside it keeps
 * the previous result's chips. What it *reports* about that sheet — how the naming stands, what it
 * lost, what to do about it — is withdrawn, as the panel's badges above it are, because a finding
 * about the sheet before the last dial move reads as one about the sheet now. The rows stay,
 * dimmed and `inert`: a press against them would pin a decision to a sheet that may already be gone.
 * They were once withdrawn too, and every result then mounted the whole list again — on a sheet of
 * hundreds of sprites that rebuild was most of what moving a dial cost.
 *
 * The list is not capped and does not scroll on its own, as the app's other row lists are not: each
 * row holds a focusable control, so a box with its own scrollbar would add a tab stop that reaches
 * nothing the tab order does not already reach.
 */
export function SpritePieceList({ assignment, inventory, busy }: SpritePieceListProps) {
  const selected = useSpriteAssignmentStore((state) => state.selected);
  const reveal = useSpriteAssignmentStore((state) => state.reveal);
  const revealed = useSpriteAssignmentStore((state) => state.revealed);
  const forget = useSpriteAssignmentStore((state) => state.forget);
  const edited = useSpriteAssignmentStore((state) => state.edits.length > 0);
  const owed = useRef<HTMLDivElement>(null);

  // Selection is made in the *other* column — the reader clicks a sprite on the preview — so the row
  // it names may be well outside the panel's scrolled view. Scrolling it into view is what makes the
  // two halves one control surface rather than two lists that happen to agree.
  //
  // **On the click's request, never on `selected`**, which still names a row after a result lands
  // under a dial move, and would scroll the page back here each time — see
  // `SpriteAssignmentState.reveal`. The request is settled here, by the list, even where no row
  // holds its sprite: a request left standing would scroll the page the next time a dial brought
  // that sprite back, answering no click at all.
  //
  // `nearest` rather than `center`, so a row already on screen does not jump under the reader; and
  // no focus is taken, because the click that caused this was in another column and moving focus
  // away from it would strand a keyboard user who had merely tabbed to the preview.
  useEffect(() => {
    if (reveal === null) return;
    owed.current?.scrollIntoView({ block: 'nearest' });
    revealed();
  }, [reveal, revealed]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Which sprite is which</p>
        {!busy && (
          <Badge tone={assignment.naming === null ? 'attention' : 'valid'}>
            {namingLabel(assignment, inventory)}
          </Badge>
        )}
        {/* Only where something was actually dropped. A dial that re-cut the sheet has just thrown
            away work the reader did, and saying so is the difference between a feature that forgot
            and one that said what it forgot. */}
        {!busy && assignment.lost > 0 && (
          <Badge tone="attention">
            {assignment.lost === 1
              ? '1 choice no longer fits the sheet'
              : `${String(assignment.lost)} choices no longer fit the sheet`}
          </Badge>
        )}
      </div>

      <div
        inert={busy}
        aria-busy={busy}
        className={`space-y-3 transition-opacity duration-390 ${busy ? 'opacity-50' : ''}`}
      >
        <div className="space-y-2">
          {assignment.sprites.map((sprite, index) => (
            <SpritePieceRow
              key={`${String(sprite.pin.x)},${String(sprite.pin.y)}`}
              sprite={sprite}
              ordinal={index + 1}
              pieceName={sprite.piece === null ? null : (assignment.pieces[sprite.piece]?.name ?? null)}
              inventory={inventory}
              sprites={assignment.sprites}
              selected={selected !== null && samePin(selected, sprite.pin)}
              ref={reveal !== null && samePin(reveal, sprite.pin) ? owed : null}
            />
          ))}
        </div>

        {!busy && (
          <p className="text-xs leading-relaxed text-ink-muted">{guidanceFor(assignment, inventory)}</p>
        )}

        {/* Only once there is something to take back, because a button that would do nothing is
            worse than no button: it invites a press and reports nothing when it lands. */}
        {edited && (
          <ControlTooltip hint="Clear the choices" text={QUANTISE_ACTION_TOOLTIPS.clearAssignments}>
            <Button variant="view" size="md" onClick={forget}>
              Clear the choices
            </Button>
          </ControlTooltip>
        )}
      </div>
    </div>
  );
}

/**
 * How the naming stands, in the few words a chip has room for.
 *
 * The route is named in the two good states rather than only the count, because “named” by counting
 * and “named” because a person checked are different warrants — the same distinction the manifest
 * now records and the download's own toast reports.
 */
function namingLabel(assignment: SpriteAssignment, inventory: readonly string[]): string {
  if (assignment.naming === 'ASSIGNED') return 'named as you assigned';
  if (assignment.naming === 'READING_ORDER') return 'named in reading order';
  if (inventory.length === 0) return 'numbered — the studio names no sheet';
  return 'numbered — the pieces do not match the inventory';
}

/** Which paragraph the state calls for — see `SPRITE_ASSIGNMENT_GUIDANCE`, which holds all six. */
function guidanceFor(assignment: SpriteAssignment, inventory: readonly string[]): string {
  if (inventory.length === 0) return SPRITE_ASSIGNMENT_GUIDANCE.noInventory;
  if (assignment.naming === 'ASSIGNED') return SPRITE_ASSIGNMENT_GUIDANCE.assigned;
  if (assignment.naming === 'READING_ORDER') return SPRITE_ASSIGNMENT_GUIDANCE.readingOrder;
  // Unnamed, and the three causes call for opposite things from the reader. The count is checked
  // first because a sheet that is both miscounted and double-named cannot be fixed by renaming: the
  // piece that would free the duplicate name has nowhere to go until the counts agree.
  if (assignment.pieces.length > inventory.length) return SPRITE_ASSIGNMENT_GUIDANCE.over;
  if (assignment.pieces.length < inventory.length) return SPRITE_ASSIGNMENT_GUIDANCE.short;
  return SPRITE_ASSIGNMENT_GUIDANCE.duplicated;
}
