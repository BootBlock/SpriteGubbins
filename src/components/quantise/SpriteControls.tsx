import { QUANTISE_TOOLTIPS, SPRITE_GAP_RANGE } from '../../constants/quantiser.ts';
import { SPRITE_GUIDANCE } from '../../constants/spriteSegmentation.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { TargetSize } from '../../types/output.ts';
import type { SpriteSegmentation } from '../../types/quantiser.ts';
import { widestSprite } from '../../utils/spriteSegments.ts';
import { Badge } from '../common/Badge.tsx';
import { RangeField } from '../common/RangeField.tsx';

interface SpriteControlsProps {
  /** What the transform found, or `null` while there is no result to have found anything in. */
  readonly sprites: SpriteSegmentation | null;
  /**
   * The component size the studio's prompt asks for, or `null` where it states none.
   *
   * The figure the measurement is worth reading against: a sheet whose sprites come back larger
   * than this was drawn at a coarser scale than the prompt asked for, which is a thing to know
   * before the artwork reaches an atlas cell sized from the same number.
   */
  readonly target: TargetSize | null;
  /**
   * How many components the studio's prompt for this sheet contracts for.
   *
   * **The other half of what this panel is for, and the half that was missing.** The size reading
   * below says whether the artwork came back at the scale that was asked for; this says whether it
   * came back in the pieces that were asked for — and until the two sat together, a sheet returning
   * nine components where twelve were requested looked, here and in the preview, exactly like a
   * sheet returning twelve.
   *
   * It is a statement about the *studio*, not about the image: nothing can check that the sheet on
   * this tab is the one the studio is composing. So a mismatch is reported as something to look at
   * rather than as an error, in the same voice as the target-size clause beside it.
   */
  readonly expected: number;
  /** Whether a newer result is on its way, which is what {@link sprites} may be lagging behind. */
  readonly busy: boolean;
}

/**
 * What the sheet broke into: how many sprites, how big the largest is, and how far apart two pieces
 * may sit before they stop being one.
 *
 * **A dial in the tab's control stack that changes no pixel of the result**, which the grid, the
 * keying, the downscale readings and the palette lock all do. This one changes a *reading* of what
 * those produced — which is why it opens engaged rather than off, and why the guidance says outright
 * that the download is the same file whatever it says. The symmetry and duplicate panels below it
 * are readings of the same kind, and each has one position — `SNAP`, and the duplicate fold — that
 * crosses back over into rewriting artwork.
 * (The comparison panel's own controls change no pixels either, but they decide how a result is
 * *shown* rather than sitting among the dials that make it.)
 *
 * It earns a panel rather than a line in the comparison caption because it answers a question the
 * rest of the tab cannot: the studio states how many components the prompt asked for and what size
 * each should be, and until now nothing checked either against the artwork that came back. A sheet
 * returning nine components where twelve were requested looks, in the preview, exactly like a sheet
 * returning twelve.
 *
 * **Every state it reports comes out of the segmentation itself, never out of the keying setting
 * beside it.** The two are not the same question: a sheet that arrived carrying its own alpha — one
 * this app downloaded earlier, say — separates perfectly well with keying switched off, and a sheet
 * keyed at a tolerance that matched nothing is solid with keying switched on. A panel reading the
 * setting would contradict its own badge in both directions, which is why `SpriteSegmentation`
 * carries `SOLID` rather than leaving it to be inferred here.
 */
