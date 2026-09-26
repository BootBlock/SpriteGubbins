import { useState } from 'react';
import type { Ref } from 'react';
import { SPRITE_ASSIGNMENT_TOOLTIPS } from '../../constants/spriteAssignment.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import type { AssignedSprite } from '../../types/spriteAssignment.ts';
import {
  JOIN_CHOICE,
  LEAVE_OUT_CHOICE,
  nameChoice,
  READING_ORDER_CHOICE,
  spriteChoiceOf,
  spriteDecisionOf,
} from '../../utils/spriteChoice.ts';
import { spriteLabel } from '../../utils/spriteLabel.ts';
import { Badge } from '../common/Badge.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { SpriteJoinField } from './SpriteJoinField.tsx';

interface SpritePieceRowProps {
  /** This sprite and what became of it, as `resolveAssignment` reported it. */
  readonly sprite: AssignedSprite;
  /** Its place in the sheet's reading order, counting from one, as every other surface numbers it. */
  readonly ordinal: number;
  /** What this sprite's piece will be written as, or `null` where it is in no piece to be written. */
  readonly pieceName: string | null;
  /** The studio's component names, which are the only names a sprite may be given. */
  readonly inventory: readonly string[];
  /**
   * Every sprite on the sheet in reading order, this one included, so a join typed by number can be
   * pinned to the sprite that number names. The list's own array, passed whole to every row, so a
   * row costs nothing that grows with the sheet.
   */
  readonly sprites: readonly AssignedSprite[];
  /** Whether this is the sprite the reader last clicked in the preview. */
  readonly selected: boolean;
  /** Where the list reaches this row to scroll it into view, or `null` for every row it does not owe one. */
  readonly ref: Ref<HTMLDivElement>;
}

/**
 * One sprite in the list: what it is, what it will be written as, and the one control that changes
 * both.
 *
 * **One control, because the reader is making one choice.** Reading order, an inventory name, left
 * out, or joined to another sprite are four answers to a single question, and `SpriteDecision` holds
 * exactly one of them. Three controls would let a name and a join both be set and leave the app to
 * decide which to ignore — see `SPRITE_ASSIGNMENT_TOOLTIPS.sprite`, which explains all four to the
 * reader in one card.
 *
 * **A join asks one more thing — which sprite — and `SpriteJoinField` asks it**, shown only where
 * the answer is a join. The select offers a single join option rather than one per partner, which
 * put every other sprite in every row and made the list quadratic in the sheet: see `spriteChoice`.
 * Until a partner is typed the row holds no join, only a pending one, and **a pending join lasts
 * only while the reader is in the field**: choosing the option moves focus there, and leaving it
 * with no partner named ends it, so the select goes back to the decision in force. A pending join
 * left standing after the reader moved on would have the select say “join” over a name or a
 * leave-out the download is still applying — and over nothing at all once the choices were cleared.
 *
 * **A native `<select>` through `SelectField`**, as the app's other thirty-one closed choices are:
 * it is keyboard-operable and type-to-select, which is what makes a list this long usable at all —
 * typing the first letters of a component name reaches it without scrolling.
 *
 * The visible label carries the ordinal, so fifteen of these are fifteen distinct accessible names
 * rather than fifteen controls called “Sprite”, and no `nameQualifier` is needed. The badge beside it
 * states what the download will write, which is the same string the preview's own label shows.
 */
export function SpritePieceRow({
  sprite,
  ordinal,
  pieceName,
  inventory,
  sprites,
  selected,
  ref,
}: SpritePieceRowProps) {
  const decide = useSpriteAssignmentStore((state) => state.decide);
  const [joining, setJoining] = useState(false);
  // **Filed under `decidedAt` where this sprite already holds a decision**, so changing one's mind
  // replaces it rather than adding a second edit the resolver then drops. See
  // `AssignedSprite.decidedAt`, which is where the two pins come apart.
  const filedAt = sprite.decidedAt ?? sprite.pin;

  return (
    // `aria-current` rather than colour alone: the border and tint are all a sighted reader gets, a
    // forced palette erases both, and the `index.css` rule that repaints a current selection in
    // `Highlight` keys on this attribute. `true` rather than `page`, since this is one item of a set.
    <div
      ref={ref}
      aria-current={selected ? 'true' : undefined}
      className={`rounded-xl border p-2.5 transition-colors duration-390 ${
        selected ? 'border-accent bg-accent-soft/10' : 'border-foundry-700 bg-foundry-950/40'
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{ordinal}</Badge>
        {/* The same words the preview's chip carries, from the same derivation — see `spriteLabel`,
            which is why a joined sprite says what it was joined to rather than repeating the piece's
            name. The two sit side by side and a reader compares them. */}
        {sprite.piece === null ? (
          <Badge tone="attention">Left out</Badge>
        ) : (
          <span className="truncate font-mono text-2xs text-ink-faint">{spriteLabel(sprite, pieceName)}</span>
        )}
      </div>

      {/* The `max-w-md` wrapper every select in this column sits in, so one does not stretch the
          width of a stacked panel — `tests/quantise-column-width.test.ts` measures that 448px cap
          against the 442px label budget.

          **That measurement does not reach this select, and no measurement does.** Every other
          budgeted select sits directly in its panel; this one sits inside a row that spends 22px of
          its own on a border and `p-2.5` first, which the column derivation cannot see. So the
          control has ~420px where the budget asks 442. Nothing truncates today — the longest option
          this control offers is an inventory slug or `Join to another sprite` — and the row's chrome is
          what makes fifteen of these readable as separate things, so it stays. Stated here rather
          than left as a clean-looking citation of a guarantee that does not cover it. */}
      <div className="max-w-md">
        <SelectField
          label={`Sprite ${String(ordinal)}`}
          tooltip={SPRITE_ASSIGNMENT_TOOLTIPS.sprite}
          // A join shows as the one join option whichever sprite it names, and the resolver drops a
          // join whose partner a re-cut took away — so a `JOIN` decision here always has a
          // `joinTarget` for the field below to show.
          value={joining ? JOIN_CHOICE : spriteChoiceOf(sprite.decision)}
          choices={[
            { value: READING_ORDER_CHOICE, label: 'Reading order' },
            ...inventory.map((name) => ({ value: nameChoice(name), label: name })),
            { value: LEAVE_OUT_CHOICE, label: 'Leave out' },
            // Not offered on a sheet of one: there is nothing to join to.
            ...(sprites.length > 1 ? [{ value: JOIN_CHOICE, label: 'Join to another sprite' }] : []),
          ]}
          onChange={(choice) => {
            setJoining(choice === JOIN_CHOICE);
            const decision = spriteDecisionOf(choice);
            // `undefined` is the join, which waits for its partner, or a value the select never
            // offered, which there is nothing to record for — `SelectField` resolves a choice back to
            // its own value before calling, and refusing it keeps that true if that ever changes.
            if (decision !== undefined) decide(filedAt, decision);
          }}
        />
      </div>

      {(joining || sprite.decision?.kind === 'JOIN') && (
        <div className="mt-2 max-w-md">
          <SpriteJoinField
            ordinal={ordinal}
            target={sprite.joinTarget}
            count={sprites.length}
            pending={joining}
            onJoin={(target) => {
              const partner = sprites[target - 1];
              if (partner === undefined) return;
              setJoining(false);
              decide(filedAt, { kind: 'JOIN', to: partner.pin });
            }}
            onLeave={() => {
              setJoining(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
