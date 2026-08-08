import { useCallback, useState } from 'react';
import type { PresetArchetype } from '../../types/preset.ts';

interface PresetRenameFormProps {
  readonly preset: PresetArchetype;
  /** Resolves to whether the new name was stored. A refusal keeps this form open. */
  readonly onRename: (preset: PresetArchetype, name: string) => Promise<boolean>;
  /** Close without renaming. The card uses this to put focus back where it came from. */
  readonly onClose: () => void;
}

/**
 * Renaming one preset, in place of its heading.
 *
 * Its own file because it is a small state machine rather than a control: a draft, an in-flight
 * write, a submit that may be refused, and focus to place — none of which the card around it needs
 * to know about.
 *
 * A real `<form>`, so Enter submits without a keydown handler re-implementing what the platform
 * already does.
 */
export function PresetRenameForm({ preset, onRename, onClose }: PresetRenameFormProps) {
  const [draftName, setDraftName] = useState(preset.name);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Moves focus into the field as it appears. It has to move: the keyboard was on the button that
   * opened this, and that button is still there but is no longer where the work is.
   *
   * A *stable* callback ref, so React runs it on mount and unmount only — an inline arrow changes
   * identity every render and would drag focus back on every keystroke.
   */
  const focusOnMount = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        try {
          // Closed only when it was actually stored. The store refuses a name another preset holds
          // and says so; closing anyway would hide that nothing happened.
          if (await onRename(preset, draftName)) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <input
        ref={focusOnMount}
        type="text"
        value={draftName}
        aria-label={`New name for ${preset.name}`}
        onChange={(event) => {
          setDraftName(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="w-full min-w-0 rounded-lg border border-foundry-600 bg-foundry-950 px-2 py-1 text-sm font-bold text-ink transition-colors focus:border-accent"
      />
      <button
        type="submit"
        disabled={isSaving || draftName.trim() === ''}
        className="action-tab rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-foundry-600 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
      >
        Cancel
      </button>
    </form>
  );
}
