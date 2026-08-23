import { useCallback } from 'react';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { ImportedImage } from '../types/quantiser.ts';
import { withPaletteSegment } from '../utils/identityDigest.ts';
import { identityPalette } from '../utils/identityPalette.ts';
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
 * Impure, so `src/hooks/` rather than `src/utils/`: it reads a store and raises a notification.
 * `identityPalette` underneath it is the pure half and is where the choice of colours is tested.
 */
export function useIdentityPaletteCapture(): (sheet: ImportedImage) => void {
  const showToast = useShowToast();

  return useCallback(
    ({ name, image }: ImportedImage) => {
      // Read at call time, not at render time. A file route awaits `createImageBitmap`, and the
      // lock's own text field sits directly above the control — so a value captured when the file was
      // chosen would discard whatever the user typed while the image was still decoding, and would
      // key the palette against a background the prompt no longer states.
      const { backgroundKey, identityLock } = useOutputStore.getState().output;

      const palette = identityPalette(image, BACKGROUND_KEY_COLORS[backgroundKey]);

      // A sheet with nothing but its key field leaves the lock alone rather than clearing its
      // palette. A generation that came back blank is the likeliest way to get here, and silently
      // deleting a good palette because a *failed* sheet was read is a worse outcome than doing
      // nothing.
      if (palette.length === 0) {
        showToast(`${name} has nothing on it but its background key — the identity lock is unchanged`);
        return;
      }

      useOutputStore.getState().setOutputField('identityLock', withPaletteSegment(identityLock, palette));
      showToast(
        `Read ${String(palette.length)} ${palette.length === 1 ? 'colour' : 'colours'} from ${name} into the identity lock`,
      );
    },
    [showToast],
  );
}
