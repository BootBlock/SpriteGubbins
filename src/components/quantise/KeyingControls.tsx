import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { KEY_TOLERANCES, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { BackgroundKeying } from '../../types/quantiser.ts';
import { toHex } from '../../utils/imageData.ts';
import { Badge } from '../common/Badge.tsx';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { ColorSwatch } from '../common/ColorSwatch.tsx';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface KeyingControlsProps {
  /**
   * The keying the pipeline is actually running, or `null` where it is skipping the pass.
   *
   * Taken from the tab rather than re-derived here, and that is the point: "keying is on" is a rule
   * over two separate settings — the user's toggle, and whether the studio's key names a colour at
   * all — and deriving it in both places is how the panel comes to claim a pass that the pipeline
   * skipped. One derivation, in the component that feeds `quantiseImage`, and this one displays it.
   */
  readonly keying: BackgroundKeying | null;
  /**
   * The share of the sheet the key removed, or `null` while there is no result to report one.
   *
   * The one value here that is not a store read: it comes out of the transform, which the tab runs.
   * Reported because it is the question the preview cannot answer — the sheet that prompted this
   * feature had a *visibly* magenta field that was almost nowhere `#FF00FF`, and at 1× in a 24rem
   * frame a field that was missed looks exactly like a field that was keyed.
   */
  readonly keyedShare: number | null;
}

/**
 * Whether the background key becomes transparency, and how far from it a pixel may sit.
 *
 * **The key colour is not a control here**, for the same reason the colour count is not: the sheet
 * was generated against a prompt that already stated it, so a second copy on this tab would be a
 * second source of truth for a value the generation was made against. It is read from the studio and
 * shown, and the paragraph says where to change it.
 *
 * The tolerance *is* a control, because it describes **this returned raster** rather than the prompt —
 * how far this particular generation drifted from the colour it was asked for. That makes it the pixel
 * grid's sibling rather than the palette limit's, and it lives beside the grid in `useQuantiseStore`.
 */
export function KeyingControls({ keying, keyedShare }: KeyingControlsProps) {
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  const keyTolerance = useQuantiseStore((state) => state.keyTolerance);
  const setKeyingEnabled = useQuantiseStore((state) => state.setKeyingEnabled);
  const setKeyTolerance = useQuantiseStore((state) => state.setKeyTolerance);

  // Shown, not decided: the swatch and the reason below are about which key the *studio* names, which
  // is a different question from whether the pass runs. `TRANSPARENT` names no colour, so there is
  // nothing to match — and that is not the same state as the user simply not having asked for it. The
  // stored toggle is left alone through it, so switching the studio's key back restores the choice
  // rather than silently discarding it.
  const keyColor = BACKGROUND_KEY_COLORS[backgroundKey];
  const hex = keyColor === null ? null : toHex(keyColor);
  const isKeying = keying !== null;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-450 hover:border-tab/40">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <CheckboxField
          label="Key the background to transparency"
          tooltip={QUANTISE_TOOLTIPS.keying}
          checked={isKeying}
          disabledReason={
            hex === null
              ? `The studio's background key is ${backgroundKey}, so the space between components is already alpha — there is no colour to match.`
              : ''
          }
          onChange={setKeyingEnabled}
        />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">Key colour</p>
          <p className="flex items-center gap-1.5 font-mono text-xs text-ink-faint">
            {hex !== null && <ColorSwatch colorText={hex} />}
            {backgroundKey}
            {hex !== null && ` — ${hex}`}
          </p>
        </div>
      </div>

      {isKeying && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            Tolerance
            <Tooltip text={QUANTISE_TOOLTIPS.keyTolerance} hint="Tolerance" />
          </span>
          <SegmentedChoice
            label="Key colour tolerance"
            values={KEY_TOLERANCES}
            value={keyTolerance}
            // `0` reads as the thing it means rather than as a number beside five other numbers: it is
            // the setting that keys an exact match and nothing else, including no fringe.
            format={(value) => (value === 0 ? 'exact' : String(value))}
            onChange={setKeyTolerance}
          />
          {keyedShare !== null &&
            (keyedShare === 0 ? (
              <Badge tone="attention">Nothing matched the key colour</Badge>
            ) : (
              <Badge tone="valid">{(keyedShare * 100).toFixed(1)}% of the sheet keyed</Badge>
            ))}
        </div>
      )}

      {isKeying && (
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          The colour above is the studio&rsquo;s own background key, because the prompt that produced this
          sheet already stated it — change it there rather than here. A generated field is almost never
          exactly the colour that was asked for, which is what the tolerance is for: raise it until the field
          goes, and stop before the sprite does. Above <span className="font-mono">exact</span> it also erodes
          the pixel touching the field, which is what removes the halo an anti-aliased edge leaves behind.
        </p>
      )}
    </section>
  );
}
