import { useCallback, useState } from 'react';
import { PRESET_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface PresetDetailsFormProps {
  readonly preset: PresetArchetype;
  /** Resolves to whether the edit was stored. A refusal keeps this form open. */
  readonly onUpdateDetails: (preset: PresetArchetype, name: string, description: string) => Promise<boolean>;
  /** Close without saving. The card uses this to put focus back where it came from. */
  readonly onClose: () => void;
}

/**
 * Editing one preset's name and the sentence under it, in place of its heading.
 *
 * Its own file because it is a small state machine rather than a control: two drafts, an in-flight
 * write, a submit that may be refused, and focus to place — none of which the card around it needs
 * to know about.
 *
 * **Both fields together, and this is the only place the description can be reached.** Saving over a
 * preset by name writes whatever the studio currently holds, so it is no use to somebody who wants
 * to fix a sentence and change nothing else — and the name and the description are one thought
 * anyway, which is why they are one form and one write rather than two.
 *
 * A real `<form>`, so Enter submits without a keydown handler re-implementing what the platform
 * already does.
 */
export function PresetDetailsForm({ preset, onUpdateDetails, onClose }: PresetDetailsFormProps) {
  const [draftName, setDraftName] = useState(preset.name);
  const [draftDescription, setDraftDescription] = useState(preset.description);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Moves focus into the name field as it appears. It has to move: the keyboard was on the button
   * that opened this, and that button is still there but is no longer where the work is.
   *
   * A *stable* callback ref, so React runs it on mount and unmount only — an inline arrow changes
   * identity every render and would drag focus back on every keystroke.
   */
  const focusOnMount = useCallback((node: HTMLInputElement | null) => {
    node?.focus();
  }, []);

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        try {
          // Closed only when it was actually stored. The store refuses a name another preset holds
          // and says so; closing anyway would hide that nothing happened.
          if (await onUpdateDetails(preset, draftName, draftDescription)) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
    >
      {/*
        The ⓘ rather than a card on each box, for the reason every other value field in the app takes
        one — and here the reason is sharper than consistency. The first field is focused the instant
        it appears, so guidance revealed by focus would open unasked over the card below every time
        this editor is opened. The ⓘ is also the only affordance a finger can reach, and it needs no
        label beside it: it names itself.
      */}
      <div className="flex items-center gap-2">
        <Tooltip text={PRESET_ACTION_TOOLTIPS.detailsNameBox} hint="New name" />
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
      </div>

      <div className="flex items-center gap-2">
        <Tooltip text={PRESET_ACTION_TOOLTIPS.detailsDescriptionBox} hint="Description" />
        <input
          type="text"
          value={draftDescription}
          placeholder="What it is for"
          aria-label={`Description for ${preset.name}`}
          onChange={(event) => {
            setDraftDescription(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          className="w-full min-w-0 rounded-lg border border-foundry-600 bg-foundry-950 px-2 py-1 text-xs text-ink transition-colors focus:border-accent"
        />
      </div>

      <div className="flex justify-end gap-2">
        <ControlTooltip hint="Save" text={PRESET_ACTION_TOOLTIPS.confirmDetails}>
          <button
            type="submit"
            disabled={isSaving || draftName.trim() === ''}
            className="action-tab rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </ControlTooltip>
        <ControlTooltip hint="Cancel" text={PRESET_ACTION_TOOLTIPS.cancelDetails}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-foundry-600 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
          >
            Cancel
          </button>
        </ControlTooltip>
      </div>
    </form>
  );
}
