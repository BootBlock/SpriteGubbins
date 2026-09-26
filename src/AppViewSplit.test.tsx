import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App.tsx';
import { APP_TAB_CHOICE_BY_ID } from './constants/ui.ts';
import { useUIStore } from './stores/useUIStore.ts';
import { APP_TABS } from './types/ui.ts';

/**
 * Every view is in a chunk of its own, so the shell mounts a placeholder first and the
 * view once its chunk lands. These assertions are what would catch a static import being put back:
 * with one, the view is there in the first commit and there is no placeholder to find.
 *
 * **A file of its own rather than more cases in `App.test.tsx`**, because `lazy` caches its resolved
 * module on the object `App` holds at module scope — so a suite that renders a tab twice sees the
 * placeholder only the first time, and one that renders all four up front sees it never. Vitest
 * gives each test file its own module registry, which is what makes each tab's first render happen
 * here exactly once.
 *
 * **The page's one `<h1>` is asserted here too, once the view is up**, because this is the one place
 * every view is mounted. Every heading outline in the app used to start at `<h2>`, which left a
 * screen-reader user with nothing to orient from; the repair is one `<h1>` in the shell rather than
 * one per view, so what is held is that the shell's is the only one with any view beneath it, and
 * that it names the view showing. Rendering each view a second time in `App.test.tsx` to ask that
 * cost a cold load of every chunk for no assertion this one cannot make.
 */
describe('App view split', () => {
  for (const tab of APP_TABS) {
    it(`holds the space with a loading placeholder until the ${tab} chunk lands, under one h1 naming it`, async () => {
      // Through the store's own action: `App` fetches the settings on boot, and `openInitialTab`
      // moves the app to the stored opening view unless somebody has navigated. `setActiveTab` is
      // what records that they have, so the view being waited for stays the view under test.
      useUIStore.getState().setActiveTab(tab);
      render(<App />);

      const label = `Loading ${APP_TAB_CHOICE_BY_ID[tab].label}`;
      expect(screen.getByText(label)).toBeInTheDocument();

      // …and the view replaces it, inside the landmark rather than beside it.
      // A generous window, and the case that needs it is a cold transform of that view's whole
      // import graph under a full suite. It is paired with the timeout on the case itself: a
      // `waitFor` cannot outlive the test around it, so a window wider than Vitest's five-second
      // default buys nothing on its own — it just reports the timeout from the wrong place.
      await waitFor(
        () => {
          expect(screen.queryByText(label)).not.toBeInTheDocument();
        },
        { timeout: 20_000 },
      );
      // The view replaced the placeholder *inside* the landmark rather than beside it: `main` holds
      // the screen-reader heading and the boundary's one child, whichever of the two that is. A
      // count is what states this — a boundary moved out of `main` leaves one child in both states,
      // where `> 1` would have been satisfied by the placeholder itself.
      const main = screen.getByRole('main');
      expect(main.children).toHaveLength(2);
      expect(main.children[1]).not.toHaveAttribute('role', 'status');

      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(APP_TAB_CHOICE_BY_ID[tab].label);
    }, 30_000);
  }
});
