import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App.tsx';
import { APP_TAB_CHOICE_BY_ID } from './constants/ui.ts';
import { useUIStore } from './stores/useUIStore.ts';
import { APP_TABS } from './types/ui.ts';
import type { AppTab } from './types/ui.ts';

/**
 * Every heading outline in the app used to start at `<h2>`, which left a screen-reader user with
 * nothing to orient from and the heading-navigation shortcut reaching nothing. The repair is one
 * `<h1>` in the shell rather than one per view, so these assertions are about the shell: that it
 * renders exactly one, and that the one it renders says which view is showing.
 *
 * **Every case here waits for the view before asserting**, because the views are each behind
 * `React.lazy`. Asserting synchronously would not merely check less — the dynamic import it starts
 * settles after the case has finished, and Vitest tears the module registry down under it, which
 * surfaces as `Element type is invalid … got: undefined` in whichever case happened to be last.
 * `renderApp` is the wait, and it is also what puts the view's own markup back in front of the
 * bypass assertion below, which is measuring the whole document's focus order.
 */
async function renderApp(tab: AppTab) {
  // Through the store's own action rather than `setState`, because waiting exposes something an
  // instant assertion never reached: `App` fetches the settings on boot, and `openInitialTab`
  // then moves the app to the stored opening view unless somebody has navigated. `setActiveTab`
  // is what records that they have.
  useUIStore.getState().setActiveTab(tab);
  const result = render(<App />);

  // The placeholder's own label, not `role="status"` in general: two of the views render a
  // live region of their own once they are up, so "no status anywhere" is never true for those and
  // the wait would run to its timeout. A tab whose chunk has already resolved in this file shows no
  // placeholder at all and renders in the first commit, which this passes through immediately.
  await waitFor(
    () => {
      expect(screen.queryByText(`Loading ${APP_TAB_CHOICE_BY_ID[tab].label}`)).toBeNull();
    },
    { timeout: 20_000 },
  );
  return result;
}
describe('App', () => {
  for (const tab of APP_TABS) {
    it(`renders exactly one h1, naming the ${tab} view`, async () => {
      await renderApp(tab);

      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(APP_TAB_CHOICE_BY_ID[tab].label);
    }, 30_000);
  }

  // The class rather than a computed style, because the tests render without the stylesheet — and
  // the class *is* the mechanism, so this is the assertion that would catch the heading being turned
  // into a visible title. It is deliberately not one: most of the views already paint their
  // own, and the studio opens straight on its two panels, so painting this would be a design change
  // riding in behind an accessibility fix.
  it('leaves the heading unpainted, so no view gains a title it was not designed with', async () => {
    await renderApp('studio');

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only');
  }, 30_000);

  it('keeps the heading inside the main landmark, where heading navigation lands', async () => {
    await renderApp('studio');

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
  }, 30_000);

  /*
   * `SkipLink` can say what it points at; only the shell can say that the target is there and that
   * nothing focusable comes first. A bypass reached after the chrome bypasses nothing.
   */
  it('opens the document with the bypass, ahead of every other focusable thing', async () => {
    const { container } = await renderApp('studio');

    const focusable = container.querySelectorAll('a[href], button, select, input, [tabindex]');
    expect(focusable[0]).toBe(screen.getByRole('link', { name: 'Skip to main content' }));
  }, 30_000);

  it('gives the bypass a landmark to land on, and one that can hold focus', async () => {
    await renderApp('studio');

    // The fragment and the id are written down in two files, so the pair is what is asserted — and
    // `tabIndex` is what makes following it move focus rather than only the viewport.
    const landmark = screen.getByRole('main');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      `#${landmark.id}`,
    );
    expect(landmark).toHaveAttribute('tabindex', '-1');
  }, 30_000);
});
