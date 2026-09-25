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
}

/**
 * Every sprite on the sheet, what the download will call it, and the control that changes that.
 *
 * **The panel half of the feature; the preview's labels are the other.** Both read one
 * `SpriteAssignment` from `useSpriteAssignment`, so what a chip says on the artwork and what a row
 * says in the list cannot be two answers. Clicking a sprite on the preview selects it, and the row
 * for it scrolls itself into view — see `SpritePieceRow`, which is where that happens.
 *
 * **It lists sprites, not pieces**, and that is the distinction the whole panel turns on. A piece is
 * what the download writes and can be two sprites joined; a sprite is what the reader can see a ring
 * around and click. A list of pieces would have no row for the second half of a join, so there would
 * be no way to undo one.
 *
 * The list is not capped and does not scroll on its own, as the app's other row lists are not: each
 * row holds a focusable control, so a box with its own scrollbar would add a tab stop that reaches
 * nothing the tab order does not already reach.
 */
export function SpritePieceList({ assignment, inventory }: SpritePieceListProps) {
  const selected = useSpriteAssignmentStore((state) => state.selected);
  const forget = useSpriteAssignmentStore((state) => state.forget);
  const edited = useSpriteAssignmentStore((state) => state.edits.length > 0);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Which sprite is which</p>
        <Badge tone={assignment.naming === null ? 'attention' : 'valid'}>
          {namingLabel(assignment, inventory)}
        </Badge>
        {/* Only where something was actually dropped. A dial that re-cut the sheet has just thrown
            away work the reader did, and saying so is the difference between a feature that forgot
            and one that said what it forgot. */}
        {assignment.lost > 0 && (
          <Badge tone="attention">
            {assignment.lost === 1
              ? '1 choice no longer fits the sheet'
              : `${String(assignment.lost)} choices no longer fit the sheet`}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {assignment.sprites.map((sprite, index) => (
          <SpritePieceRow
            key={`${String(sprite.pin.x)},${String(sprite.pin.y)}`}
            sprite={sprite}
            ordinal={index + 1}
            pieceName={sprite.piece === null ? null : (assignment.pieces[sprite.piece]?.name ?? null)}
            inventory={inventory}
            others={assignment.sprites.flatMap((other, at) =>
              at === index ? [] : [{ ordinal: at + 1, sprite: other }],
            )}
            selected={selected !== null && samePin(selected, sprite.pin)}
          />
        ))}
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">{guidanceFor(assignment, inventory)}</p>

      {/* Only once there is something to take back, because a button that would do nothing is worse
          than no button: it invites a press and reports nothing when it lands. */}
      {edited && (
        <ControlTooltip hint="Clear the choices" text={QUANTISE_ACTION_TOOLTIPS.clearAssignments}>
          <Button variant="view" size="md" onClick={forget}>
            Clear the choices
          </Button>
        </ControlTooltip>
      )}
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
