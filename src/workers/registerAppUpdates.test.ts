import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import type { useUIStore as UIStore } from '../stores/useUIStore.ts';
import { SKIP_WAITING_MESSAGE } from './serviceWorkerProtocol.ts';

const registerSW = vi.hoisted(() => vi.fn<(options: RegisterSWOptions) => () => Promise<void>>());
vi.mock('virtual:pwa-register', () => ({ registerSW }));

/**
 * How a tab learns of a newer build, and when it reloads for one.
 *
 * Issue #369: `autoUpdate` reloaded every open tab the moment any tab installed a new build, and a
 * reload clears what is only on screen. A tab now reloads only for a build its own reader started.
 */

/** A stand-in for `navigator.serviceWorker`: a controller that can be swapped, and a registration. */
class FakeContainer extends EventTarget {
  controller: object | null = {};
  active: object | null = {};
  waiting: { postMessage: ReturnType<typeof vi.fn> } | null = { postMessage: vi.fn() };

  getRegistration() {
    return Promise.resolve({ active: this.active, waiting: this.waiting });
  }

  /** A new worker takes control of this tab, as `skipWaiting()` in any tab makes it. */
  swapController() {
    this.controller = {};
    this.dispatchEvent(new Event('controllerchange'));
  }
}

let container: FakeContainer;
let reload: ReturnType<typeof vi.fn>;
let useUIStore: typeof UIStore;

/**
 * Fresh copies of both near-side modules and of the store they share, so neither the listener one
 * test registers nor the state one test leaves reaches the next.
 */
async function load() {
  vi.resetModules();
  ({ useUIStore } = await import('../stores/useUIStore.ts'));
  const { registerAppUpdates } = await import('./registerAppUpdates.ts');
  const { applyAppUpdate } = await import('./applyAppUpdate.ts');
  return { registerAppUpdates, applyAppUpdate };
}

function lastOptions(): RegisterSWOptions {
  const options = registerSW.mock.lastCall?.[0];
  if (!options) throw new Error('the service worker was never registered');
  return options;
}

beforeEach(() => {
  container = new FakeContainer();
  reload = vi.fn();
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: container });
  vi.stubGlobal('location', { ...window.location, reload });
  registerSW.mockReturnValue(() => Promise.resolve());
});

afterEach(() => {
  registerSW.mockReset();
  vi.unstubAllGlobals();
});

describe('registerAppUpdates', () => {
  it('reports a waiting build rather than starting it', async () => {
    (await load()).registerAppUpdates();

    lastOptions().onNeedRefresh?.();

    expect(useUIStore.getState().appUpdate).toBe('waiting');
    expect(container.waiting?.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('never lets the plugin reload the tab itself', async () => {
    (await load()).registerAppUpdates();

    const { onNeedReload } = lastOptions();
    // Passed at all is what matters: without it the plugin reloads every tab it has told.
    expect(onNeedReload).toBeTypeOf('function');
    onNeedReload?.();

    expect(reload).not.toHaveBeenCalled();
  });

  it('tells a tab another tab moved to a new build, rather than reloading it', async () => {
    (await load()).registerAppUpdates();

    container.swapController();

    await vi.waitFor(() => {
      expect(useUIStore.getState().appUpdate).toBe('elsewhere');
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it('tells a hard-reloaded tab, which has no controller, that another tab moved on', async () => {
    container.controller = null;
    (await load()).registerAppUpdates();

    container.swapController();

    await vi.waitFor(() => {
      expect(useUIStore.getState().appUpdate).toBe('elsewhere');
    });
    expect(reload).not.toHaveBeenCalled();
  });

  it('leaves a first visit’s worker taking control to the isolation bootstrap', async () => {
    container.controller = null;
    container.active = null;
    (await load()).registerAppUpdates();

    container.swapController();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(useUIStore.getState().appUpdate).toBe('current');
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('applyAppUpdate', () => {
  it('starts the waiting build, and reloads once it has taken over', async () => {
    const { registerAppUpdates, applyAppUpdate } = await load();
    registerAppUpdates();

    await applyAppUpdate();

    expect(container.waiting?.postMessage).toHaveBeenCalledWith(SKIP_WAITING_MESSAGE);
    expect(reload).not.toHaveBeenCalled();

    container.swapController();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads a hard-reloaded tab, which has no controller, once the build it started takes over', async () => {
    container.controller = null;
    const { registerAppUpdates, applyAppUpdate } = await load();
    registerAppUpdates();

    await applyAppUpdate();
    container.swapController();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads straight away when no build is waiting any longer', async () => {
    const { registerAppUpdates, applyAppUpdate } = await load();
    registerAppUpdates();
    container.waiting = null;

    await applyAppUpdate();

    expect(reload).toHaveBeenCalledOnce();
  });
});
