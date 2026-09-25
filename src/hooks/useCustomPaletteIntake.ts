import { useCallback, useState } from 'react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import type { CustomPalette } from '../types/customPalette.ts';
import type { ImportedImage } from '../types/quantiser.ts';
import { fileStem } from '../utils/fileStem.ts';
import { imagePalette, reduceImagePalette } from '../utils/imagePalette.ts';
import { parseCustomPalette } from '../utils/parseCustomPalette.ts';
import { parsePaletteText } from '../utils/parsePaletteText.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';
import { useImageFile } from './useImageFile.ts';

/**
 * The three ways a palette of the reader's own gets into the studio, and what each one reports.
 *
 * A hook rather than a function on the panel because every route ends in the same three steps —
 * read the colours, put them through the one gate, say what happened — and a second copy of them is
 * where the routes would come to disagree about an empty file or the ceiling. It is the shape
 * `useIdentityPaletteCapture` takes for the same reason.
 *
 * **An image over the ceiling is refused and held, not truncated.** A sheet dropped where a swatch
 * was meant is the likely way to get here, and quietly keeping a palette’s worth of its thousands of colours would pin a
 * palette nobody chose. So the count is reported and the picture is kept just long enough to offer
 * the one thing that would make it a palette: reducing it, deliberately, through the same quantiser
 * the Quantise tab uses.
 *
 * Impure, so `src/hooks/` rather than `src/utils/`: it decodes files and writes to a store. The
 * reading of each form is pure and is tested without a DOM.
 */

/** An image that states more colours than a palette can carry, kept while the offer stands. */
export interface OversizedImage {
  readonly image: ImageData;
  /** The file's name without its extension, as the palette would have been called. */
  readonly name: string;
  readonly colors: number;
}

/** What the panel renders and calls. */
export interface CustomPaletteIntake {
  /** What the last file or paste could not read, at most a few lines and then a count of the rest. */
  readonly problems: readonly string[];
  /** The refused image and its count, or `null` where nothing has been refused. */
  readonly oversized: OversizedImage | null;
  readonly acceptFile: (file: File | null | undefined) => void;
  readonly acceptPaste: (text: string) => void;
  readonly reduceOversized: () => void;
  /** Rename the palette already loaded, leaving its colours exactly as they are. */
  readonly rename: (name: string) => void;
  readonly clear: () => void;
}

export function useCustomPaletteIntake(): CustomPaletteIntake {
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const [problems, setProblems] = useState<readonly string[]>([]);
  const [oversized, setOversized] = useState<OversizedImage | null>(null);

  /**
   * The one way colours reach the configuration, so no route can pin something another would refuse.
   * A candidate the gate returns `null` for is one nothing usable was read from, and saying so is
   * better than replacing a good palette with an empty claim.
   *
   * **No notification.** Every other reader of a file in this app raises one because the reader's
   * attention is elsewhere by the time it lands; here the panel that called this is on screen, shows
   * the colours it just took and counts them, and a toast saying the same thing over the top of it
   * would be the second report of one event.
   */
  const pin = useCallback(
    (candidate: CustomPalette, read: string) => {
      const parsed = parseCustomPalette(candidate);
      if (parsed === null) {
        // Added to what the reading already reported rather than replacing it: a file of three
        // unreadable lines has both things to say, and which lines they were is the more useful.
        setProblems((reported) => [
          ...reported,
          `Nothing in ${read} read as a colour, so the palette is unchanged.`,
        ]);
        return;
      }

      setOutputField('customPalette', parsed);
    },
    [setOutputField],
  );

  const readImage = useCallback(
    ({ name, image }: ImportedImage) => {
      const reading = imagePalette(image, MAX_PALETTE_ENTRIES);
      setProblems([]);

      if (reading.entries === null) {
        setOversized({ image, name: fileStem(name), colors: reading.colors });
        return;
      }

      setOversized(null);
      pin({ name: fileStem(name), entries: reading.entries }, name);
    },
    [pin],
  );

  const acceptImage = useImageFile(readImage);

  const readText = useCallback(
    (text: string, fallbackName: string, read: string) => {
      const reading = parsePaletteText(text, fallbackName);
      setOversized(null);
      setProblems(reading.problems);

      // Past the ceiling the gate answers `null`, and the count is what makes that actionable: a
      // list this long is a file of something else, and there is no image here to offer to reduce.
      if (reading.entries.length > MAX_PALETTE_ENTRIES) {
        setProblems([
          ...reading.problems,
          `${read} states ${String(reading.entries.length)} colours, and a palette holds at most ${String(MAX_PALETTE_ENTRIES)}.`,
        ]);
        return;
      }

      // A file that states nothing at all goes through the gate rather than round it, so it is
      // reported. A blank text file and a `.gpl` with nothing under its header both read as no
      // colours and no faulty lines, and returning early on them left the panel showing no change
      // whatever — the reader could not tell the file had been read.
      pin(
        {
          // A name the reader typed stands until something names the palette again. A paste states
          // no name and is re-read on every keystroke, so taking its empty name would wipe out what
          // they typed the moment they added a colour to the list.
          name:
            reading.name === '' ? (useOutputStore.getState().output.customPalette?.name ?? '') : reading.name,
          entries: reading.entries,
        },
        read,
      );
    },
    [pin],
  );

  const acceptFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;

      // Routed on what the file is rather than on which control it arrived through, because one
      // chooser and one drop target take all three forms. A picture is decoded; everything else is
      // read as text, and a file that is neither says so through its own reading rather than here.
      if (file.type.startsWith('image/') || /\.(?:png|gif|webp|bmp|jpe?g)$/i.test(file.name)) {
        acceptImage(file);
        return;
      }

      void file
        .text()
        .then((text) => {
          readText(text, fileStem(file.name), file.name);
        })
        .catch(() => {
          setProblems([`${file.name} could not be read, so the palette is unchanged.`]);
        });
    },
    [acceptImage, readText],
  );

  const acceptPaste = useCallback(
    (text: string) => {
      // An emptied box is the reader clearing what they pasted, not a palette of no colours, so it
      // reports nothing. The palette already pinned stays until something replaces it.
      if (text.trim() === '') {
        setProblems([]);
        return;
      }
      readText(text, '', 'the pasted list');
    },
    [readText],
  );

  const reduceOversized = useCallback(() => {
    if (oversized === null) return;
    const entries = reduceImagePalette(oversized.image, MAX_PALETTE_ENTRIES);
    setOversized(null);
    pin({ name: oversized.name, entries }, `${oversized.name}, reduced`);
  }, [oversized, pin]);

  /**
   * The name alone, so every write to the field goes through this hook.
   *
   * It does **not** go through the gate, and that is the division rather than an omission: the gate
   * decides which *colours* may be pinned, and a name the reader is typing is not a colour. Trimming
   * or defaulting it here would be a control that fights back — the trailing space of "Dusk " would
   * vanish before "Harbour" could follow it. The length is held by the field's own `maxLength`, and
   * `pinnedPalette` is where a palette with no name is given one.
   */
  const rename = useCallback(
    (name: string) => {
      const loaded = useOutputStore.getState().output.customPalette;
      if (loaded === null) return;
      setOutputField('customPalette', { ...loaded, name });
    },
    [setOutputField],
  );

  const clear = useCallback(() => {
    setOutputField('customPalette', null);
    setProblems([]);
    setOversized(null);
  }, [setOutputField]);

  return { problems, oversized, acceptFile, acceptPaste, reduceOversized, rename, clear };
}
