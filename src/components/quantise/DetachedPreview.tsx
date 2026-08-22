import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useAdoptedStyles } from '../../hooks/useAdoptedStyles.ts';
import { useSettingsStore } from '../../stores/useSettingsStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';

interface DetachedPreviewProps {
  /** The window the panel has been moved into. */
  readonly target: Window;
  /** The panel itself, rendered here instead of in the page. */
  readonly children: ReactNode;
}

/**
 * The comparison panel, rendered into a window of its own.
 *
 * **A portal, so the panel keeps its state across the move.** Everything the preview is — the zoom,
 * the layout, the wipe position, the linked pan — stays in `ImageComparison`, which never unmounts;
 * only the elements are built somewhere else. The pane stack was already written for that, because
 * choosing a preview layout replaces both scrollports and both canvases anyway: `useLinkedPanes` and
 * the paint effect take the *elements* rather than refs to them, so a fresh pair in a fresh document
 * is a case they already handle. React builds the nodes with the portal container's own
 * `ownerDocument`, so the canvases belong to the detached window rather than to this one.
 *
 * **The three shell attributes come across with it, and the panel is unstyled without them.**
 * `data-tab`, `data-accent` and `data-motion` sit on one element in `App`, and every `--color-tab`,
 * `--color-accent*` and reduced-motion declaration in `index.css` resolves against it — a custom
 * property is substituted at computed-value time, so a subtree with no such ancestor gets no value
 * at all and `bg-tab` paints nothing. That is also why they are read from the same stores `App`
 * reads rather than passed down: two readings of one setting can disagree, and these three decide
 * whether the detached window is the same colour as the page it came from.
 *
 * `--pane-height` is the one thing that is deliberately *not* the same as in the page. The panes are
 * capped at 24rem there because they sit in a column beside ten panels of controls; here the window
 * holds nothing else, and a preview that could not grow past 24rem on a second display would be the
 * whole reason for detaching, undone.
 */
export function DetachedPreview({ target, children }: DetachedPreviewProps) {
  const activeTab = useUIStore((state) => state.activeTab);
  const accentHue = useSettingsStore((state) => state.settings.accentHue);
  const motion = useSettingsStore((state) => state.settings.motion);

  useAdoptedStyles(target.document);

  return createPortal(
    <div
      data-tab={activeTab}
      data-accent={accentHue}
      data-motion={motion === 'reduced' ? 'reduced' : undefined}
      // `min-h-dvh` and the ground colour, because the document behind this has neither: an opened
      // window starts white, and a preview panel floating on white is the one backdrop the artwork
      // must not be judged against.
      className="min-h-dvh bg-foundry-900 p-4 text-ink [--pane-height:max(16rem,calc(100dvh-10rem))]"
    >
      {children}
    </div>,
    target.document.body,
  );
}
