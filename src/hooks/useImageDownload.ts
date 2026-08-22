import { useCallback } from 'react';
import { SHEET_FORMAT_FILES } from '../constants/sheetFormats.ts';
import { useSheetWriteStore } from '../stores/useSheetWriteStore.ts';
import { useUIStore } from '../stores/useUIStore.ts';
import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import type { ManifestSheet } from '../types/spriteManifest.ts';
import type { SheetFormat, WrittenSheet } from '../types/sheetFormat.ts';
import { writeSheetOffThread } from '../workers/sheetWriteSession.ts';
import { useFileSave } from './useFileSave.ts';

/**
 * Offering a quantised sheet back as a file, in whichever of the four formats was asked for.
 *
 * **The file is written by this app, not by a canvas.** `canvas.toBlob` can only produce truecolour,
 * so a sheet reduced to sixty-four colours arrived on disk as a 32-bit file that merely happened to
 * use sixty-four of them — the palette this tab's whole pipeline exists to produce was a claim in
 * the panel and absent from what the reader took away. What is downloaded now is a true indexed
 * PNG, an indexed Aseprite document with the sprites cut into frames, or a pack of one indexed PNG
 * per sprite — wherever the sheet's colours fit a palette — and a manifest, which carries the rects
 * rather than the pixels.
 *
 * **The write runs on a thread of its own**, because the canvas encoder it replaced was asynchronous
 * and these are a long synchronous walk over every byte — see `sheetWriteWorker.ts`, which magnifies
 * as well as writes so that neither pass lands in the click handler. That is also why
 * {@link ImageDownload.saving} exists: the press now has a duration a reader can see, so it has to
 * be one the control can show, and a second press during it would write the same file twice.
 */

/** What a press asks for: the sheet, how it is written, and what the frames are cut from. */
export interface SheetDownload {
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  /** The result at its own size; the magnification happens on the writer's thread. */
  readonly image: ImageData;
  readonly scale: number;
  readonly format: SheetFormat;
  /**
   * The sprites the segmentation found, which an Aseprite document is cut into frames along, a pack
   * is cut into files along, and a manifest states the rects of.
   *
   * Empty where the sheet held nothing to cut, and ignored by the PNG writer, which produces one
   * picture. Passed in every case rather than only for the formats that read it, so the press does
   * not have to know which formats care.
   */
  readonly boxes: readonly SpriteBox[];
  /** The duplicate reading over those sprites, which a manifest turns into links between them. */
  readonly duplicates: readonly SpriteDuplicateGroup[];
  /** One name per component the studio's prompt asks for, in the order section 4 lays them out. */
  readonly names: readonly string[];
  /** Which sheet of which deliverable the studio is composing, or `null` where it names none. */
  readonly sheet: ManifestSheet | null;
}

/** The press, and whether one is still being answered. */
export interface ImageDownload {
  readonly save: (download: SheetDownload) => void;
  readonly saving: boolean;
}

export function useImageDownload(): ImageDownload {
  const showToast = useUIStore((state) => state.showToast);
  const saveFile = useFileSave();
  // From the store rather than from this component, because the thread outlives the view: `App`
  // swaps the whole tab on navigation, and a flag held here would come back `false` with a write
  // still running. See `useSheetWriteStore`.
  const saving = useSheetWriteStore((state) => state.writing);

  const save = useCallback(
    ({ sourceName, image, scale, format, boxes, duplicates, names, sheet }: SheetDownload) => {
      // Read at the press rather than closed over, so the guard cannot go stale behind a render.
      // `writeSheetOffThread` refuses a second write as well; this is what keeps a refused press
      // from reporting a failure the reader did not cause.
      if (useSheetWriteStore.getState().writing) return;
      const file = SHEET_FORMAT_FILES[format];
      const filename = quantisedName(sourceName, scale, file.extension);

      writeSheetOffThread({
        image,
        scale,
        format,
        boxes,
        duplicates,
        names,
        // What a manifest downloaded on its own says its rects are into: the PNG this same press
        // would have written, at this same magnification, rather than the dropped file — which is
        // the sheet as it arrived and not as the tab has since read it.
        imageName: quantisedName(sourceName, scale, SHEET_FORMAT_FILES.PNG.extension),
        sheet,
      })
        .then((written) => {
          saveFile(
            filename,
            new Blob([written.bytes], { type: file.mediaType }),
            `Downloaded ${filename} — ${describeWriting(written)}`,
          );
        })
        .catch((error: unknown) => {
          // Named rather than swallowed: the realistic causes — a browser that would not start the
          // thread, memory on a magnified sheet, and a canvas too large for the Aseprite format to
          // state — are nothing alike, and a reader who is told which can act on it.
          showToast(`Could not write ${filename}: ${reason(error)}`);
        });
    },
    [saveFile, showToast],
  );

  return { save, saving };
}

