import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary.tsx';
import { LoadingPlaceholder } from '../common/LoadingPlaceholder.tsx';
import { Modal } from '../common/Modal.tsx';
import { Toast } from '../common/Toast.tsx';
import { useUIStore } from '../../stores/useUIStore.ts';

/*
  The four overlays, each in a chunk of its own.

  `lazy` wants a module whose default export is the component and every module here exports a named
  one, so each import is mapped rather than re-exported: a default added to the content file for the
  loader's convenience would be a second way to import the same component.
*/
const AtlasCalculatorContents = lazy(() =>
  import('../modals/AtlasCalculatorContents.tsx').then((module) => ({
    default: module.AtlasCalculatorContents,
  })),
);
const PromptHistoryContents = lazy(() =>
  import('../modals/PromptHistoryContents.tsx').then((module) => ({
    default: module.PromptHistoryContents,
  })),
);
const SheetSplitContents = lazy(() =>
  import('../modals/SheetSplitContents.tsx').then((module) => ({
    default: module.SheetSplitContents,
  })),
);
const SettingsContents = lazy(() =>
  import('../modals/SettingsContents.tsx').then((module) => ({ default: module.SettingsContents })),
);

/**
 * What fills an overlay's panel until its chunk lands.
 *
 * A well inside the panel rather than a second panel, because the panel it sits in is already
 * painted — the dialog opens on the press, with its own title and its own geometry, and only the
 * body is waiting.
 */
function OverlayFallback({ label }: { readonly label: string }) {
  return <LoadingPlaceholder label={label} className="m-6 h-64 rounded-xl bg-foundry-950" />;
}

/**
 * The dialog frame, filled by whichever chunk the overlay's contents are in.
 *
 * **The frame is deliberately not part of the lazy half.** `Modal` opens a `<dialog showModal()>`
 * on mount and closes it on unmount, so a fallback that was itself a dialog would open one, close
 * it the moment the chunk arrived, and open a second — the backdrop fade and the panel's entrance
 * played twice, and focus moved twice, on every press. Hoisting the frame out leaves exactly one
 * dialog per overlay, opening once, and gives the wait somewhere to be shown.
 */
function LazyOverlay({
  title,
  icon,
  onClose,
  panelClassName,
  children,
}: {
  readonly title: string;
  readonly icon: string;
  readonly onClose: () => void;
  readonly panelClassName: string;
  readonly children: ReactNode;
}) {
  return (
    <Modal title={title} icon={icon} onClose={onClose} panelClassName={panelClassName}>
      <ErrorBoundary what={title}>
        <Suspense fallback={<OverlayFallback label={`Loading ${title}`} />}>{children}</Suspense>
      </ErrorBoundary>
    </Modal>
  );
}

/**
 * Whichever overlay is open, and the notification region when none is.
 *
 * The two belong together because they are one decision. Exactly one toast is ever mounted, and
 * while an overlay is open it belongs *inside* the dialog — see `Modal` — because a modal dialog
 * paints above the whole document and makes the rest of it inert, so a toast out here would be
 * neither visible nor announced. `useUIStore` opens one overlay at a time, which is what lets this
 * read as a chain rather than four independent conditions.
 */
export function AppOverlays() {
  const isAtlasModalOpen = useUIStore((state) => state.isAtlasModalOpen);
  const isHistoryModalOpen = useUIStore((state) => state.isHistoryModalOpen);
  const isSplitModalOpen = useUIStore((state) => state.isSplitModalOpen);
  const isSettingsModalOpen = useUIStore((state) => state.isSettingsModalOpen);
  const toggleAtlasModal = useUIStore((state) => state.toggleAtlasModal);
  const toggleHistoryModal = useUIStore((state) => state.toggleHistoryModal);
  const toggleSplitModal = useUIStore((state) => state.toggleSplitModal);
  const toggleSettingsModal = useUIStore((state) => state.toggleSettingsModal);

  if (isAtlasModalOpen) {
    return (
      <LazyOverlay
        title="Sprite Atlas & Grid Calculator"
        icon="📊"
        onClose={toggleAtlasModal}
        panelClassName="glass-panel max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-foundry-700 shadow-2xl"
      >
        <AtlasCalculatorContents />
      </LazyOverlay>
    );
  }

  if (isHistoryModalOpen) {
    return (
      <LazyOverlay
        title="Prompt History"
        icon="🕓"
        onClose={toggleHistoryModal}
        panelClassName="glass-panel ml-auto flex h-full w-full max-w-md flex-col self-stretch overflow-hidden rounded-2xl border border-foundry-700 shadow-2xl"
      >
        <PromptHistoryContents />
      </LazyOverlay>
    );
  }

  if (isSplitModalOpen) {
    return (
      <LazyOverlay
        title="Split into separate sheets"
        icon="🧩"
        onClose={toggleSplitModal}
        panelClassName="glass-panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-foundry-700 shadow-2xl"
      >
        <SheetSplitContents />
      </LazyOverlay>
    );
  }

  if (isSettingsModalOpen) {
    return (
      <LazyOverlay
        title="Settings"
        icon="⚙️"
        onClose={toggleSettingsModal}
        panelClassName="glass-panel max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-foundry-700 shadow-2xl"
      >
        <SettingsContents />
      </LazyOverlay>
    );
  }

  return <Toast />;
}
