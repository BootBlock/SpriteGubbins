import type { Ref } from 'react';
import { SPRITE_ASSIGNMENT_TOOLTIPS } from '../../constants/spriteAssignment.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import type { AssignedSprite } from '../../types/spriteAssignment.ts';
import {
  joinChoice,
  LEAVE_OUT_CHOICE,
  nameChoice,
  READING_ORDER_CHOICE,
  spriteChoiceOf,
  spriteDecisionOf,
} from '../../utils/spriteChoice.ts';
import { spriteLabel } from '../../utils/spriteLabel.ts';
import { Badge } from '../common/Badge.tsx';
import { SelectField } from '../common/SelectField.tsx';

interface SpritePieceRowProps {
  /** This sprite and what became of it, as `resolveAssignment` reported it. */
  readonly sprite: AssignedSprite;
  /** Its place in the sheet's reading order, counting from one, as every other surface numbers it. */
  readonly ordinal: number;
  /** What this sprite's piece will be written as, or `null` where it is in no piece to be written. */
  readonly pieceName: string | null;
  /** The studio's component names, which are the only names a sprite may be given. */
  readonly inventory: readonly string[];
  /** Every other sprite on the sheet, so this one can be joined to any of them. */
  readonly others: readonly { readonly ordinal: number; readonly sprite: AssignedSprite }[];
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
  others,
  selected,
  ref,
}: SpritePieceRowProps) {
  const decide = useSpriteAssignmentStore((state) => state.decide);

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
          this control offers is an inventory slug or `Join to sprite 15` — and the row's chrome is
          what makes fifteen of these readable as separate things, so it stays. Stated here rather
          than left as a clean-looking citation of a guarantee that does not cover it. */}
      <div className="max-w-md">
        <SelectField
          label={`Sprite ${String(ordinal)}`}
          tooltip={SPRITE_ASSIGNMENT_TOOLTIPS.sprite}
          // Built from where the join *resolved to*, not from the pin the decision was filed under.
          // The two differ the moment a dial re-cuts the partner's box: the join still holds, because
          // the old point is still inside the new box, but a value spelled from that old point
          // matches no option — and a controlled `<select>` with an unmatched value shows its first
          // option, so the row would read “Reading order” over a join the download was applying.
          value={
            sprite.joinTarget === null
              ? spriteChoiceOf(sprite.decision)
              : (joinValueFor(sprite.joinTarget, others) ?? READING_ORDER_CHOICE)
          }
          choices={[
            { value: READING_ORDER_CHOICE, label: 'Reading order' },
            ...inventory.map((name) => ({ value: nameChoice(name), label: name })),
            { value: LEAVE_OUT_CHOICE, label: 'Leave out' },
            ...others.map((other) => ({
              value: joinChoice(other.sprite.pin),
              label: `Join to sprite ${String(other.ordinal)}`,
            })),
          ]}
          onChange={(choice) => {
            const decision = spriteDecisionOf(choice);
            // `undefined` is a value the select never offered, so there is nothing to record. It
            // cannot be reached through the UI — `SelectField` resolves a choice back to its own
            // value before calling — and refusing it keeps that true if that ever changes.
            //
            // **Filed under `decidedAt` where this sprite already holds a decision**, so changing
            // one's mind replaces it rather than adding a second edit the resolver then drops. See
            // `AssignedSprite.decidedAt`, which is where the two pins come apart.
            if (decision !== undefined) decide(sprite.decidedAt ?? sprite.pin, decision);
          }}
        />
      </div>
    </div>
  );
}

/** The option value naming the sprite at `ordinal`, or `null` where this row does not offer it. */
function joinValueFor(
  ordinal: number,
  others: readonly { readonly ordinal: number; readonly sprite: AssignedSprite }[],
): string | null {
  const other = others.find((candidate) => candidate.ordinal === ordinal);
  return other === undefined ? null : joinChoice(other.sprite.pin);
}
