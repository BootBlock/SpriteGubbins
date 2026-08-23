import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useIdentityPaletteCapture } from '../../hooks/useIdentityPaletteCapture.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseAnswerStore } from '../../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { quantisedSheetCapture } from '../../utils/quantisedSheetCapture.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * The second way into the identity lock: the sheet the Quantise tab is already holding.
 *
 * **The moment this exists for is the one the workflow is most fragile at.** A batch is generated one
 * sheet at a time, and the procedure is to run sheet one, clean it in the Quantise tab, lock the
 * identity off it, and only then run the remaining seven. So there is always a sheet the reader has
 * just accepted, and it is always the one in that tab — while the picker beside this button asked
 * them to find the same file again on disk and hand it to the studio a second time. Two things went
 * wrong from there and neither reported itself: the wrong attempt out of a folder of three, or the
 * generator's own return in place of the cleaned one.
 *
 * The picker stays, and is not a fallback: a reader locking an identity off a sheet from last week
 * has nothing in the tab at all.
 *
 * **The button is disabled rather than hidden** in each of the three states that has nothing to read
 * — see `quantisedSheetCapture` for what they are and which control resolves each. A route that
 * appears only once the other tab is in the right state is a route nobody discovers, and this one
 * exists to be found at the moment the reader would otherwise reach for the file picker.
 *
 * It reads the two quantise stores directly rather than being handed anything, because there is
 * nothing between here and them: `App` renders this inside the Studio tab, and the tab that owns
 * those stores is unmounted at the time.
 */
export function QuantisedSheetCaptureButton() {
  const source = useQuantiseStore((state) => state.source);
  const succeeded = useQuantiseAnswerStore((state) => state.succeeded);
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  const capture = useIdentityPaletteCapture();

  // The result and the keying it was computed at come off the one answer, which is what makes the
  // keying question decidable: it asks what was done to *this* image, not where the tab's dial
  // happens to stand now.
  const offer = quantisedSheetCapture(
    source,
    succeeded?.result ?? null,
    succeeded?.settings.key ?? null,
    BACKGROUND_KEY_COLORS[backgroundKey],
  );

  return (
    <ControlTooltip
      className="relative inline-flex"
      hint="Use the quantised sheet"
      // The finding after the guidance, as `GeneratorSiteLink` does it: the sentence explaining what
      // the control is for is the same in every state, and only the reason it cannot run right now
      // changes.
      text={
        offer.kind === 'READY'
          ? STUDIO_ACTION_TOOLTIPS.readPaletteFromQuantise
          : `${STUDIO_ACTION_TOOLTIPS.readPaletteFromQuantise} ${offer.reason}`
      }
    >
      <button
        type="button"
        disabled={offer.kind !== 'READY'}
        onClick={() => {
          if (offer.kind === 'READY') capture(offer.sheet);
        }}
        className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
      >
        Use the quantised sheet
      </button>
    </ControlTooltip>
  );
}
