import { useRef, useState } from 'react';
import type { PresetArchetype } from '../../types/preset.ts';
import { Badge } from '../common/Badge.tsx';
import { PresetRenameForm } from './PresetRenameForm.tsx';

interface PresetCardProps {
  readonly preset: PresetArchetype;
  readonly onLoad: (preset: PresetArchetype) => void;
  /** Resolves to whether the new name was stored, so a refused one keeps the editor open. */
  readonly onRename: (preset: PresetArchetype, name: string) => Promise<boolean>;
  readonly onDelete: (preset: PresetArchetype) => void;
}

/**
 * One archetype in the library.
 *
 * Only the user's own presets offer a rename and a delete: a built-in is a compile-time constant
 * that is never stored, while a custom one is work the user did that nothing else holds a copy of —
 * which is why the delete confirms first and the rename does not need to.
 */
export function PresetCard({ preset, onLoad, onRename, onDelete }: PresetCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const renameButtonRef = useRef<HTMLButtonElement>(null);

  // Focused *before* the state change, not after: the rename button never unmounts, so it can take
  // focus now and still hold it once the editor goes. Otherwise focus would fall to the document.
  const closeRename = () => {
    renameButtonRef.current?.focus();
    setIsRenaming(false);
  };

  return (
    <li className="glass-panel group flex flex-col justify-between gap-4 rounded-2xl border border-foundry-700 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-2xl">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="accent">{preset.category}</Badge>
          <Badge>{preset.isCustom === true ? 'Your preset' : 'Built-in'}</Badge>
        </div>

        {isRenaming ? (
          <PresetRenameForm preset={preset} onRename={onRename} onClose={closeRename} />
        ) : (
          <h3 className="text-base font-bold text-ink transition-colors duration-300 group-hover:text-accent-soft">
            {preset.name}
          </h3>
        )}
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-strong to-accent py-2 text-xs font-semibold text-ink ring-1 ring-accent-soft/30 transition-all duration-200 hover:ring-accent-soft active:scale-[0.98]"
          >
            <span aria-hidden="true">⚡</span>
            Load preset
          </button>

          {preset.isCustom === true && (
            <>
              <button
                ref={renameButtonRef}
                type="button"
                onClick={() => {
                  setIsRenaming(true);
                }}
                aria-label={`Rename preset ${preset.name}`}
                className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
              >
                <span aria-hidden="true">✏️</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  // The editor would otherwise sit above a confirm asking to delete what it edits.
                  setIsRenaming(false);
                  setIsConfirmingDelete(true);
                }}
                aria-label={`Delete preset ${preset.name}`}
                className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-rose transition-colors hover:bg-foundry-700"
              >
                <span aria-hidden="true">🗑</span>
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
