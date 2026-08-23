import {
  IDENTITY_CAPTURE_UNAVAILABLE,
  IDENTITY_KEY_SURVIVAL_TOLERANCE,
} from '../constants/identityCapture.ts';
import { KEY_OFFER_BORDER_SHARE } from '../constants/keyOffer.ts';
import type {
  BackgroundKeying,
  ColorReduction,
  ImportedImage,
  PixelGrid,
  QuantiseResult,
  QuantiseSettings,
  Rgba,
} from '../types/quantiser.ts';
import { borderKeyShare } from './borderKeyShare.ts';
import { sameKeying, sameReduction } from './quantiseSettings.ts';

/** Everything the studio can see of the Quantise tab, which is what decides whether it may read it. */
export interface QuantisedSheetOffer {
  /** The sheet the tab holds, or `null` if it holds none. */
  readonly source: ImportedImage | null;
  /** The scale in force, from `gridInForce` — `null` means the tab is showing no result. */
  readonly grid: PixelGrid | null;
  /** The latest transform that produced a sheet, and the settings it was computed at. */
  readonly settled: { readonly settings: QuantiseSettings; readonly result: QuantiseResult } | null;
  /** Whether the tab's most recent reply was a failure, which is a different empty from the others. */
  readonly failed: boolean;
  /** The keying in force now, from `keyingInForce`. */
  readonly keying: BackgroundKeying | null;
  /** The colour reduction in force now, from `colorPlanFor`. */
  readonly reduction: ColorReduction | null;
  /** The studio's background key as a colour, or `null` where it names none. */
  readonly studioKey: Rgba | null;
}

/**
 * Whether the identity lock may read the sheet the Quantise tab is holding, and which image that is.
 *
 * `READY` carries an {@link ImportedImage} rather than a bare `ImageData` because the capture names
 * the sheet in its confirmation, and the name belongs to the file the reader dropped rather than to
 * the transform of it. `UNAVAILABLE` carries the sentence rather than a code, because each of the
 * states is resolved by a different control on a different panel and the reason is the only thing
 * that says which.
 */
export type QuantisedSheetCapture =
  | { readonly kind: 'READY'; readonly sheet: ImportedImage }
  | { readonly kind: 'UNAVAILABLE'; readonly reason: string };

/**
 * The quantised result, offered to the identity lock — or the reason it cannot be.
 *
 * **It is the result that is offered, never the sheet that was dropped**, and that is the first of
 * the two decisions this function exists to hold in one place. The palette segment states what the
 * accepted sheet is *made of*, and a generator's return is made of a resampler's noise: measured on
 * `test_sprites/armour.png` at a grid of 4 and 32 colours, the six colours read off the raw file are
 * `#F503F8`, `#185B23`, `#000000`, `#AB8D4E`, `#BDA15E`, `#FFFFFF` — two shades of one gold, and a
 * near-magenta the exact key match does not catch. Read off the quantised result of the same sheet,
 * keyed at `DEFAULT_KEY_TOLERANCE`, they are `#000000`, `#196125`, `#12461A`, `#8E743C`, `#AB8D4E`,
 * `#E7C07B`: the colours the reader settled, which are also the colours the palette lock will snap
 * the next sheet onto. One statement, twice, rather than a prompt and a pipeline describing the same
 * series differently. (Those twelve are a *sample*, not a calibration — the palette a budget picks
 * moves with the budget, so a figure re-read at another setting is a different reading rather than a
 * contradiction. What is pinned across the whole corpus is the qualitative half, in
 * `tests/identity-palette-key.test.ts`.)
 *
 * **A result that still carries its background key is refused**, which is the second decision, and it
 * is taken by **measuring the result** rather than by reading the settings it was computed at. Asking
 * "did the keying pass run?" is the version that looks sufficient and is not: the ladder's `0` rung is
 * a run that removes only the exact key, and a studio key naming a colour the generator did not use is
 * a run that removes nothing at all. In both the pass ran, and in both the field is still there —
 * where `identityPalette` excludes the key by exact RGB, deliberately, so it misses it and the lock is
 * written with the background leading it. `borderKeyShare` asks the sheet instead, at the widest rung
 * the keying control offers rather than at the reader's own: see
 * {@link IDENTITY_KEY_SURVIVAL_TOLERANCE} for why those must differ, and for the measurement that
 * shows the two answers are 1.000 and 0.000 across all eight reference sheets. Nothing is removed
 * here — the tolerant pass belongs to the Quantise tab, where the preview shows what it took out — so
 * the button names that control instead.
 *
 * **A result computed before the studio moved is refused too.** The tab is unmounted while the studio
 * is on screen, so changing the background key or the colour budget there cannot re-run the transform:
 * the answer in the store stays, describing a question nobody is asking any more. Comparing it against
 * the keying and the reduction in force is what stops the lock being written from it — and the two
 * comparisons are `quantiseSettings.ts`'s own, the same ones the tab uses to decide whether it is
 * still waiting.
 *
 * `studioKey` is the one input with no honest answer available: `TRANSPARENT` names no colour, so
 * there is nothing to measure a surviving field against, and the sheet is taken at its word. That is
 * the same exposure the file route has and this cannot close it — a sheet whose studio key says
 * `TRANSPARENT` and whose pixels say magenta writes the magenta into the lock, from either route.
 *
 * Pure, which is what lets every state be asserted without a store or a canvas.
 */
export function quantisedSheetCapture(offer: QuantisedSheetOffer): QuantisedSheetCapture {
  const { source, grid, settled, failed, keying, reduction, studioKey } = offer;
  const unavailable = (reason: string): QuantisedSheetCapture => ({ kind: 'UNAVAILABLE', reason });

  if (source === null) return unavailable(IDENTITY_CAPTURE_UNAVAILABLE.noSheet);
  // Ahead of the grid, because it is the more specific finding: a transform that failed did so at a
  // scale that was in force, and telling the reader to put one in force would send them looking for
  // a control that is already set.
  if (settled === null && failed) return unavailable(IDENTITY_CAPTURE_UNAVAILABLE.failed);
  if (grid === null || settled === null) return unavailable(IDENTITY_CAPTURE_UNAVAILABLE.noResult);

  if (!sameKeying(settled.settings.key, keying) || !sameReduction(settled.settings.reduction, reduction)) {
    return unavailable(IDENTITY_CAPTURE_UNAVAILABLE.stale);
  }

  if (
    studioKey !== null &&
    borderKeyShare(settled.result.image, studioKey, IDENTITY_KEY_SURVIVAL_TOLERANCE) >= KEY_OFFER_BORDER_SHARE
  ) {
    return unavailable(IDENTITY_CAPTURE_UNAVAILABLE.keyStillOn);
  }

  return { kind: 'READY', sheet: { name: source.name, image: settled.result.image } };
}
