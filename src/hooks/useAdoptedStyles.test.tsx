import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAdoptedStyles } from './useAdoptedStyles.ts';

/**
 * Carrying the app's CSS into a window that inherits none of it.
 *
 * The rules are read from `document.styleSheets` rather than from the elements that produced them,
 * which is what makes one mechanism cover the dev server's injected `<style>` elements and the
 * bundle's single `<link>` alike. happy-dom parses a `<style>` element into a real stylesheet with
 * readable `cssRules`, so that half is exercised here as written; a `<link>` is a fetch this
 * environment does not make, and its coverage is the same code path reached through the same list.
 */
const added: HTMLStyleElement[] = [];

function addSheet(css: string): HTMLStyleElement {
  const element = document.createElement('style');
  element.textContent = css;
  document.head.append(element);
  added.push(element);
  return element;
}

/** A second document, as `window.open` or `requestWindow` hands one over: empty, and unstyled. */
function openTarget(): Document {
  const view = window.open('', '_blank');
  if (view === null) throw new Error('happy-dom refused a window this test needs.');
  return view.document;
}

afterEach(() => {
  for (const element of added.splice(0)) element.remove();
});

describe('useAdoptedStyles', () => {
  it('carries this document’s rules into the other one', () => {
    addSheet('.detached-probe { color: rgb(1, 2, 3); }');
    const target = openTarget();

    renderHook(() => {
      useAdoptedStyles(target);
    });

    expect(target.head.textContent).toContain('.detached-probe');
    expect(target.head.textContent).toContain('rgb(1, 2, 3)');
  });

  it('does nothing at all while the panel is in the page', () => {
    addSheet('.detached-probe { color: rgb(1, 2, 3); }');
    const target = openTarget();

    renderHook(() => {
      useAdoptedStyles(null);
    });

    expect(target.head.textContent).toBe('');
  });

  it('follows a stylesheet that changes, which is every hot update in development', async () => {
    addSheet('.detached-probe { color: rgb(1, 2, 3); }');
    const target = openTarget();
    renderHook(() => {
      useAdoptedStyles(target);
    });

    await act(async () => {
      addSheet('.arrived-later { color: rgb(4, 5, 6); }');
      // A `MutationObserver` delivers in a microtask, so the copy has not run when `append` returns.
      await Promise.resolve();
    });

    expect(target.head.textContent).toContain('.arrived-later');
  });

  it('takes its rules back out when the panel returns to the page', () => {
    addSheet('.detached-probe { color: rgb(1, 2, 3); }');
    const target = openTarget();
    const { unmount } = renderHook(() => {
      useAdoptedStyles(target);
    });

    unmount();

    expect(target.head.textContent).toBe('');
  });
});
