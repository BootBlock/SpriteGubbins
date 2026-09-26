import { useEffect, useId, useRef, useState } from 'react';
import { SPRITE_ASSIGNMENT_TOOLTIPS } from '../../constants/spriteAssignment.ts';
import { Tooltip } from '../common/Tooltip.tsx';

interface SpriteJoinFieldProps {
  /** The sprite this row is about, counting from one — the one number it may not join. */
  readonly ordinal: number;
  /** The sprite it is joined to now, counting from one, or `null` while the reader has named none. */
  readonly target: number | null;
  /** How many sprites the sheet holds, which is the highest number there is to join. */
  readonly count: number;
  /**
   * Whether the reader has just chosen to join and named no partner yet — which takes focus to the
   * field as it appears, so the number is the next thing typed.
   */
  readonly pending: boolean;
  /** Called with a sprite's number each time what is typed names another sprite on the sheet. */
  readonly onJoin: (target: number) => void;
  /** Called when focus leaves the field, which ends a join that is still waiting for its partner. */
  readonly onLeave: () => void;
}

/**
 * Which sprite a join is to, typed as the number its chip in the preview shows.
 *
 * **A number rather than a list of partners**, because a list is `n − 1` options in every row that
 * shows one, and the list this replaced froze the tab on a large sheet: see `spriteChoice`. The
 * number is also what the reader already has — they are looking at two chips on the artwork — and
 * typing `47` beats scrolling a list of 511.
 *
 * **Not `NumberField`, because that field is bound to the stored number and has no draft.** A
 * keystroke it refuses snaps the input back, so on sprite 1 of fifteen, typing the `1` of `15` is
 * refused as a self-join and the `5` never has anything to follow. Here what is typed is kept as a
 * draft until the field loses focus, each draft that names another sprite is committed at once, and
 * one that does not says why beneath the field rather than silently reverting.
 */
export function SpriteJoinField({ ordinal, target, count, pending, onJoin, onLeave }: SpriteJoinFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const refusalId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const label = `Sprite ${String(ordinal)} joined to`;
  // An empty draft is a reader between keystrokes, not a mistake to report.
  const refusal = draft === null || draft.trim() === '' ? null : joinRefusal(draft, ordinal, count);

  // Only as the field appears for a join just chosen. A field already showing a join that holds is
  // one the reader tabs to, and taking focus to it on a re-render would steal it from wherever they
  // had gone.
  useEffect(() => {
    if (pending) input.current?.focus();
  }, [pending]);

  return (
    // Left as a whole rather than per element, so a move to the field's own ⓘ does not end the join
    // the reader is asking about.
    <div
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        // The draft is dropped on the way out, so the field goes back to the join that holds — which
        // is the last number it accepted, or empty where it has accepted none.
        setDraft(null);
        onLeave();
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-ink-muted">
          {label}
        </label>
        <Tooltip text={SPRITE_ASSIGNMENT_TOOLTIPS.joinTarget} hint={label} />
      </div>

      <input
        ref={input}
        id={inputId}
        type="number"
        inputMode="numeric"
        min={1}
        max={count}
        step={1}
        value={draft ?? (target === null ? '' : String(target))}
        aria-invalid={refusal !== null}
        aria-describedby={refusal === null ? undefined : refusalId}
        onChange={(event) => {
          const entered = event.target.value;
          setDraft(entered);
          if (entered.trim() !== '' && joinRefusal(entered, ordinal, count) === null) onJoin(Number(entered));
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent aria-invalid:border-rose"
      />

      {refusal !== null && (
        <p id={refusalId} className="mt-1 text-xs text-rose">
          {refusal}
        </p>
      )}
    </div>
  );
}

/** Why `entered` names no sprite this one can join, or `null` where it names one. */
function joinRefusal(entered: string, ordinal: number, count: number): string | null {
  const target = Number(entered);
  if (!Number.isInteger(target) || target < 1 || target > count) {
    return `This sheet has sprites 1 to ${String(count)}.`;
  }
  return target === ordinal ? 'A sprite cannot join itself.' : null;
}
