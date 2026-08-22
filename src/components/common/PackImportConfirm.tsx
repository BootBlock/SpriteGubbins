import { useEffect, useId, useRef } from 'react';
import type { PackItemNoun } from '../../types/packImport.ts';
import { describePackReplacement } from '../../utils/packImportSummary.ts';
import { ControlTooltip } from './ControlTooltip.tsx';

/**
 * Everything the question needs. Bundled as one interface rather than spread over
 * {@link JsonPackTransfer}'s own props, because it is one concern: either an import is waiting to
 * be answered and all seven apply, or none of them does.
 */
export interface PackImportConfirmProps {
  /** How many members the parsed pack holds. */
  readonly incoming: number;
  /** How many of the reader's own the replacement will delete. */
  readonly replacing: number;
  /** What this collection calls its members, for the sentence that counts them. */
  readonly noun: PackItemNoun;
  readonly confirmGuidance: string;
  readonly cancelGuidance: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * The question an import asks before it replaces a collection.
 *
 * **In place of the transfer buttons, not in a dialog**, which is the answer both preset lists
 * already give to "confirm something irreversible": `PresetCard` and `QuantisePresetRow` each turn
 * their own row into a confirmation rather than opening an overlay. A modal here would be the app
 * answering one question two ways depending on which destructive act was pressed — and `Modal`
 * carries the app's only toast inside it, so a second one opened from a tab would mount two.
 *
 * It is on screen rather than behind a tooltip because that is the defect it exists to fix: the
 * import button's guidance did say what an import costs, and `ControlTooltip` cannot be reached by
 * touch at all, so on a phone the warning was unreachable and the press deleted the library.
 *
 * Focus moves here on arrival, and it moves to **Cancel**. The press that opened the file chooser
 * left focus on a button this replaces, so without it focus falls to the document body and a
 * keyboard reader is left with no idea anything is being asked; landing on the harmless half is
 * what makes a stray Enter safe.
 */
export function PackImportConfirm({
  incoming,
  replacing,
  noun,
  confirmGuidance,
  cancelGuidance,
  onConfirm,
  onCancel,
}: PackImportConfirmProps) {
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-labelledby={messageId}
      className="animate-fade-in flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2"
    >
      <p id={messageId} className="min-w-48 flex-1 text-xs text-ink">
        {describePackReplacement(incoming, replacing, noun)}
      </p>

      <ControlTooltip hint="Replace" text={confirmGuidance}>
        <button
          type="button"
          aria-describedby={messageId}
          onClick={onConfirm}
          className="rounded-lg bg-rose px-3 py-1 text-xs font-bold text-foundry-950 transition-opacity duration-390 hover:opacity-90"
        >
          Replace
        </button>
      </ControlTooltip>

      <ControlTooltip hint="Cancel" text={cancelGuidance}>
        <button
          ref={cancelRef}
          type="button"
          aria-describedby={messageId}
          onClick={onCancel}
          className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-ink-muted transition-colors duration-390 hover:bg-foundry-700 hover:text-ink"
        >
          Cancel
        </button>
      </ControlTooltip>
    </div>
  );
}
