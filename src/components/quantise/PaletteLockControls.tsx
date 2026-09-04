import { PALETTE_SNAP_RANGE, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { PALETTE_LOCK_GUIDANCE } from '../../constants/paletteLock.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { RangeField } from '../common/RangeField.tsx';
import { LockedSwatches } from './LockedSwatches.tsx';

interface PaletteLockControlsProps {
  /**
   * The colours a lock would hold, or `null` while there is no result.
   *
   * The transform’s own reading rather than one taken here — `QuantiseResult.paletteEntries` says
   * why it is carried on the result, and it is the same list `PaletteExportControls` writes to a
   * file. Taking it as a prop is also what lets this panel decide whether a lock is *possible*
   * before the press: an empty list is a sheet the keying took whole, and a button that answered
   * that with silence is the failure this prop exists to make impossible.
   */
  readonly resultPalette: readonly Rgba[] | null;
  /** The dropped file's name, which is what the lock records the colours as coming from. */
  readonly sheetName: string;
  /**
   * The studio's own colour setting, which is what a lock taken now records.
   *
   * From the plan rather than read again from the studio, and `studioSetting` rather than `setting`:
   * with a lock already held the plan's `setting` is that lock's, so re-locking would stamp the new
   * palette with the name of the one it replaced. `ColorPlan` says why both are carried.
   */
  readonly studioSetting: string;
  /**
   * The studio setting the held lock is overriding, where the two have parted company.
   *
   * The transform's own answer rather than a comparison made here — `colorPlanFor` decides what
   * supersedes what, and a panel that decided it a second time could disagree with the pipeline
   * about which colours the sheet beside it was drawn in.
   */
  readonly superseded: string | null;
  /**
   * Whether a newer result is on its way, which is what {@link resultPalette} may be lagging behind.
   *
   * Locking is refused while it is, and that is not tidiness: the preview deliberately keeps the
   * previous sheet up while the next is computed, so a reader who moves a dial and presses Lock in
   * the same breath would hold the colours of the sheet *before* the dial moved — and the tab would
   * then re-quantise with the lock in force and the merge exempted, arriving at a third result that
   * matches neither. Refused, the colours held are always the ones being looked at.
   */
  readonly busy: boolean;
}

/**
 * The palette held for a series of sheets: taking one off this result, and what happens to the next
 * sheet because of it.
 *
 * **The one colour control this tab owns.** Everything else about colour comes from the studio,
 * where the prompt stated it, and this panel says so rather than offering a second copy — but a
 * lock is not a property of the *prompt*: it is a decision about a returned raster, taken while
 * looking at it, exactly as the pixel grid and the keying tolerance are. Nothing in the studio can
 * express "these colours, the ones this sheet came back with", because they did not exist until the
 * generator produced them.
 *
 * A panel of its own rather than a row in `GridControls`, because it is the only control here whose
 * subject is the *series* rather than the sheet on screen — and because it has state to show that
 * no other control does: which colours are held, how many, and which sheet they came from.
 */
export function PaletteLockControls({
  resultPalette,
  sheetName,
  studioSetting,
  superseded,
  busy,
}: PaletteLockControlsProps) {
  const lock = useQuantiseStore((state) => state.lockedPalette);
  const snap = useQuantiseStore((state) => state.paletteSnap);
  const lockPalette = useQuantiseStore((state) => state.lockPalette);
  const unlockPalette = useQuantiseStore((state) => state.unlockPalette);
  const setPaletteSnap = useQuantiseStore((state) => state.setPaletteSnap);

  // A result with no colours in it is a sheet the keying took whole, and locking it would hold an
  // empty palette — see `applyLockedPalette`, which could only answer one by returning the next
  // sheet unchanged while this panel said a lock was held. It is a *third* reason the button is
  // shut, alongside no result and a recompute in flight, and it is named below rather than left to
  // the greyed-out button: a control that appears to do nothing is the worst outcome available.
  const emptySheet = resultPalette !== null && resultPalette.length === 0;
  const takeable = resultPalette !== null && resultPalette.length > 0 && !busy;

  const take = () => {
    // Everything `disabled` covers, so this arm is unreachable from a press and is here for the
    // type. The three conditions are one expression, deliberately: two spellings of when a lock may
    // be taken is how a button comes to offer a press its handler declines.
    if (!takeable) return;
    lockPalette({ entries: resultPalette, setting: studioSetting, sheetName });
  };

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Palette lock</p>
        {lock === null ? (
          <Badge tone="attention">No palette held</Badge>
        ) : (
          <Badge tone="valid">
            {lock.entries.length} {lock.entries.length === 1 ? 'entry' : 'entries'} held from {lock.sheetName}
          </Badge>
        )}

        <ControlTooltip
          className="relative ml-auto inline-flex"
          hint={lock === null ? 'Lock this palette' : 'Re-lock from this sheet'}
          text={lock === null ? QUANTISE_ACTION_TOOLTIPS.lockPalette : QUANTISE_ACTION_TOOLTIPS.relockPalette}
        >
          <button
            type="button"
            disabled={!takeable}
            onClick={take}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {lock === null ? 'Lock this palette' : 'Re-lock from this sheet'}
          </button>
        </ControlTooltip>

        {lock !== null && (
          <ControlTooltip hint="Unlock" text={QUANTISE_ACTION_TOOLTIPS.unlockPalette}>
            <button
              type="button"
              onClick={unlockPalette}
              className="rounded-lg border border-foundry-600 bg-foundry-700 px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-all duration-390 hover:bg-foundry-600 hover:text-ink active:scale-[0.98]"
            >
              Unlock
            </button>
          </ControlTooltip>
        )}
      </div>

      {lock !== null && (
        <>
          <LockedSwatches entries={lock.entries} />

          <div className="mt-4">
            <RangeField
              label="Snap distance"
              tooltip={QUANTISE_TOOLTIPS.paletteSnap}
              value={snap}
              min={PALETTE_SNAP_RANGE.min}
              max={PALETTE_SNAP_RANGE.max}
              step={PALETTE_SNAP_RANGE.step}
              format={(value) => (value === 0 ? 'off' : String(value))}
              onChange={setPaletteSnap}
            />
          </div>
        </>
      )}

      {/* Not a live region, deliberately: it is rendered only while it applies, and a `role` added
          to an element that was not in the document when its content changed announces nothing.
          What it reports is a studio setting the reader has just changed on another tab, so they
          arrive at this one and read it. */}
      {superseded !== null && (
        <p className="mt-3 text-xs leading-relaxed text-gold">
          {PALETTE_LOCK_GUIDANCE.superseded(superseded)}
        </p>
      )}

      {/* Not a live region either, and for a reason the notice above does not have: the tab already
          announces every settled result, colour count included, so a second announcement of the
          same fact would say `0 colours` twice. This is here for the reader who has looked at the
          shut button and wants to know what would open it. */}
      {emptySheet && (
        <p className="mt-3 text-xs leading-relaxed text-gold">{PALETTE_LOCK_GUIDANCE.noColours}</p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {lock === null ? PALETTE_LOCK_GUIDANCE.open : PALETTE_LOCK_GUIDANCE.held}
      </p>
    </section>
  );
}
