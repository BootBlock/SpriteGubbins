import { lazy, Suspense, useEffect } from 'react';
import type { ComponentType } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { LoadingPlaceholder } from './components/common/LoadingPlaceholder.tsx';
import { AppOverlays } from './components/layout/AppOverlays.tsx';
import { Header } from './components/layout/Header.tsx';
import { PWAInstallBanner } from './components/layout/PWAInstallBanner.tsx';
import { SkipLink } from './components/layout/SkipLink.tsx';
import { APP_TAB_CHOICE_BY_ID } from './constants/ui.ts';
import { useFileDropGuard } from './hooks/useFileDropGuard.ts';
import { useProjectStore } from './stores/useProjectStore.ts';
import { usePresetStore } from './stores/usePresetStore.ts';
import { useQuantisePresetStore } from './stores/useQuantisePresetStore.ts';
import { useSessionStore } from './stores/useSessionStore.ts';
import { useSettingsStore } from './stores/useSettingsStore.ts';
import { useUIStore } from './stores/useUIStore.ts';
import type { BeforeInstallPromptEvent } from './types/pwa.ts';
import type { AppTab } from './types/ui.ts';

/**
 * Which component each view is, and each one in a chunk of its own.
 *
 * A record rather than a chain of conditionals, so `satisfies Record<AppTab, …>` makes the mapping
 * exhaustive: adding a view to `AppTab` without a component here is a compile error, rather than a
 * tab that navigates to nothing.
 *
 * `lazy` is what splits them. The shell mounts exactly one of these at a time, so a reader opening
 * the app to compose one prompt was parsing every view before the studio painted — the quantiser's
 * whole image pipeline included, which the studio never calls. Each `lazy` here is a dynamic import,
 * which is the seam the bundler splits on, and the service worker precaches every chunk it emits —
 * so the split costs a network request on a first visit and nothing at all after it.
 *
 * The mapping is written out rather than built from a template literal: a bundler can only follow
 * an `import()` whose specifier it can read, and `import(`./components/tabs/${id}Tab.tsx`)` emits a
 * chunk per matching file with no way to tell which one a tab wants.
 */
