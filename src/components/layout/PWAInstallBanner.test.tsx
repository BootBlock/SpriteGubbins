import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../stores/useUIStore.ts';
import type { BeforeInstallPromptChoice, BeforeInstallPromptEvent } from '../../types/pwa.ts';
import { PWAInstallBanner } from './PWAInstallBanner.tsx';

/**
 * The offer to install the app, shown only when the browser has made one.
 *
 * The browser's deferred event can be spent once: calling `prompt()` on a spent event rejects. So the
 * banner drops the event the moment it is used, before the browser's own dialogue is even awaited,
 * which is what makes a second press impossible rather than merely unhelpful — and when the browser
 * refuses anyway, the reader is told, rather than left with a button that appeared to do nothing.
 */
const ACCEPTED: BeforeInstallPromptChoice = { outcome: 'accepted', platform: 'web' };

function offer(prompt: () => Promise<void>): BeforeInstallPromptEvent {
  return Object.assign(new Event('beforeinstallprompt'), {
    platforms: ['web'],
    userChoice: Promise.resolve(ACCEPTED),
    prompt,
  });
}

function renderOffering(prompt: () => Promise<void>) {
  act(() => {
    useUIStore.getState().setInstallPrompt(offer(prompt));
  });
  return render(<PWAInstallBanner />);
}

afterEach(() => {
  useUIStore.getState().setInstallPrompt(null);
  useUIStore.getState().dismissToast();
});

describe('PWAInstallBanner', () => {
  it('offers nothing until the browser has made an offer', () => {
    const { container } = render(<PWAInstallBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('spends the offer once, taking the banner down before the browser’s dialogue is answered', async () => {
    const user = userEvent.setup();
    // A dialogue the reader has not answered yet, and never will in this test.
    const prompt = vi.fn(() => new Promise<void>(() => undefined));
    renderOffering(prompt);

    await user.click(screen.getByRole('button', { name: 'Install' }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(useUIStore.getState().deferredPWAInstallPrompt).toBeNull();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('says so when the browser will not open its dialogue', async () => {
    const user = userEvent.setup();
    renderOffering(() => Promise.reject(new DOMException('The prompt has already been used.')));

    await user.click(screen.getByRole('button', { name: 'Install' }));

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('The browser would not open its install dialogue');
    });
  });

  it('lets the offer go on “Not now” without opening anything', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn(() => Promise.resolve());
    renderOffering(prompt);

    await user.click(screen.getByRole('button', { name: 'Not now' }));

    expect(prompt).not.toHaveBeenCalled();
    expect(useUIStore.getState().deferredPWAInstallPrompt).toBeNull();
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
  });
});
