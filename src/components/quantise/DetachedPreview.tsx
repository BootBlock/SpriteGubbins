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
 *
 * **What that cap subtracts is not the page's arithmetic, however close it once looked.** It was
 * `100dvh - 10rem`, which is the figure the two sticky columns carried, and the resemblance was a
 * coincidence: this window has no header to clear. What it does have is this element's own padding
 * on both edges — `--page-gutter`, the same gutter the page spends, which is why it is written the
 * same way — and the preview panel's own chrome above and below the panes: the panel's padding, the
 * toolbar row, and the caption under each frame.
 *
 * **That chrome is measured, and the old figure was 16px short of it.** In a 950px-tall detached
 * window the panel measures 918px against panes of 774px, so the chrome is 144px — `9rem`, where
 * subtracting the old `10rem` less two 1rem gutters left 8rem. The window scrolled by exactly that
 * 16px, in both the old arithmetic and the first version of this one. It is the only figure here
 * that is not derived, and it holds while the toolbar is one row; a window narrow enough to wrap it
 * grows the chrome, and the window scrolls, which is what the `max()` floor is for as well.
 */
export function DetachedPreview({ target, children }: DetachedPreviewProps) {
  const activeTab = useUIStore((state) => state.activeTab);
  const accentHue = useSettingsStore((state) => state.settings.accentHue);
  const motion = useSettingsStore((state) => state.settings.motion);

  useAdoptedStyles(target.document);

  return createPortal(
    // A `<main>`, because this document has no other content and no chrome to navigate: without a
    // landmark a screen reader in the detached window has nothing to jump to, and the app's rule
    // that every screen keeps one applies to a screen it has opened itself. It carries no
    // `id="main-content"` — that is the opener's skip-link target, and there is no skip link here.
    <main
      data-tab={activeTab}
      data-accent={accentHue}
      data-motion={motion === 'reduced' ? 'reduced' : undefined}
      // `min-h-dvh` and the ground colour, because the document behind this has neither: an opened
      // window starts white, and a preview panel floating on white is the one backdrop the artwork
      // must not be judged against.
      className="min-h-dvh bg-foundry-900 p-[var(--page-gutter)] text-ink [--pane-height:max(16rem,calc(100dvh_-_2_*_var(--page-gutter)_-_9rem))]"
    >
      {children}
    </main>,
    target.document.body,
  );
}