const VIEWS = {
  studio: lazy(() => import('./components/tabs/StudioTab.tsx').then((m) => ({ default: m.StudioTab }))),
  quantise: lazy(() => import('./components/tabs/QuantiseTab.tsx').then((m) => ({ default: m.QuantiseTab }))),
  presets: lazy(() => import('./components/tabs/PresetsTab.tsx').then((m) => ({ default: m.PresetsTab }))),
  projects: lazy(() => import('./components/tabs/ProjectsTab.tsx').then((m) => ({ default: m.ProjectsTab }))),
  spec: lazy(() => import('./components/tabs/SpecTab.tsx').then((m) => ({ default: m.SpecTab }))),
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
  const setInstallPrompt = useUIStore((state) => state.setInstallPrompt);
  const fetchCustomPresets = usePresetStore((state) => state.fetchCustomPresets);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const accentHue = useSettingsStore((state) => state.settings.accentHue);
  const motion = useSettingsStore((state) => state.settings.motion);
  const ambientBackdrop = useSettingsStore((state) => state.settings.ambientBackdrop);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const restoreSession = useSessionStore((state) => state.restoreSession);
  const fetchQuantisePresets = useQuantisePresetStore((state) => state.fetchQuantisePresets);

  // Refuse a file, or a link, dropped anywhere in the page that can make no use of it, which is
  // otherwise a navigation away from the app and the loss of everything the Quantise tab holds. A
  // box that edits text is the exception, and the hook says how it tells one. Registered from
  // the shell because the default it answers belongs to the document rather than to any element, and
  // handed this window explicitly because the app can open a second one — see the hook.
  useFileDropGuard(window);

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

  // …and the projects both collections are filed under, which also makes the Default project on an
  // install that has none. It is fetched here rather than by the Projects tab for the reason the
  // two collections are: the save panels in the Studio and the Quantise tab both offer the list, so
  // it has to be loaded whether or not that tab has ever been opened.
  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // …and the quantiser's, here rather than when that tab mounts: `App` swaps the whole view on
  // navigation, so a fetch on mount would re-read the collection on every trip to the studio and
  // back — one database round trip per navigation, for a collection that cannot have changed.
  useEffect(() => {
    void fetchQuantisePresets();
  }, [fetchQuantisePresets]);

  // …and the interface preferences, which also decide which view this lands on. The app is on the
  // studio until this resolves — opening a database is a worker, a WebAssembly module and an OPFS
  // pool — so `openInitialTab` inside the store declines to move anyone who has navigated meanwhile.
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // …and the studio itself, as it was left. This one arms the writes as well as reading, and the
  // order is what makes that safe: the subscriptions go on *after* the read resolves, so the boot
  // defaults sitting in the stores until then never overwrite the session being restored. Strict
  // Mode's double invocation is handled in the store, which joins the second call to the first.
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const ActiveView = VIEWS[activeTab];

  return (
    /*
      Three attributes, all here for the same reason and none of them passed down as a prop: each
      decides the value of a custom property, and a custom property is substituted at computed-value
      time — so the assignment has to sit on the element the `var()`s resolve against, and everything
      the app renders is inside this one.

      `data-tab` is what lights the page. Every surface that follows the active view — the wash, the
      dot grid, each panel's top edge, the switcher's pill, every section heading — reads
      `--color-tab`, and this attribute is the single place it is decided.

      `data-accent` repoints the three accent tokens to the hue the user chose. It is deliberately
      *not* the same mechanism as the one above and cannot reach it: the view keeps its own colour
      whatever the accent is, which is how the app goes on saying which view you are looking at.

      `data-motion` is the in-app half of reduced motion — see the rule at the bottom of `index.css`,
      which the settings dialog can turn on without touching a system preference.
    */
    <div
      data-tab={activeTab}
      data-accent={accentHue}
      data-motion={motion === 'reduced' ? 'reduced' : undefined}
      className="relative flex min-h-dvh flex-col bg-foundry-900 text-ink"
    >
      {/*
        Four decorative layers, painted back to front: the aurora wash that gives the page depth,
        the technical dot grid over it, and the two orbs drifting on top out of phase. All fixed,
        all `pointer-events-none`, all hidden from assistive technology — none of it is content.

        The first orb carries the view's colour and the second stays on the primary, so the pair
        reads as the page being lit from two directions rather than dipped in one — and the moving
        one is what makes a view change visible out at the edges of the layout.

        Switched off as a set rather than dimmed, and unmounted rather than hidden. This is a tool
        for judging artwork, and the objection it answers is that the wash tints the whole page in
        the active view's hue — a sprite's colours are being read against it. Half a backdrop would
        be the same objection with more steps.
      */}
      {ambientBackdrop && (
        <>
          <div aria-hidden="true" className="animate-aurora pointer-events-none fixed inset-0 bg-aurora" />
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />
          <div
            aria-hidden="true"
            className="animate-float-orb pointer-events-none fixed -top-40 left-1/4 size-[28rem] rounded-full bg-tab/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="animate-float-orb-slow pointer-events-none fixed -bottom-40 right-1/4 size-[24rem] rounded-full bg-accent-soft/10 blur-3xl"
          />
        </>
      )}

      <div className="relative flex min-h-dvh flex-col">
        {/* First in the document, because a bypass reached after the chrome bypasses nothing. */}
        <SkipLink />

        <Header />
        <PWAInstallBanner />

        {/*
          `tabIndex={-1}` is what makes the link above move *focus* and not merely the viewport. A
          fragment jump scrolls to any element, but it only hands focus to one that can hold it — so
          without this, the next Tab carries on from the link and lands back in the chrome.
        */}
        {/*
          The padding is `--page-gutter` rather than a padding utility with an `md:` step above it,
          because it is not only this element's padding: all three sticky columns leave the same
          room above themselves, the two capped ones leave it below as well, and `DetachedPreview`
          pads its own window with it. One
          declaration in `index.css` carries the responsive step, and nothing here can drift from
          it — a second padding utility beside the token is what `tests/sticky-column-offset.test.ts`
          refuses.
        */}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 p-[var(--page-gutter)]"
        >
          {/*
            The page's only `<h1>`, and the top of an outline every view then continues at `<h2>`.
            It is here rather than in each view for two reasons: it is the one place that can
            guarantee exactly one of them exists, so a view added later cannot arrive without one;
            and the heading has to say *where the reader is*, which is a fact the shell holds and a
            view does not — the switcher already claims `aria-current="page"` for these, and this is
            the heading that claim implies.

            Screen-reader-only, because it is not a title the layout is missing. Three of the four
            views already paint their own title, and the studio deliberately opens straight on its
            two panels; a visible heading above them would be a design change smuggled in behind an
            accessibility fix. What is repaired is the outline and the heading-navigation shortcut,
            neither of which is painted.

            The name in the header is not this heading and must not become it: `Wordmark` is a link
            that leaves the site, so wrapping it would announce the page's title as an external
            destination.
          */}
          <h1 className="sr-only">{APP_TAB_CHOICE_BY_ID[activeTab].label}</h1>

          {/*
            One Suspense boundary for every view, rather than one per view: navigating is a synchronous
            update rather than a transition, so React shows this fallback for whichever view is
            arriving — driven in Edge, with and without a `key` on the boundary, and the placeholder
            appears either way. The label is read from the tab being navigated *to*, which is what
            makes the wait belong to the press.

            The error boundary *is* keyed, and for the opposite reason: a caught error latches until
            the boundary is replaced, so an unkeyed one would answer the next tab's press with the
            failure notice for the tab before it.
          */}
          <ErrorBoundary key={activeTab} what={`the ${APP_TAB_CHOICE_BY_ID[activeTab].label} view`}>
            <Suspense
              fallback={
                <LoadingPlaceholder
                  label={`Loading ${APP_TAB_CHOICE_BY_ID[activeTab].label}`}
                  className="glass-panel h-96 rounded-2xl border border-foundry-700"
                />
              }
            >
              <ActiveView />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Whichever overlay is open — each in its own chunk — or the notification region when none
          is. The two are one decision, which is why they are one component; `AppOverlays` says why. */}
      <AppOverlays />
    </div>
  );
}