/** Whatever was thrown, as the clause a sentence can end with. */
function reason(error: unknown): string {
  const said = error instanceof Error ? error.message : String(error);
  return said === '' ? 'the writer gave no reason' : said;
}

/**
 * What the file turned out to be, as a clause after its name.
 *
 * Reported because it is the one thing about the download a reader cannot see from the preview, and
 * because the outcomes call for different things from them: an indexed file is the palette claim
 * honoured in the format itself, while one written with a colour per pixel says the sheet holds more
 * colours than a palette can name, which is a reason to reach for the colour budget. An Aseprite
 * document adds what it was cut into, which is the half of that file nothing else on the tab states.
 *
 * **"Entries", not "colours", and the word is doing real work.** A palette entry is what the file
 * holds, and transparency takes one of them; the count in the caption beside the preview is of
 * *drawn* colours and leaves transparency out. So a keyed sheet the panel calls 32 colours writes a
 * 33-entry palette, and calling both of them colours would put two numbers for one thing on one
 * screen. The truecolour clause quotes no figure at all for the same reason — any threshold stated
 * here would disagree with that caption on exactly the keyed sheets this tab is for. The guidance
 * behind the button is where the two are reconciled; a toast is not.
 */
function describeWriting(written: WrittenSheet): string {
  if (written.format === 'MANIFEST') return describeSprites(written.sprites, written.named);

  if (written.format === 'PNG') {
    return written.paletteEntries === null
      ? 'more colours than a palette can hold, so it is written truecolour'
      : `indexed, ${String(written.paletteEntries)}-entry palette`;
  }

  const colours =
    written.paletteEntries === null
      ? 'more colours than a palette can hold, so it is written in RGB colour mode'
      : `indexed, ${String(written.paletteEntries)}-entry palette`;

  if (written.format === 'SPRITE_PACK') {
    return `${colours}, ${describeSprites(written.sprites, written.named)}`;
  }
  return `${colours}, ${describeFrames(written.frames, written.tags)}`;
}

/**
 * What was described, and whether the descriptions carry the inventory's own names.
 *
 * The naming half is reported at the download rather than left to be discovered in the file, because
 * it says something about the *artwork*: names are attached only where the sheet came back with the
 * number of components the prompt asked for, so positional names are the tab telling a reader their
 * generator returned a different set from the one it was asked for.
 */
function describeSprites(sprites: number, named: boolean): string {
  if (sprites === 0) return 'no separated sprites, so it describes the sheet alone';
  const counted = `${String(sprites)} ${sprites === 1 ? 'sprite' : 'sprites'}`;
  return named
    ? `${counted}, named from the inventory`
    : `${counted}, numbered rather than named — the count does not match the inventory`;
}

/**
 * How the document was cut up, in words.
 *
 * The uncut sheet is named rather than counted, because it is not a *reading* of the sheet — it is
 * what a sheet with nothing separable on it comes to, and "1 frame in 0 tags" reads as a failure of
 * the segmentation rather than as the whole sheet arriving intact.
 *
 * **It is the tags that say which case this is, never the frame count.** A sheet holding exactly one
 * sprite also comes to one frame — and that frame is a *crop* of the sprite onto a canvas its own
 * size, with the rest of the sheet gone, tagged as its row. Calling that "the whole sheet in one
 * frame" is the very misreport this wording exists to avoid, so the boxless case is recognised by
 * the thing that is actually absent from it.
 */
function describeFrames(frames: number, tags: number): string {
  if (tags === 0) return 'the whole sheet in one frame';
  return `${String(frames)} ${frames === 1 ? 'frame' : 'frames'} in ${String(tags)} ${tags === 1 ? 'tag' : 'tags'}`;
}

/**
 * `character-sheet.webp` → `character-sheet-quantised.png`, or `…-quantised@4x.aseprite` magnified.
 *
 * Named after the source so a batch of eight split sheets stays sorted beside its originals, and
 * suffixed so the download never silently replaces the file it came from. The extension is always
 * the one that was written, whatever arrived. A magnified copy carries its factor in the `@4x` form
 * asset pipelines already read, so the 1× file and its magnifications sort together and none of them
 * overwrites another — including across formats, since each of the four has its own extension.
 */
function quantisedName(sourceName: string, scale: number, extension: string): string {
  const stem = sourceName.replace(/\.[^./\\]+$/, '');
  const factor = scale === 1 ? '' : `@${String(scale)}x`;
  return `${stem === '' ? 'sprite-sheet' : stem}-quantised${factor}.${extension}`;
}
