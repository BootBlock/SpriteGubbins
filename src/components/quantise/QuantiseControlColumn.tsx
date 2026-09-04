import type { TargetSize } from '../../types/output.ts';
import type {
  BackgroundKeying,
  ColorPlan,
  ImportedImage,
  PixelGrid,
  Quantised,
  QuantiseSettings,
  SheetFacts,
} from '../../types/quantiser.ts';
import { AntiAliasControls } from './AntiAliasControls.tsx';
import { AutoTuneControls } from './AutoTuneControls.tsx';
import { DialHistoryControls } from './DialHistoryControls.tsx';
import { DuplicateControls } from './DuplicateControls.tsx';
import { FrameAlignmentControls } from './FrameAlignmentControls.tsx';
import { GridControls } from './GridControls.tsx';
import { KeyingControls } from './KeyingControls.tsx';
import { PaletteExportControls } from './PaletteExportControls.tsx';
import { PaletteLockControls } from './PaletteLockControls.tsx';
import { QuantisePresetControls } from './QuantisePresetControls.tsx';
import { SheetIdentityControls } from './SheetIdentityControls.tsx';
import { SpriteControls } from './SpriteControls.tsx';
import { SymmetryControls } from './SymmetryControls.tsx';

interface QuantiseControlColumnProps {
  readonly source: ImportedImage;
  readonly facts: SheetFacts | null;
  readonly grid: PixelGrid | null;
  readonly settings: QuantiseSettings | null;
  readonly quantised: Quantised | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly keying: BackgroundKeying | null;
  readonly keyOffered: boolean;
  readonly colorPlan: ColorPlan;
  readonly target: TargetSize | null;
  readonly suggested: PixelGrid | null;
  readonly expected: number;
  readonly setGridOverride: (grid: PixelGrid | null) => void;
}

/**
 * Every dial the Quantise tab offers, in the order the pipeline applies them.
 *
 * The left column's contents. `QuantiseWorkspace` owns the column itself — its track span and its
 * spacing are facts about the split, so they stay with the grid that states the other column's. The ordering is the point of the file and each panel says at its own line why it sits
 * where it does: the passes come first in pipeline order, then the three readings taken over the
 * segmentation, then the anti-aliasing that must run last, and the preset panel below all of them
 * because its subject is the reader's way of working rather than this sheet.
 *
 * Every panel is handed an answer rather than deriving one. Two readings of one setting can disagree
 * — and did — so the keying, the colour plan and the segmentation each reach the panel that reports
 * them from the same place the pipeline was given them.
 */
export function QuantiseControlColumn({
  source,
  facts,
  grid,
  settings,
  quantised,
  busy,
  error,
  keying,
  keyOffered,
  colorPlan,
  target,
  suggested,
  expected,
  setGridOverride,
}: QuantiseControlColumnProps) {
  return (
    <>
      {error !== null && (
        <p
          role="alert"
          className="rounded-2xl border border-rose/40 bg-rose/10 p-4 text-xs leading-relaxed text-rose"
        >
          {error}
        </p>
      )}

      {/* Above every panel it governs, and inside the sheet guard with them: it steps the dials
        back through the positions they have been in, and with no sheet loaded there are no
        dials on screen for a step to be about. */}
      <DialHistoryControls />

      <GridControls
        facts={facts}
        target={target}
        suggested={suggested}
        grid={grid}
        colorPlan={colorPlan}
        onGridChange={setGridOverride}
      />
      {/* Under the grid it depends on and above every dial it moves — see `AutoTuneControls`,
        which says why both halves of that placement matter. */}
      <AutoTuneControls image={source.image} settings={settings} />
      {/* The panel is handed the same `keying` the pipeline was, rather than working it out again
        from the two settings behind it — one rule, one place. The share is the transform's own
        answer, so it is `null` until there is a transform, which is the same condition the
        comparison beside it shows its placeholder for. */}
      <KeyingControls
        keying={keying}
        keyedShare={quantised?.result.keyedShare ?? null}
        busy={busy}
        offered={keyOffered}
      />
      {/* The colours rather than the sheet, and the two panels below take the same list for the
        same reason — see `QuantiseResult.paletteEntries`. What it buys the lock is more than a walk
        it need not do: an empty list is a sheet with nothing to hold, so the panel can shut its
        button before the press instead of discovering it afterwards. */}
      <PaletteLockControls
        resultPalette={quantised?.result.paletteEntries ?? null}
        sheetName={source.name}
        studioSetting={colorPlan.studioSetting}
        superseded={colorPlan.superseded}
        busy={busy}
      />
      {/* Directly under the lock, because one of the two palettes it offers is that lock —
        and separate from it because a download does nothing to the next sheet, which is
        what the panel above is entirely about. */}
      <PaletteExportControls
        resultPalette={quantised?.result.paletteEntries ?? null}
        sheetName={source.name}
      />
      {/* Directly above the sprite panel, because the two are the two readings of one sheet:
        this states what the studio's prompt asked for and what a download is about to record,
        and the panel below states what actually came back. It changes no pixel and no dial —
        its buttons move the *studio* — so it sits with the readings rather than among the
        passes above it. */}
      <SheetIdentityControls />
      <SpriteControls
        sprites={quantised?.result.sprites ?? null}
        target={target}
        expected={expected}
        busy={busy}
      />
      {/* Directly under the sprite panel, because it is a reading *of* that reading: an axis is
        scored inside a sprite's own bounds, so what this panel can say is decided by what the
        one above found. It is inside the same sheet guard for the same reason as the rest. */}
      <SymmetryControls
        symmetry={quantised?.result.symmetry ?? null}
        sprites={quantised?.result.sprites ?? null}
        busy={busy}
      />
      {/* Beside the symmetry panel and for the same reason: it has nothing to say until sprites
        have been separated, and its guidance sends a reader back up to the panel above when
        they have not been. */}
      <DuplicateControls
        sprites={quantised?.result.sprites ?? null}
        duplicates={quantised?.result.duplicates ?? null}
        snapped={quantised?.result.snapped ?? false}
        busy={busy}
      />
      {/* Third of the readings taken over the segmentation, and last because it is the only one
        whose subject is a *row* rather than a sprite: what it can say is decided by what the
        three panels above found, and by the sheet those panels may already have rewritten. */}
      <FrameAlignmentControls
        sprites={quantised?.result.sprites ?? null}
        strips={quantised?.result.strips ?? null}
        busy={busy}
      />
      {/* Last of the dial panels, because its pass is last in the pipeline — see
        `quantiseImage`, which says why nothing may run after it. It is also the only pass on
        this tab that puts smooth colour back, so it belongs after every panel whose dials
        work toward the flat result it softens. */}
      <AntiAliasControls constrained={colorPlan.reduction !== null} />
      {/* Last of the panels, and below the dials rather than above them: it is the only one
        whose subject is the reader's own way of working rather than this sheet, so it reads as
        a place to *put* what the controls above arrived at. Inside the sheet guard with the
        rest — a collection of dial positions is nothing to offer someone who has not dropped
        an image yet, and there would be no dials on screen for Save to be about. */}
      <QuantisePresetControls />
    </>
  );
}
