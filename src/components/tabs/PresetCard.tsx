import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { spectrumStopAt } from '../../constants/spectrum.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { Badge } from '../common/Badge.tsx';
import { PresetRenameForm } from './PresetRenameForm.tsx';

interface PresetCardProps {
  readonly preset: PresetArchetype;
  /** Where in the library this card sits, which is what decides its stop on the wheel. */
  readonly index: number;
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
 *
 * **Each card re-points `--color-tab` to its own stop on the wheel**, so the library reads as a
 * spectrum rather than a grid of one colour repeated. Nothing below had to change for that: the
 * card's edge, its hover bloom and its title already reach for `*-tab` utilities, and those resolve
 * against whichever element last set the property. Assigning it here rather than passing a colour
 * down is what keeps a card's decoration out of its props.
 */
export function PresetCard({ preset, index, onLoad, onRename, onDelete }: PresetCardProps) {
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
    <li
      // Cast because `CSSProperties` enumerates the known CSS properties and a custom one is not
      // among them. It is the assertion React's own docs use for this, and it widens nothing: the
      // value is a `var()` reference produced by `spectrumStopAt`, not a colour written here.
      style={{ '--color-tab': spectrumStopAt(index) } as CSSProperties}
      // The edge carries the card's own stop at rest, not only under the pointer. A library where
      // the allocation is visible on hover alone is one where it may as well not exist: the grid is
      // read all at once, and the whole point of giving each card a position on the wheel is that
      // the set reads as a spectrum from across the room.
      className="animate-pop-in glass-panel group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-tab/35 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-tab/80 hover:shadow-2xl"
    >
      {/* A bloom in the card's own colour, existing only under the pointer, behind its content. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 size-32 rounded-full bg-tab/25 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="view">{preset.category}</Badge>
          <Badge>{preset.isCustom === true ? 'Your preset' : 'Built-in'}</Badge>
        </div>

        {isRenaming ? (
          <PresetRenameForm preset={preset} onRename={onRename} onClose={closeRename} />
        ) : (
          <h3 className="text-base font-bold text-ink transition-colors duration-300 group-hover:text-tab">
            {preset.name}
          </h3>
        )}
        <p className="line-clamp-2 text-xs text-ink-muted">
          {preset.subject.species} — {preset.subject.setting}
        </p>
      </div>

      {isConfirmingDelete ? (
        <div className="relative flex gap-2">
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
        <div className="relative flex gap-2">
          <button
            type="button"
            onClick={() => {
              onLoad(preset);
            }}
            className="group/load flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-strong to-accent py-2 text-xs font-semibold text-ink shadow-md ring-1 ring-accent-soft/30 transition-all duration-200 hover:shadow-lg hover:ring-accent-soft active:scale-[0.98]"
          >
            {/* Named group: the card is already a `group`, and an unnamed one here would follow the
                card's hover rather than this button's. */}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover/load:scale-125"
            >
              ⚡
            </span>
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
                className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-ink-muted transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-foundry-700 active:translate-y-0"
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
                className="rounded-xl border border-foundry-600 px-3 py-2 text-xs font-semibold text-rose transition-all duration-200 hover:-translate-y-px hover:border-rose/50 hover:bg-foundry-700 active:translate-y-0"
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
