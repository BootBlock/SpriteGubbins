import { useCallback, useState } from 'react';
import { customPaletteRequests } from '../stores/customPaletteRequests.ts';
import type { CustomPalette } from '../types/customPalette.ts';
import type { ImportedImage } from '../types/quantiser.ts';
import { fileStem } from '../utils/fileStem.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';
import type { RequestTicket } from '../utils/requestSequence.ts';
import { readPaletteOffThread } from '../workers/paletteReadSession.ts';
import { useImageFile } from './useImageFile.ts';

/**
 * The picture route into the custom palette: decode it, read its colours, and hold it with the
 * offer to reduce it where it states too many.
 *
 * **Both readings run on a thread of their own**, through `paletteReadSession`, because the picture
 * is usually a whole sheet: counting its colours on the tab's thread froze it for 9.5 seconds at the
 * largest sheet admitted, and reducing them for 8.8 more. Each read takes its own ticket from
 * `customPaletteRequests`, so a paste, a later file or Clear retires it and ends its thread.
 *
 * Split from `useCustomPaletteIntake`, which owns the gate every route ends in and hands it here as
 * `pin`, and the problems list every route reports into.
 */

/**
 * An image that states more colours than a palette can carry, kept while the offer stands.
 *
 * No count: the reading stops at the first colour past the ceiling, because the full count of a
 * sheet is the expensive part and the refusal does not need it.
 */
export interface OversizedImage {
  readonly image: ImageData;
  /** The file's name without its extension, as the palette would have been called. */
  readonly name: string;
}

/** What the picture route gives the intake. */
interface CustomPaletteImage {
  readonly oversized: OversizedImage | null;
  /** Whether the refused image is being reduced right now, which takes seconds on a large sheet. */
  readonly reducing: boolean;
  readonly acceptImage: (file: File | null | undefined) => void;
  readonly reduceOversized: () => void;
  /** Withdraw the offer, because the reader has since done something else to the palette. */
  readonly dismissOversized: () => void;
}

export function useCustomPaletteImage(
  pin: (candidate: CustomPalette, read: string) => void,
  setProblems: (problems: readonly string[]) => void,
): CustomPaletteImage {
  const [oversized, setOversized] = useState<OversizedImage | null>(null);
  // The reduction's own ticket rather than a flag, so a reduction that settles after a later one
  // began cannot clear the later one's state.
  const [reduction, setReduction] = useState<RequestTicket | null>(null);

  const readImage = useCallback(
    ({ name, image }: ImportedImage) => {
      // A ticket of its own, since the decode's has landed: a paste or Clear while the colours are
      // being read retires this read and ends its thread.
      const current = customPaletteRequests.begin();
      readPaletteOffThread({ kind: 'swatch', image, max: MAX_PALETTE_ENTRIES }, current.signal).then(
        (entries) => {
          if (!current()) return;
          setProblems([]);
          if (entries === null) {
            setOversized({ image, name: fileStem(name) });
            return;
          }
          setOversized(null);
          pin({ name: fileStem(name), entries }, name);
        },
        (error: unknown) => {
          if (!current()) return;
          setOversized(null);
          setProblems([`${name} could not be read (${describe(error)}), so the palette is unchanged.`]);
        },
      );
    },
    [pin, setProblems],
  );

  const acceptImage = useImageFile(readImage, customPaletteRequests);

  const reduceOversized = useCallback(() => {
    if (oversized === null || reduction !== null) return;
    const { image, name } = oversized;
    const current = customPaletteRequests.begin();
    setReduction(() => current);
    readPaletteOffThread({ kind: 'reduce', image, max: MAX_PALETTE_ENTRIES }, current.signal)
      .then(
        (entries) => {
          if (!current()) return;
          // Cleared, since a failed attempt before this one left its line saying nothing was pinned.
          setProblems([]);
          setOversized(null);
          pin({ name, entries }, `${name}, reduced`);
        },
        (error: unknown) => {
          // The offer stays, so the reader can try again once whatever stopped it has passed.
          if (!current()) return;
          setProblems([`${name} could not be reduced (${describe(error)}), so the palette is unchanged.`]);
        },
      )
      .finally(() => {
        setReduction((running) => (running === current ? null : running));
      });
  }, [oversized, reduction, pin, setProblems]);

  const dismissOversized = useCallback(() => {
    setOversized(null);
  }, []);

  return { oversized, reducing: reduction !== null, acceptImage, reduceOversized, dismissOversized };
}

/** A thrown value as a clause, since the panel shows it. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
