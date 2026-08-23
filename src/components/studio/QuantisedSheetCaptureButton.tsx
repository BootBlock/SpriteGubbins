import { useMemo } from 'react';
import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useIdentityPaletteCapture } from '../../hooks/useIdentityPaletteCapture.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseAnswerStore } from '../../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { gridInForce } from '../../utils/gridInForce.ts';
import { keyingInForce } from '../../utils/keyingInForce.ts';
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
 * **The button is disabled rather than hidden** in each of the five states that has nothing worth
 * reading — see `quantisedSheetCapture` for what they are and which control resolves each. A route
 * that appears only once the other tab is in the right state is a route nobody discovers, and this
 * one exists to be found at the moment the reader would otherwise reach for the file picker.
 *
 * **It rebuilds what the tab is asking for rather than being handed it**, because `App` unmounts that
 * tab on navigation and there is nothing to hand it over. Every part of that is built from the shared
 * derivation the tab itself uses — `gridInForce`, `keyingInForce`, `colorPlanFor` — so the two cannot
 * come to different conclusions about the state the reader left the tab in.
 */
export function QuantisedSheetCaptureButton() {
  const source = useQuantiseStore((state) => state.source);
  const gridOverride = useQuantiseStore((state) => state.gridOverride);
  const keyingEnabled = useQuantiseStore((state) => state.keyingEnabled);
  const keyTolerance = useQuantiseStore((state) => state.keyTolerance);
  const lockedPalette = useQuantiseStore((state) => state.lockedPalette);
  const paletteSnap = useQuantiseStore((state) => state.paletteSnap);
  const survey = useQuantiseAnswerStore((state) => state.survey);
  const attempt = useQuantiseAnswerStore((state) => state.attempt);
  const succeeded = useQuantiseAnswerStore((state) => state.succeeded);
  const backgroundKey = useOutputStore((state) => state.output.backgroundKey);
  const palette = useOutputStore((state) => state.output.palette);
  const paletteLimit = useOutputStore((state) => state.output.paletteLimit);
  const capture = useIdentityPaletteCapture();

  const studioKey = BACKGROUND_KEY_COLORS[backgroundKey];

  // Memoised because the last of the checks walks the result's border, which is a few thousand pixels
  // — cheap for a press, and not something to repeat on every render of the panel this sits in. It is
  // the same reading, at the same cost, that `QuantiseTab` memoises to decide whether to offer keying.
  const offer = useMemo(
    () =>
      quantisedSheetCapture({
        source,
        grid: gridInForce(gridOverride, survey?.kind === 'facts' ? survey.facts : null),
        settled: succeeded,
        failed: attempt?.kind === 'failed',
        keying: keyingInForce(keyingEnabled, studioKey, keyTolerance),
        reduction: colorPlanFor(palette, paletteLimit, lockedPalette, paletteSnap).reduction,
        studioKey,
      }),
    [
      source,
      gridOverride,
      survey,
      succeeded,
      attempt,
      keyingEnabled,
      studioKey,
      keyTolerance,
      palette,
      paletteLimit,
      lockedPalette,
      paletteSnap,
    ],
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
