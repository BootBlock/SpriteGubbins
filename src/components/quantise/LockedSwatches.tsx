import { LOCKED_SWATCHES_SHOWN } from '../../constants/paletteLock.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { toHex } from '../../utils/imageData.ts';
import { ColorSwatch } from '../common/ColorSwatch.tsx';

interface LockedSwatchesProps {
  /** The held colours, most-used first — see `lockPaletteFrom` for the order. */
  readonly entries: readonly Rgba[];
}

/**
 * The colours a lock is holding, as a strip of dots, with whatever will not fit counted.
 *
 * **Capped rather than complete.** A palette locked from a sheet with no colour budget can hold
 * thousands of entries — `UNRESTRICTED` reduces nothing — and a strip of thousands of dots is not a
 * palette anybody can read. The entries arrive most-used first, so the ones shown are the colours
 * the sheet is actually made of, and the remainder is stated as a number rather than dropped in
 * silence.
 *
 * **Decorative**, as the studio's own palette strip is: the badge above it states the count and the
 * sheet the colours came from, which is what a reader who cannot use the swatches needs. A strip of
 * sixty-four unnamed colours announced one at a time would be noise, not information.
 */
export function LockedSwatches({ entries }: LockedSwatchesProps) {
  const shown = entries.slice(0, LOCKED_SWATCHES_SHOWN);
  const hidden = entries.length - shown.length;

  return (
    <div aria-hidden="true" className="mt-3 flex flex-wrap gap-1">
      {shown.map((entry) => (
        <ColorSwatch key={toHex(entry)} colorText={toHex(entry)} />
      ))}
      {hidden > 0 && <span className="font-mono text-2xs text-ink-faint">+{hidden} more</span>}
    </div>
  );
}
