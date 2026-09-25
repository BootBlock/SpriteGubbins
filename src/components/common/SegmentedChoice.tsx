import { useId } from 'react';

interface SegmentedChoiceProps<T extends string | number> {
  /**
   * The row's accessible name.
   *
   * The buttons are one control, not a handful of unrelated actions that happen to sit together, and
   * without a name on the group a screen reader announces "8×, pressed" with nothing to say what
   * quantity is at 8. The visible label beside the row is what sighted users read; this is its
   * counterpart.
   */
  readonly label: string;
  readonly values: readonly T[];
  readonly value: T;
  /** What each value reads as on its button — `4` as `4×`, or `0` as the word it actually means. */
  readonly format: (value: T) => string;
  readonly onChange: (value: T) => void;
  /**
   * Values that cannot be chosen right now, and the sentence that says why.
   *
   * One reason for the whole set rather than one per value, because the one caller that needs this
   * withholds four values for the same reason, and four copies of one sentence under a row of pills
   * would read as four problems.
   */
  readonly unavailable?: { readonly values: readonly T[]; readonly reason: string } | undefined;
}

/**
 * One value chosen from a small fixed set, as a row of pills.
 *
 * Seven controls in the Quantise tab are this — the preview layout, the preview magnification, the
 * heatmap scale, the keying tolerance, the edge hardening, and the download's magnification and
 * format. Most are a
 * handful of stepped numbers where a slider would be the obvious choice and the wrong one —
 * every one of them re-runs work proportional to the whole image, and a drag would spend a recompute
 * per pointer move on a sheet that may be sixteen megapixels. Stepped values reach the same range at
 * one recompute per click.
 *
 * Extracted rather than written twice: the second copy is where the `aria-pressed` goes missing, and
 * that attribute is doing more than it looks — `index.css`'s forced-colours block keys the selected
 * state off it, so a row that conveys "current" with a fill alone conveys nothing at all to a user in
 * that mode.
 *
 * The selected pill is the view's colour, painted the way `TabSwitcher` paints its own: a *selection*
 * is solid `bg-tab`, where an *action* is the translucent, outlined `action-tab`. Keeping those two
 * apart is what stops "the zoom is at 4×" and "press this to download" reading as the same offer.
 * Every call site is in the Quantise tab, so this used to be the one indigo control in a jade panel.
 *
 * **The pills carry no guidance card of their own**, and that is the same call `ComboBox` makes about
 * its options: a pill is one *value* of a setting, not a control in its own right, and the setting is
 * explained by the ⓘ beside the label each call site puts above this row. Ten cards saying "this is
 * 4×" would be ten places for the explanation of one thing to drift apart.
 *
 * **Generic over the value, because a rung is not always a number.** The preview's layout choice is
 * one of three named modes, and it is the same control in every respect that matters — a small fixed
 * set, one of them current, each reachable in a click. Writing a second pill row for it is where the
 * `aria-pressed` above goes missing.
 *
 * **An unavailable pill says why, and stays where it is.** It is `aria-disabled` rather than
 * `disabled`, the call `CheckboxField` makes, so a keyboard user can still reach it and hear the
 * reason it points at; the click is ignored here instead. A pill that took a press and changed
 * nothing would be stored and replayed later, which is the defect this exists to prevent (#395).
 */
export function SegmentedChoice<T extends string | number>({
  label,
  values,
  value,
  format,
  onChange,
  unavailable,
}: SegmentedChoiceProps<T>) {
  const reasonId = useId();
  const blocked = (option: T) => unavailable?.values.includes(option) === true;
  const anyBlocked = values.some(blocked);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {values.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          aria-disabled={blocked(option)}
          aria-describedby={blocked(option) ? reasonId : undefined}
          onClick={() => {
            if (!blocked(option)) onChange(option);
          }}
          className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${pillTone(
            option === value,
            blocked(option),
          )}`}
        >
          {format(option)}
        </button>
      ))}
      {/* Inside the group, on a line of its own under the pills, so the reason is read as part of
          the control it explains wherever the caller places the row. */}
      {anyBlocked && (
        <p id={reasonId} className="basis-full text-xs text-ink-faint">
          {unavailable?.reason}
        </p>
      )}
    </div>
  );
}

/**
 * The selected label is near-black, not ink, for the reason `TabSwitcher` gives at length: every stop
 * on the wheel is a *light* colour, so ink on one is two light tones a shade apart (~1.8:1), where
 * near-black measures 8.7:1 at the wheel's worst stop. An unavailable pill takes no hover, which
 * would offer a press it is going to ignore.
 */
function pillTone(selected: boolean, blocked: boolean): string {
  if (selected) return 'bg-tab text-foundry-950';
  if (blocked) return 'cursor-not-allowed bg-foundry-700 text-ink-faint opacity-50';
  return 'bg-foundry-700 text-ink-faint hover:bg-foundry-600 hover:text-ink';
}
