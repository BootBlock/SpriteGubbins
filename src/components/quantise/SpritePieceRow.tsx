import { useEffect, useRef } from 'react';
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
import { Badge } from '../common/Badge.tsx';
import { SelectField } from '../common/SelectField.tsx';

interface SpritePieceRowProps {
  /** This sprite and what became of it, as `resolveAssignment` reported it. */
  readonly sprite: AssignedSprite;
  /** Its place in the sheet's reading order, counting from one, as every other surface numbers it. */
  readonly ordinal: number;
  /** What the download will write this sprite's piece as, or `null` where it is left out. */
  readonly writtenAs: string | null;
  /** The studio's component names, which are the only names a sprite may be given. */
  readonly inventory: readonly string[];
  /** Every other sprite on the sheet, so this one can be joined to any of them. */
  readonly others: readonly { readonly ordinal: number; readonly sprite: AssignedSprite }[];
  /** Whether this is the sprite the reader last clicked in the preview. */
  readonly selected: boolean;
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
  writtenAs,
  inventory,
  others,
  selected,
}: SpritePieceRowProps) {
  const decide = useSpriteAssignmentStore((state) => state.decide);
  const row = useRef<HTMLDivElement>(null);

  // Selection is made in the *other* column — the reader clicks a sprite on the preview — so the row
  // it names may be well outside the panel's scrolled view. Scrolling it into view is what makes the
  // two halves one control surface rather than two lists that happen to agree.
  //
  // `nearest` rather than `center`, so a row already on screen does not jump under the reader; and
  // no focus is taken, because the click that caused this was in another column and moving focus
  // away from it would strand a keyboard user who had merely tabbed to the preview.
  useEffect(() => {
    if (selected) row.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div
      ref={row}
      className={`rounded-xl border p-2.5 transition-colors duration-390 ${
        selected ? 'border-accent bg-accent-soft/10' : 'border-foundry-700 bg-foundry-950/40'
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{ordinal}</Badge>
        {writtenAs === null ? (
          <Badge tone="attention">Left out</Badge>
        ) : (
          <span className="truncate font-mono text-2xs text-ink-faint">{writtenAs}</span>
        )}
      </div>

      {/* The `max-w-md` wrapper every select in this column sits in, so one does not stretch the
          width of a stacked panel — see `tests/quantise-column-width.test.ts`, which measures 448px
          against the label budget and has six pixels of headroom. */}
      <div className="max-w-md">
        <SelectField
          label={`Sprite ${String(ordinal)}`}
          tooltip={SPRITE_ASSIGNMENT_TOOLTIPS.sprite}
          value={spriteChoiceOf(sprite.decision)}
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
            if (decision !== undefined) decide(sprite.pin, decision);
          }}
        />
      </div>
    </div>
  );
}
