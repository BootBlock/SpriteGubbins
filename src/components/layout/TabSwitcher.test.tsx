import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PRESETS } from '../../constants/presets/index.ts';
import { APP_TAB_CHOICES } from '../../constants/ui.ts';
import { resetNavigationForTests, useUIStore } from '../../stores/useUIStore.ts';
import { TabSwitcher } from './TabSwitcher.tsx';

/**
 * Moving between the views, which every screen of the app carries.
 *
 * It is navigation and says so: a `<nav>` of buttons marked with `aria-current`, not a tablist, because
 * pressing one swaps the whole main region rather than revealing a panel that already exists. Below the
 * `sm` breakpoint the labels are screen-reader-only rather than gone, so the accessible name is the
 * same at every width. And the selection is one pill that slides, placed by arithmetic alone — every
 * slot is exactly `1 / n` of the row, so the current one is `index × 100%` along.
 */
function views(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Views' });
}

function viewButton(label: string): HTMLElement {
  return within(views()).getByRole('button', { name: new RegExp(`^${label}`) });
}

afterEach(() => {
  useUIStore.setState({ activeTab: 'studio' });
  resetNavigationForTests();
});

describe('TabSwitcher', () => {
  it('is a navigation landmark of buttons, not a tablist', () => {
    render(<TabSwitcher />);

    expect(within(views()).getAllByRole('button')).toHaveLength(APP_TAB_CHOICES.length);
    // A tablist would promise assistive technology tab panels the page does not have.
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('names every view in the switcher’s own order, and counts the preset library', () => {
    render(<TabSwitcher />);

    const names = within(views())
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(names).toStrictEqual(
      APP_TAB_CHOICES.map(
        (tab) => `${tab.icon}${tab.label}${tab.id === 'presets' ? `(${String(PRESETS.length)})` : ''}`,
      ),
    );
    // The icon is decorative, so the name is the label the sighted reader sees at `sm` and above.
    expect(viewButton('Presets')).toHaveAccessibleName(
      new RegExp(`^Presets\\s*\\(${String(PRESETS.length)}\\)$`),
    );
  });

  it('marks the current view, and only that one', () => {
    useUIStore.setState({ activeTab: 'quantise' });
    render(<TabSwitcher />);

    const current = within(views())
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-current'));
    expect(current).toStrictEqual([viewButton('Quantise')]);
    expect(viewButton('Quantise')).toHaveAttribute('aria-current', 'page');
  });

  it('moves to a view when it is pressed', async () => {
    const user = userEvent.setup();
    render(<TabSwitcher />);

    await user.click(viewButton('Projects'));

    expect(useUIStore.getState().activeTab).toBe('projects');
    expect(viewButton('Projects')).toHaveAttribute('aria-current', 'page');
    expect(viewButton('Studio')).not.toHaveAttribute('aria-current');
  });

  it('slides one indicator to the current view’s slot, without measuring anything', async () => {
    const user = userEvent.setup();
    render(<TabSwitcher />);
    const pill = views().querySelector('[aria-hidden="true"] > span');
    if (!(pill instanceof HTMLElement)) throw new Error('the switcher should draw a selection pill.');

    expect(pill).toHaveStyle({
      width: `${String(100 / APP_TAB_CHOICES.length)}%`,
      transform: 'translateX(0%)',
    });

    const index = APP_TAB_CHOICES.findIndex((tab) => tab.id === 'projects');
    await user.click(viewButton('Projects'));

    // The same element, moved: two fades cannot express travel.
    expect(views().querySelector('[aria-hidden="true"] > span')).toBe(pill);
    expect(pill).toHaveStyle({ transform: `translateX(${String(index * 100)}%)` });
  });
});
