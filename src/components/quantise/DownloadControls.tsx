import { useEffect, useRef } from 'react';
import { MAX_IMAGE_PIXELS, PREVIEW_ZOOMS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { SHEET_FORMAT_FILES } from '../../constants/sheetFormats.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useImageDownload } from '../../hooks/useImageDownload.ts';
import { useSheetIdentity } from '../../hooks/useSheetIdentity.ts';
import { useComponentTarget } from '../../hooks/useComponentTarget.ts';
import { useSpriteAssignment } from '../../hooks/useSpriteAssignment.ts';
import { useQuantiseDownloadStore } from '../../stores/useQuantiseDownloadStore.ts';
import type { SpriteDuplicateGroup, SpriteSegmentation } from '../../types/quantiser.ts';
import { SHEET_FORMATS } from '../../types/sheetFormat.ts';
import type { SheetFormat } from '../../types/sheetFormat.ts';
import { resolveSpriteCell } from '../../utils/spriteCell.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';
import { SpriteCellControls } from './SpriteCellControls.tsx';

interface DownloadControlsProps {
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  /** `null` until a grid is settled, which is the only state the download can be refused in. */
  readonly resultImage: ImageData | null;
  /**
   * What the sheet broke into: an Aseprite document's frames, a pack's files, a manifest's rects.
   *
   * `null` alongside a missing result, and carrying no boxes wherever the sheet held nothing
   * separable — see `SpriteSegmentation`, whose `SOLID` and `SCATTERED` are deliberately boxless.
   * Both reach the writer as an empty list, which is the single-frame case rather than a refusal.
   */
  readonly sprites: SpriteSegmentation | null;
  /**
   * The duplicate reading over those sprites, which the manifest turns into links between them.
   *
   * Empty where nothing was compared, which is every sheet that produced no sprites — the reading is
   * of the segmentation, so a sheet with nothing separable has nothing to group.
   */
  readonly duplicates: readonly SpriteDuplicateGroup[];
}

/**
 * The way the sheet leaves the app: at what magnification, as which file, and the button that
 * writes it.
 *
 * Split from `ComparisonToolbar`, which is otherwise about how the result is *looked at* — the
 * layout, the zoom, the heatmap's scale. This half writes a file, holds a press that has a duration,
 * and answers what that duration does to the keyboard, none of which the other half has any part in.
 *
 * **The format is a setting and the download is an action**, which is why the two carry their
 * guidance differently: the pills sit under a label with an ⓘ beside it, as every value-holding
 * control in the app does, and the button hangs its own card off itself through `ControlTooltip`.
 * The button's card changes with the format, because what it would do is a different thing in each.
 *
 * **The settings are read from `useQuantiseDownloadStore`** rather than handed down, so they outlive
 * the view — see the store for the trip to the studio that used to reset them.
 */
export function DownloadControls({ sourceName, resultImage, sprites, duplicates }: DownloadControlsProps) {
  const downloadScale = useQuantiseDownloadStore((state) => state.downloadScale);
  const setDownloadScale = useQuantiseDownloadStore((state) => state.setDownloadScale);
  const downloadFormat = useQuantiseDownloadStore((state) => state.downloadFormat);
  const setDownloadFormat = useQuantiseDownloadStore((state) => state.setDownloadFormat);
  const cellChoice = useQuantiseDownloadStore((state) => state.cellChoice);
  const setCellChoice = useQuantiseDownloadStore((state) => state.setCellChoice);
  // The component size the studio's prompt states, which is one of the cell's two sources. Read here
  // and handed to `SpriteCellControls`, because the press resolves the cell from it too, and the
  // pills on screen and the file they describe must be working from one reading.
  const target = useComponentTarget();
  const download = useImageDownload();
  // The studio's own answer about what this sheet is — the same reading `SheetIdentityControls` puts
  // on screen, through the one hook, so what the panel promises and what the file records cannot be
  // two answers. See `useSheetIdentity`, which says why it is shared rather than derived twice.
  const identity = useSheetIdentity();
  const button = useRef<HTMLButtonElement>(null);
  // Whether the button held the keyboard's focus at the moment it was pressed — see the effect.
  const heldFocus = useRef(false);

  // The same ladder the preview offers, cut to what this result can afford: a magnification whose
  // file would outgrow the largest image the tab itself accepts is not offered for this sheet. The
  // full ladder stands in while there is no result, so the row does not jump as one arrives.
  const available: readonly number[] =
    resultImage === null
      ? PREVIEW_ZOOMS
      : PREVIEW_ZOOMS.filter(
          (scale) => resultImage.width * scale * (resultImage.height * scale) <= MAX_IMAGE_PIXELS,
        );
  // Derived rather than clamped in state: a new, larger result can strand the chosen rung, and the
  // honest answer is to save at 1× and show 1× pressed — not to show a selection the download
  // would silently ignore.
  const effectiveScale = available.includes(downloadScale) ? downloadScale : PREVIEW_ZOOMS[0];
  const unavailable = resultImage === null || download.saving;
  // The **pieces** both the cell controls and the press work from, in the 1:1 result's own
  // coordinates — one derivation, so the panel's warning and the writer's refusal cannot be about
  // different sets. Pieces rather than the segmentation's boxes because a joined pair is one file
  // and has to clear the cell as one, and a sprite left out must not be able to refuse a download it
  // is not in. The same hook the preview's labels and the panel's list read; see
  // `useSpriteAssignment`, which is why those three cannot disagree.
  const assignment = useSpriteAssignment(sprites);
  const boxes = assignment.pieces.map((piece) => piece.box);
  // Only the two formats that describe sprites read a cell, so only they offer the controls for one.
  // The same conditional `ComparisonToolbar` puts on the heatmap's scale, for the same reason: a
  // control that changed nothing would be a lie on screen.
  const cuts = downloadFormat === 'SPRITE_PACK' || downloadFormat === 'MANIFEST';

  useEffect(() => {
    // A button that disables under the reader's own press takes their focus with it: the browser
    // moves it to the body, and nothing brings it back when the button returns. A pointer user never
    // notices; a keyboard user loses their place in the toolbar for as long as the file takes.
    //
    // **Whether it held focus is recorded at the press, not read back afterwards.** By the time the
    // button re-enables the focus has long since moved to the body, and the body is the *default*
    // rather than evidence of anything — it is equally where a reader lands by clicking the preview
    // mid-write, or by navigating away and back, and it is where a mouse press leaves them on the
    // platforms that do not focus a pressed button at all. Restoring on that test would pull people
    // back to a control they never used.
    //
    // Keyed on the whole disabled state rather than on the write, because a sheet dropped mid-write
    // leaves the button disabled after the file lands, and focus belongs to whoever asked for it
    // once it can take focus again.
    if (unavailable || !heldFocus.current) return;
    heldFocus.current = false;
    // And only where nothing has claimed focus since. A reader who tabbed elsewhere during the write
    // has said where they want to be, and the body is what is left when nobody has.
    // The button's own document, not this module's: detached, this toolbar is in a window of its
    // own, where the main document's `activeElement` says nothing about who holds focus here.
    const reached = button.current?.ownerDocument;
    if (reached !== undefined && reached.activeElement === reached.body) button.current?.focus();
  }, [unavailable]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Save at</span>
          <Tooltip text={QUANTISE_TOOLTIPS.downloadScale} hint="Save at" />
        </span>
        <SegmentedChoice
          label="Download magnification"
          values={available}
          value={effectiveScale}
          format={(level) => `${String(level)}×`}
          onChange={setDownloadScale}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Save as</span>
          <Tooltip text={QUANTISE_TOOLTIPS.downloadFormat} hint="Save as" />
        </span>
        <SegmentedChoice
          label="Download format"
          values={SHEET_FORMATS}
          value={downloadFormat}
          format={(format) => SHEET_FORMAT_FILES[format].label}
          onChange={setDownloadFormat}
        />
      </div>

      {cuts && (
        <SpriteCellControls choice={cellChoice} onChange={setCellChoice} target={target} boxes={boxes} />
      )}

      <ControlTooltip
        hint={`Download ${SHEET_FORMAT_FILES[downloadFormat].label}`}
        text={DOWNLOAD_GUIDANCE[downloadFormat]}
      >
        <button
          ref={button}
          type="button"
          disabled={unavailable}
          onClick={() => {
            if (resultImage === null) return;
            // Read while the button still has it; a moment later the disable will have taken it.
            heldFocus.current = button.current?.ownerDocument.activeElement === button.current;
            // The 1:1 sheet and the factor, never an already-magnified image: the result in memory
            // stays the sheet the previews and the store share, and the magnification happens on the
            // writer's own thread rather than in this handler. The boxes cross at 1:1 beside it and
            // are scaled there, so the two cannot end up on different coordinates.
            download.save({
              sourceName,
              image: resultImage,
              scale: effectiveScale,
              format: downloadFormat,
              boxes,
              // Sent whatever the format is, as the boxes are, and `null` under a format that does
              // not cut — so a cell left set from an earlier press cannot reach a writer that has no
              // controls on screen for it.
              cell: cuts ? resolveSpriteCell(cellChoice, target) : null,
              duplicates,
              // One name per piece, already decided, beside the route that decided them — the
              // inventory itself is not sent, because matching it to the artwork is a question this
              // tab answers before the press rather than one a writer should be re-opening.
              names: assignment.pieces.map((piece) => piece.name),
              naming: assignment.naming,
              facing: identity.facing,
              sheet: identity.sheet,
            });
          }}
          className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">⬇</span>{' '}
          {download.saving ? 'Writing…' : `Download ${SHEET_FORMAT_FILES[downloadFormat].label}`}
        </button>
      </ControlTooltip>
    </div>
  );
}

/**
 * The card behind the button, per format.
 *
 * A record keyed by the union rather than a ternary, so a third format fails to compile until it has
 * been given the paragraph a reader needs — which is the property the app's other union-keyed
 * records exist for.
 */
const DOWNLOAD_GUIDANCE: Readonly<Record<SheetFormat, string>> = {
  PNG: QUANTISE_ACTION_TOOLTIPS.downloadPNG,
  ASEPRITE: QUANTISE_ACTION_TOOLTIPS.downloadAseprite,
  SPRITE_PACK: QUANTISE_ACTION_TOOLTIPS.downloadSpritePack,
  MANIFEST: QUANTISE_ACTION_TOOLTIPS.downloadManifest,
};