export function SpriteControls({ sprites, target, expected, busy }: SpriteControlsProps) {
  const spriteGap = useQuantiseStore((state) => state.spriteGap);
  const setSpriteGap = useQuantiseStore((state) => state.setSpriteGap);

  const boxes = sprites?.kind === 'SEGMENTED' ? sprites.boxes : null;
  const largest = boxes === null ? null : widestSprite(boxes);

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Sprites</p>
        {busy || sprites === null ? (
          <Badge tone={busy ? 'live' : 'neutral'}>
            {busy ? 'Reading the sheet…' : 'Nothing quantised yet'}
          </Badge>
        ) : (
          <>
            <Badge tone={countTone(sprites)}>{countLabel(sprites)}</Badge>
            {/* Only where there is a count to compare with one: a solid or scattered sheet has no
                number of its own, and saying "12 asked for" beside "nothing transparent to separate"
                would read as a judgement on a reading nobody made. */}
            {sprites.kind === 'SEGMENTED' && sprites.boxes.length > 0 && (
              <Badge tone={sprites.boxes.length === expected ? 'valid' : 'attention'}>
                {expectedLabel(sprites.boxes.length, expected)}
              </Badge>
            )}
            {sprites.kind !== 'SOLID' && sprites.specks > 0 && (
              <Badge tone="attention">
                {sprites.specks} {sprites.specks === 1 ? 'speck ignored' : 'specks ignored'}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Withdrawn while a newer result is coming, exactly as the badge above it is. The previous
          job's answer is deliberately kept on screen for the *preview*, where a sheet beats a blank
          frame — but a line of bare figures has nothing to say it is the old one. */}
      {!busy && largest !== null && (
        <p className="mt-3 font-mono text-2xs text-ink-faint">
          Largest {largest.width} × {largest.height} drawn pixels
          {target !== null && ` · studio target ${target.width} × ${target.height}`}
          {target !== null &&
            (largest.width > target.width || largest.height > target.height
              ? ' · larger than the target'
              : ' · within the target')}
        </p>
      )}

      <div className="mt-4">
        <RangeField
          label="Sprite gap"
          tooltip={QUANTISE_TOOLTIPS.spriteGap}
          value={spriteGap}
          min={SPRITE_GAP_RANGE.min}
          max={SPRITE_GAP_RANGE.max}
          step={SPRITE_GAP_RANGE.step}
          // No `off` spelling: at zero this pass still gathers pieces whose boxes overlap, so
          // calling it off would be the readout claiming something the pipeline does not do. The
          // symmetry tolerance spells its own zero `exact` for a different reason — that pass can be
          // switched off, by the control above it, and zero is merely its strictest setting.
          format={(value) => String(value)}
          onChange={setSpriteGap}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{guidanceFor(sprites, expected)}</p>
    </section>
  );
}

/** `1 sprite`, `12 sprites`, or what was found instead of sprites. */
function countLabel(sprites: SpriteSegmentation): string {
  if (sprites.kind === 'SOLID') return 'Nothing transparent to separate';
  if (sprites.kind === 'SCATTERED') return `${sprites.pieces} pieces — not read as sprites`;
  const { length } = sprites.boxes;
  return `${length} ${length === 1 ? 'sprite' : 'sprites'}`;
}

/**
 * Which badge the count wears.
 *
 * A count is only *good news* where it is a count of separated things, so a solid sheet, a scattered
 * one and one with nothing left on it all take the tone that asks the reader to look at the
 * paragraph below.
 *
 * **One piece is neither**, and that is why there is a third tone rather than a second. It is the
 * correct answer for a sheet holding a single component and the symptom of a key that has not quite
 * let go on a sheet holding several, and nothing here can tell which — so the chip states the fact
 * without judging it, and the paragraph names both readings.
 */
function countTone(sprites: SpriteSegmentation): 'valid' | 'attention' | 'neutral' {
  if (sprites.kind !== 'SEGMENTED' || sprites.boxes.length === 0) return 'attention';
  if (sprites.boxes.length === 1) return 'neutral';
  return 'valid';
}

/**
 * How the count sits against the inventory, in the few words a chip has room for.
 *
 * The figure asked for is named in both branches rather than only in the mismatch, because the
 * agreeing case is the one a reader wants to be able to see at a glance and trust.
 */
function expectedLabel(found: number, expected: number): string {
  if (found === expected) return `matches the ${String(expected)} asked for`;
  const difference = Math.abs(found - expected);
  const direction = found > expected ? 'over' : 'short of';
  return `${String(difference)} ${direction} the ${String(expected)} asked for`;
}

/** Which paragraph the state calls for — see `SPRITE_GUIDANCE`, which holds all six. */
function guidanceFor(sprites: SpriteSegmentation | null, expected: number): string {
  // With nothing quantised yet the general paragraph is the right one: it says what this panel
  // does, which is what a reader waiting on a first result needs — where naming a state the sheet
  // is not in would be describing a finding nobody has made.
  if (sprites === null) return SPRITE_GUIDANCE.found;
  if (sprites.kind === 'SOLID') return SPRITE_GUIDANCE.solid;
  if (sprites.kind === 'SCATTERED') return SPRITE_GUIDANCE.scattered;
  if (sprites.boxes.length === 0) return SPRITE_GUIDANCE.empty;
  if (sprites.boxes.length === 1) return SPRITE_GUIDANCE.single;
  // The mismatch outranks the ordinary paragraph: both describe a sheet that came apart, and only
  // one of them names something the reader has to act on before the artwork is any use.
  if (sprites.boxes.length !== expected) return SPRITE_GUIDANCE.miscount;
  return SPRITE_GUIDANCE.found;
}
