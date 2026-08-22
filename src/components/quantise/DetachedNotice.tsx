import { useEffect, useRef } from 'react';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/quantise.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface DetachedNoticeProps {
  readonly onReturn: () => void;
}

/**
 * What stands in the page while the preview is in a window of its own.
 *
 * **It says where the preview went, because nothing else can.** A panel that simply vanished would
 * read as a crash on the one press that was meant to move it — and a reader whose window opened
 * behind the main one, or on a display they are not looking at, has no way back otherwise. So the
 * page keeps the panel's place, names what happened to it, and offers the way back in the same
 * spot the control that sent it away was in.
 *
 * **It takes focus as it appears.** The press that detached the preview was on a button that has
 * gone with it, which leaves focus on the body — so a keyboard reader's next Tab would restart at
 * the top of the page, and the one control that undoes what they just did is the one they would
 * reach last. `DownloadControls` fixes the same loss for the same reason. Focusing a *button* is
 * safe here in a way focusing a value box is not: `:focus-visible` answers "did the keyboard bring
 * me here" correctly for a button, so a mouse-driven detach does not open a guidance card unasked.
 */
export function DetachedNotice({ onReturn }: DetachedNoticeProps) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <section className="animate-fade-in glass-panel space-y-3 rounded-2xl border border-foundry-700 p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-ink">The preview is in its own window</h3>
      <p className="text-xs leading-relaxed text-ink-muted">
        Both previews, the layout choice and the zoom moved there together, and they follow the dials on this
        page as they always did. Closing that window, or leaving this tab, brings them back here.
      </p>
      <ControlTooltip hint="Bring the preview back" text={QUANTISE_ACTION_TOOLTIPS.reattachPreview}>
        <button
          ref={button}
          type="button"
          onClick={onReturn}
          className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98]"
        >
          <span aria-hidden="true">⤢</span> Bring the preview back
        </button>
      </ControlTooltip>
    </section>
  );
}
