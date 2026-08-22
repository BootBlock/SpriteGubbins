import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useAdoptedStyles } from '../../hooks/useAdoptedStyles.ts';
import { ToastSurface } from '../../hooks/useShowToast.ts';
import { useSettingsStore } from '../../stores/useSettingsStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { Toast } from '../common/Toast.tsx';

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
 * **The panel's notifications come with it, and they are addressed rather than duplicated.** Every
 * download the toolbar offers answers with a toast — what was written and how, or why nothing was —
 * and the panel's toolbar travels here whole, so those presses happen in this document. The page's
 * `<Toast />` cannot paint here, and a second unaddressed one would show the page's notifications
 * too: the store holds one message, so both surfaces would announce every one of them and both
 * timers would drain the same state. So `ToastSurface` tells everything below where it is, the
 * `<Toast />` here shows only what is addressed to it, and `recallToast` brings a notification that
 * is still up back into the page when this window goes — which it can do at any moment, since the
 * reader may close it themselves.
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

  // Unmount only, and deliberately not keyed on `target`: the reader pressing Return, closing the
  // window, and navigating away from the quantiser all arrive here as this component going away, and
  // a notification still on screen has nowhere left to be shown. Strict Mode's spurious first
  // cleanup finds nothing addressed here — this surface is the only thing that can address one — so
  // it recalls nothing.
  useEffect(
    () => () => {
      useUIStore.getState().recallToast();
    },
    [],
  );

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
      className="min-h-dvh bg-foundry-900 p-4 text-ink [--pane-height:max(16rem,calc(100dvh-10rem))]"
    >
      <ToastSurface value="detached">
        {children}
        {/*
          Inside the `<main>` rather than beside it, so it inherits `data-accent` — the card's ground
          is `accent-strong` fading to `accent`, and a subtree with no such ancestor resolves those
          custom properties to nothing at all. `Modal` mounts its own for the same shape of reason.
        */}
        <Toast target="detached" />
      </ToastSurface>
    </main>,
    target.document.body,
  );
}
