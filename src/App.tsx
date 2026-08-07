import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { Toast } from './components/common/Toast.tsx';
import { Header } from './components/layout/Header.tsx';
import { PWAInstallBanner } from './components/layout/PWAInstallBanner.tsx';
import { AtlasCalculatorModal } from './components/modals/AtlasCalculatorModal.tsx';
import { HistoryModal } from './components/modals/HistoryModal.tsx';
import { SheetSplitModal } from './components/modals/SheetSplitModal.tsx';
import { PresetsTab } from './components/tabs/PresetsTab.tsx';
import { QuantiseTab } from './components/tabs/QuantiseTab.tsx';
import { SpecTab } from './components/tabs/SpecTab.tsx';
import { StudioTab } from './components/tabs/StudioTab.tsx';
import { usePresetStore } from './stores/usePresetStore.ts';
import { useUIStore } from './stores/useUIStore.ts';
import type { BeforeInstallPromptEvent } from './types/pwa.ts';
import type { AppTab } from './types/ui.ts';

/**
 * Which component each view is.
 *
 * A record rather than a chain of conditionals, so `satisfies Record<AppTab, …>` makes the mapping
 * exhaustive: adding a view to `AppTab` without a component here is a compile error, rather than a
 * tab that navigates to nothing.
 */
const VIEWS = {
  studio: StudioTab,
  quantise: QuantiseTab,
  presets: PresetsTab,
  spec: SpecTab,
} satisfies Record<AppTab, ComponentType>;

/**
 * The application shell: the ambient frame, the chrome, whichever view is active, the overlays and
 * the notification region.
 *
 * Composition and two boot-time effects, nothing else. Every panel below reaches into the stores
 * itself, so no state and no handler is threaded through this file — which is what stops the
 * top-level component becoming the place every feature has to touch.
 */
export function App() {
  const activeTab = useUIStore((state) => state.activeTab);
  const isAtlasModalOpen = useUIStore((state) => state.isAtlasModalOpen);
  const isHistoryModalOpen = useUIStore((state) => state.isHistoryModalOpen);
  const isSplitModalOpen = useUIStore((state) => state.isSplitModalOpen);
  const setInstallPrompt = useUIStore((state) => state.setInstallPrompt);
  const fetchCustomPresets = usePresetStore((state) => state.fetchCustomPresets);

  // Catch the browser's install offer and hold on to it, so the app can make the offer itself at a
  // moment that makes sense rather than letting the mini-infobar interrupt.
  useEffect(() => {
    function captureInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
    };
  }, [setInstallPrompt]);

  // Bring last session's saved presets into the store. Failures raise a toast inside the store, so
  // there is nothing to handle here.
  useEffect(() => {
    void fetchCustomPresets();
  }, [fetchCustomPresets]);

  const ActiveView = VIEWS[activeTab];

  return (
    <div className="relative flex min-h-dvh flex-col bg-foundry-900 text-ink">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />
      <div
        aria-hidden="true"
        className="animate-float-orb pointer-events-none fixed -top-40 left-1/4 size-[28rem] rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-float-orb-slow pointer-events-none fixed -bottom-40 right-1/4 size-[24rem] rounded-full bg-accent-soft/10 blur-3xl"
      />

      <div className="relative flex min-h-dvh flex-col">
        <Header />
        <PWAInstallBanner />

        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
          <ActiveView />
        </main>
      </div>

      {isAtlasModalOpen && <AtlasCalculatorModal />}
      {isHistoryModalOpen && <HistoryModal />}
      {isSplitModalOpen && <SheetSplitModal />}

      {/*
        Exactly one toast is ever mounted. While an overlay is open it belongs inside the dialog —
        see `Modal` — because a modal dialog paints above the whole document and makes the rest of
        it inert, so a toast out here would be neither visible nor announced. The store guarantees
        the overlays are never open at once, so these cases are mutually exclusive.
      */}
      {!isAtlasModalOpen && !isHistoryModalOpen && !isSplitModalOpen && <Toast />}
    </div>
  );
}
