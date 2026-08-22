import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App.tsx';
import { APP_TAB_CHOICE_BY_ID } from './constants/ui.ts';
import { useUIStore } from './stores/useUIStore.ts';
import { APP_TABS } from './types/ui.ts';

/**
 * Every heading outline in the app used to start at `<h2>`, which left a screen-reader user with
 * nothing to orient from and the heading-navigation shortcut reaching nothing. The repair is one
 * `<h1>` in the shell rather than one per view, so these assertions are about the shell: that it
 * renders exactly one, and that the one it renders says which view is showing.
 */
describe('App', () => {
  for (const tab of APP_TABS) {
    it(`renders exactly one h1, naming the ${tab} view`, () => {
      useUIStore.setState({ activeTab: tab });
      render(<App />);

      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(APP_TAB_CHOICE_BY_ID[tab].label);
    });
  }

  // The class rather than a computed style, because the tests render without the stylesheet — and
  // the class *is* the mechanism, so this is the assertion that would catch the heading being turned
  // into a visible title. It is deliberately not one: three of the four views already paint their
  // own, and the studio opens straight on its two panels, so painting this would be a design change
  // riding in behind an accessibility fix.
  it('leaves the heading unpainted, so no view gains a title it was not designed with', () => {
    useUIStore.setState({ activeTab: 'studio' });
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only');
  });

  it('keeps the heading inside the main landmark, where heading navigation lands', () => {
    useUIStore.setState({ activeTab: 'studio' });
    render(<App />);

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
  });
});
