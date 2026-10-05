import { useCallback } from 'react';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { resolveBackgroundKey } from '../constants/backgroundKeysFor.ts';
import { identityPaletteRequests } from '../stores/identityPaletteRequests.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import type { ImportedImage } from '../types/quantiser.ts';
import { withPaletteSegment } from '../utils/identityDigest.ts';
import type { RequestTicket } from '../utils/requestSequence.ts';
import { readPaletteOffThread } from '../workers/paletteReadSession.ts';
import { useShowToast } from './useShowToast.ts';

/**
 * Read a sheet's colours into the identity lock's palette segment, and say what was read.
 *
 * A hook rather than a function on the component, because there are **two ways in** and one of them
 * is not a file: the picker and the drop target in `IdentityPaletteCapture`, and the button beside
 * them that takes the result already sitting in the Quantise tab. Both end in the same three steps —
 * measure, replace the segment, confirm — and a second copy of them is where the two routes would
 * come to disagree about the empty-sheet case or about which key they measured against.
 *
 * **The measuring runs on a thread of its own**, through `paletteReadSession`: it is the quantiser
 * over the whole sheet, 0.6 seconds at the largest sheet the tab admits, and on this thread that is
 * a frozen page.
 *
 * Impure, so `src/hooks/` rather than `src/utils/`: it reads a store and raises a notification.
 * `identityPalette` underneath it is the pure half and is where the choice of colours is tested.
 */
export function useIdentityPaletteCapture(): (sheet: ImportedImage) => void {
  const showToast = useShowToast();

  // A ticket of its own for every sheet, whichever route it came by: a later sheet, the button
  // beside the picker, or a wholesale write to the lock retires this one and ends its thread.
  return useCallback(
    (sheet: ImportedImage) => {
      measure(sheet, identityPaletteRequests.begin(), showToast);
    },
    [showToast],
  );
}

/**
 * Measure one sheet on its thread and write what it read into the lock, while `current` stands.
 *
 * Outside the hook so that it can call itself, which the re-measure below needs.
 */
function measure(sheet: ImportedImage, current: RequestTicket, showToast: (message: string) => void): void {
  // The key is read when the reading starts, and checked again when it lands — see below.
  const backgroundKey = keyInForce();
  const job = {
    kind: 'identity',
    image: sheet.image,
    backgroundKey: BACKGROUND_KEY_COLORS[backgroundKey],
  } as const;

  readPaletteOffThread(job, current.signal).then(
    (palette) => {
      if (!current()) return;
      // Read at landing, not at the start. The lock's own text field sits directly above the
      // control, so a value captured earlier would discard whatever the reader typed while the
      // sheet was decoding and being read — and a key changed meanwhile would leave a palette
      // measured against a background the prompt no longer states, so it is measured again.
      const { identityLock } = useOutputStore.getState().output;
      if (keyInForce() !== backgroundKey) {
        measure(sheet, current, showToast);
        return;
      }

      // A sheet with nothing but its key field leaves the lock alone rather than clearing its
      // palette. A generation that came back blank is the likeliest way to get here, and silently
      // deleting a good palette because a *failed* sheet was read is a worse outcome than doing
      // nothing.
      if (palette.length === 0) {
        showToast(`${sheet.name} has nothing on it but its background key — the identity lock is unchanged`);
        return;
      }

      useOutputStore.getState().setOutputField('identityLock', withPaletteSegment(identityLock, palette));
      showToast(
        `Read ${String(palette.length)} ${palette.length === 1 ? 'colour' : 'colours'} from ${sheet.name} into the identity lock`,
      );
    },
    (error: unknown) => {
      if (!current()) return;
      const reason = error instanceof Error ? error.message : String(error);
      showToast(`Could not read the colours of ${sheet.name} — ${reason}. The identity lock is unchanged`);
    },
  );
}

/**
 * The key the sheet is drawn on, resolved through the subject as `useResolvedBackgroundKey` resolves it
 * (`resolveBackgroundKey`), so a tint mask's sheet is measured against the key its prompt states rather
 * than a `PURE_WHITE` the mask has withdrawn. Read out of the stores, because `measure` runs outside a
 * render and again when a reading lands.
 */
function keyInForce(): BackgroundKey {
  return resolveBackgroundKey(
    useSubjectStore.getState().subject,
    useOutputStore.getState().output.backgroundKey,
  );
}
