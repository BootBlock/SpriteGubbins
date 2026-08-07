import { useState } from 'react';
import type { PresetArchetype } from '../../types/preset.ts';
import { Badge } from '../common/Badge.tsx';

interface PresetCardProps {
  readonly preset: PresetArchetype;
  readonly onLoad: (preset: PresetArchetype) => void;
  readonly onDelete: (preset: PresetArchetype) => void;
}

/**
 * One archetype in the library.
 *
 * Only the user's own presets offer a delete, and only after confirming: a built-in is a compile-time
 * constant and cannot be removed, while a custom one is work the user did that nothing else holds a
 * copy of.
 */
export function PresetCard({ preset, onLoad, onDelete }: PresetCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li className="flex flex-col justify-between gap-4 rounded-2xl border border-foundry-700 bg-foundry-800/80 p-5 shadow-xl transition-colors hover:border-accent/50">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="accent">{preset.category}</Badge>
          <Badge>{preset.isCustom === true ? 'Your preset' : 'Built-in'}</Badge>
        </div>

        <h3 className="text-base font-bold text-ink">{preset.name}</h3>
        <p className="line-clamp-2 text-xs text-ink-muted">
          {preset.subject.species} — {preset.subject.setting}
        </p>
      </div>

      {isConfirmingDelete ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setIsConfirmingDelete(false);
              onDelete(preset);
            }}
            className="flex-1 rounded-xl bg-rose py-2 text-xs font-bold text-foundry-950 transition-opacity hover:opacity-90"
          >
            Delete “{preset.name}”
          </button>
          <button
            type="button"
            onClick={() => {
              setIsConfirmingDelete(false);
            }}
            className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onLoad(preset);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-strong py-2 text-xs font-semibold text-ink transition-colors hover:bg-accent"
          >
            <span aria-hidden="true">⚡</span>
            Load preset
          </button>

          {preset.isCustom === true && (
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(true);
              }}
              aria-label={`Delete preset ${preset.name}`}
              className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-rose transition-colors hover:bg-foundry-700"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          )}
        </div>
      )}
    </li>
  );
}
