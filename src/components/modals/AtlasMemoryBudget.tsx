import { ATLAS_TOOLTIPS } from '../../constants/atlas.ts';
import type { TextureCost } from '../../types/atlas.ts';
import { formatTextureBytes } from '../../utils/atlasBudget.ts';
import { Tooltip } from '../common/Tooltip.tsx';

interface AtlasMemoryBudgetProps {
  /** One row per format the app reports — see `TEXTURE_FORMATS`. */
  readonly costs: readonly TextureCost[];
}

/**
 * What this texture costs in graphics memory, which is the figure the canvas-resolution choice
 * above is actually a choice about.
 *
 * The modal has always headed a row "GPU VRAM optimisation status" and then stated no VRAM. Doubling
 * the canvas edge quadruples the memory — 2048 px is 16 MiB uncompressed and 4096 px is 64 MiB —
 * and nothing in the panel said so, which left the resolution selector reading as free resolution.
 *
 * A description list rather than a table: two rows of one figure each, where the label is what is
 * being described and the value describes it. The mip figure sits with the base figure it belongs
 * to rather than in a column of its own, because a chain is a decision made once for the whole
 * texture and not a second row to compare against.
 */
export function AtlasMemoryBudget({ costs }: AtlasMemoryBudgetProps) {
  return (
    <div className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <span className="flex items-center gap-1.5 font-mono text-xs text-ink-faint">
        Graphics memory
        <Tooltip text={ATLAS_TOOLTIPS.memory} hint="Graphics memory" />
      </span>

      <dl className="space-y-1.5">
        {costs.map((cost) => (
          <div key={cost.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <dt className="text-xs text-ink-muted">{cost.label}</dt>
            <dd className="font-mono text-xs text-ink">
              <span className="font-bold">{formatTextureBytes(cost.bytes)}</span>
              <span className="text-ink-faint">
                {' '}
                · {formatTextureBytes(cost.mipmappedBytes)} with mipmaps
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
