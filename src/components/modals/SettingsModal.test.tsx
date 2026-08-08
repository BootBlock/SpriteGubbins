import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ACCENT_LABELS, DEFAULT_SETTINGS } from '../../constants/settings.ts';
import type { PersistenceBackend } from '../../db/backend.ts';
import { LocalStorageBackend } from '../../db/localStorageBackend.ts';
import { createMemoryStorage } from '../../db/webStorage.ts';
import { useSettingsStore } from '../../stores/useSettingsStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { SettingsModal } from './SettingsModal.tsx';

/**
 * The dialog's job is to be *operable* and to say what it has done, and the two are easy to get
 * wrong in opposite directions here.
 *
 * The swatches are the case worth pinning: nine buttons distinguished by colour, which is exactly
 * the shape that reaches assistive technology as nine identical controls. The name has to come from
 * somewhere other than the fill, and the current one has to be announced as *chosen* rather than
 * merely painted differently — `aria-pressed` carries both the announcement and, through the
 * forced-colours block in `index.css`, the only mark left when the palette is overridden.
 *
 * Backed by a real backend over an in-memory store, as the store tests are, so pressing a control
 * exercises the whole path rather than a spy on the action.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  useUIStore.getState().dismissToast();
  useUIStore.setState({ isSettingsModalOpen: true });
});

afterEach(() => {
  useUIStore.getState().dismissToast();
});

describe('SettingsModal', () => {
  it('gives every accent swatch a name, since colour is the one thing it cannot announce', async () => {
    render(<SettingsModal />);

    for (const label of Object.values(ACCENT_LABELS)) {
      expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the chosen accent as pressed, which is what survives a forced palette', async () => {
    render(<SettingsModal />);

    // `index.css`'s forced-colours block keys the selected state off `aria-pressed`: in that mode
    // the swatch's own colour is replaced by the system palette, so a selection said in colour
    // alone would be said in nothing at all.
    expect(
      await screen.findByRole('button', { name: ACCENT_LABELS[DEFAULT_SETTINGS.accentHue] }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: ACCENT_LABELS.jade })).toHaveAttribute('aria-pressed', 'false');
  });

  it('applies and stores an accent the moment it is pressed', async () => {
    // There is no Save in this dialog, and that is a decision rather than an omission: every one of
    // these preferences takes effect visibly on the click, so collecting them up and asking for
    // confirmation would put a step after the thing the click already did.
    const user = userEvent.setup();
    render(<SettingsModal />);

    await user.click(await screen.findByRole('button', { name: ACCENT_LABELS.jade }));

    expect(useSettingsStore.getState().settings.accentHue).toBe('jade');
    expect((await backend.loadSettings()).accentHue).toBe('jade');
  });

  it('turns the ambient backdrop off and stores that too', async () => {
    const user = userEvent.setup();
    render(<SettingsModal />);

    await user.click(await screen.findByRole('checkbox', { name: /ambient backdrop/i }));

    expect(useSettingsStore.getState().settings.ambientBackdrop).toBe(false);
    expect((await backend.loadSettings()).ambientBackdrop).toBe(false);
  });

  it('puts every preference back at once', async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, accentHue: 'rose', motion: 'reduced', ambientBackdrop: false },
    });
    render(<SettingsModal />);

    await user.click(await screen.findByRole('button', { name: /reset to defaults/i }));

    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(await backend.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('offers the reduce-motion switch as an ordinary choice when the system asks for nothing', () => {
    // The complement of the case below, and the one that would go quiet if `matchMedia` were absent
    // and the control were left permanently unavailable.
    render(<SettingsModal />);

    expect(screen.getByRole('checkbox', { name: /reduce motion/i })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('stands down when the system already asks for reduced motion', () => {
    // The setting can only ever *subtract*, so where the system has already asked there is no
    // choice left to offer — and the honest answer is to say why rather than to grey a control out.
    // `aria-disabled`, not `disabled`, so a keyboard user can still reach it and hear the reason.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));

    render(<SettingsModal />);

    const control = screen.getByRole('checkbox', { name: /reduce motion/i });
    expect(control).toBeChecked();
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/system already asks for reduced motion/i)).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
