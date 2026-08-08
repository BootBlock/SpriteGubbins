interface SegmentedChoiceProps {
  /**
   * The row's accessible name.
   *
   * The buttons are one control, not a handful of unrelated actions that happen to sit together, and
   * without a name on the group a screen reader announces "8×, pressed" with nothing to say what
   * quantity is at 8. The visible label beside the row is what sighted users read; this is its
   * counterpart.
   */
  readonly label: string;
  readonly values: readonly number[];
  readonly value: number;
  /** What each value reads as on its button — `4` as `4×`, or `0` as the word it actually means. */
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

/**
 * One value chosen from a small fixed set, as a row of pills.
 *
 * Two controls in the Quantise tab are this: the preview magnification and the keying tolerance. Both
 * are a handful of stepped numbers where a slider would be the obvious choice and the wrong one —
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
 * Both call sites are in the Quantise tab, so this used to be the one indigo control in a jade panel.
 */
export function SegmentedChoice({ label, values, value, format, onChange }: SegmentedChoiceProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {values.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => {
            onChange(option);
          }}
          // The selected label is near-black, not ink, for the reason `TabSwitcher` gives at length:
          // every stop on the wheel is a *light* colour, so ink on one is two light tones a shade
          // apart (~1.8:1), where near-black measures 8.7:1 at the wheel's worst stop.
          className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-colors ${
            option === value
              ? 'bg-tab text-foundry-950'
              : 'bg-foundry-700 text-ink-faint hover:bg-foundry-600 hover:text-ink'
          }`}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );
}
