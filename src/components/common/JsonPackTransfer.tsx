import { useRef } from 'react';
import { useDownload } from '../../hooks/useDownload.ts';
import { ControlTooltip } from './ControlTooltip.tsx';
import { PackImportConfirm } from './PackImportConfirm.tsx';
import type { PackImportConfirmProps } from './PackImportConfirm.tsx';

interface JsonPackTransferProps {
  /** The filename the exported pack arrives as, extension included. */
  readonly filename: string;
  /** The collection as a pack file's text, read at the moment of the press. */
  readonly exportPack: () => string;
  /**
   * Read this file and stage what it holds for confirmation. It replaces nothing — that is
   * `onConfirmImport`, once the reader has seen what the replacement costs.
   */
  readonly importPack: (file: File) => Promise<void>;
  /**
   * The question a staged pack is waiting on, or `null` when no import is being asked about.
   *
   * Counts and callbacks rather than the pack itself: this control has no business knowing what
   * either collection's members look like, and the store that staged them is what performs the
   * replace.
   */
  readonly pendingImport: PackImportConfirmProps | null;
  /** Whether a transfer is in flight, which disables both controls. */
  readonly isTransferring: boolean;
  /**
   * Whether there is anything worth exporting.
   *
   * A prop rather than a rule this component decides, because the two collections answer it
   * differently and both answers are right: an archetype pack always carries the built-ins, so it
   * says something even when the reader has saved nothing, while a pack of quantiser presets with
   * no entries is a file the parser refuses — obeying an empty one would delete the collection it
   * landed in.
   */
  readonly canExport: boolean;
  readonly exportGuidance: string;
  readonly importGuidance: string;
}

/**
 * Moving a whole collection in and out as a JSON pack.
 *
 * **One implementation for both collections**, because the two are the same control over different
 * data: download this collection as JSON, and replace it from a JSON file. They were briefly two
 * files, and the copy had already begun to diverge — one side disabled its export on an empty
 * collection and the other did not, which is a decision, not a difference in what the control is.
 * What genuinely differs between the two is the seven props above.
 *
 * A shared primitive in `common/` rather than one tab's component imported by another: neither tab
 * owns this, and the store each reads stays at its own call site, where the selector can be atomic.
 *
 * **An import replaces the collection outright, so it asks first**, and the question takes the place
 * of both buttons rather than opening a dialog — see {@link PackImportConfirm}. Both buttons,
 * because an export started over a half-answered import is the race the transferring flag already
 * existed to stop; leaving Export reachable here would reintroduce it through the other door.
 */
export function JsonPackTransfer({
  filename,
  exportPack,
  importPack,
  pendingImport,
  isTransferring,
  canExport,
  exportGuidance,
  importGuidance,
}: JsonPackTransferProps) {
  const download = useDownload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {pendingImport === null ? (
        <>
          <ControlTooltip hint="Export JSON" text={exportGuidance}>
            <button
              type="button"
              disabled={isTransferring || !canExport}
              onClick={() => {
                download(filename, exportPack(), 'application/json');
              }}
              className="rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700 disabled:cursor-not-allowed disabled:text-ink-faint"
            >
              <span aria-hidden="true">📤</span> Export JSON
            </button>
          </ControlTooltip>

          {/*
            A real button that opens the file picker, rather than a `<label>` wrapping the input.
            The input itself cannot be the visible control — `hidden` would make it unreachable by
            keyboard, and `sr-only` would put the focus ring somewhere nobody can see — while
            styling a label to look like a button and giving it its own focus ring would
            re-implement the global `:focus-visible` rule that `index.css` already owns.
          */}
          <ControlTooltip hint="Import JSON" text={importGuidance}>
            <button
              type="button"
              disabled={isTransferring}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="rounded-lg border border-foundry-600 bg-foundry-800 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700 disabled:cursor-not-allowed disabled:text-ink-faint"
            >
              <span aria-hidden="true">📥</span> Import JSON
            </button>
          </ControlTooltip>
        </>
      ) : (
        <PackImportConfirm {...pendingImport} />
      )}

      {/*
        Outside the branch above, and it has to be: the picker fires `change` after its own dialog
        closes, and by then the staged pack has replaced the buttons.
      */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          // Captured before the await: React nulls `currentTarget` once the handler returns.
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          // Cleared afterwards so re-picking the same file fires `change` again — otherwise a
          // failed import could not simply be retried.
          void importPack(file).then(() => {
            input.value = '';
          });
        }}
      />
    </>
  );
}
