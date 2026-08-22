import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDetachedWindow } from './useDetachedWindow.ts';
import type { DocumentPictureInPicture } from '../types/documentPictureInPicture.ts';

/**
 * The window a panel detaches into: how it is opened, how it comes back, and what happens when it
 * cannot be opened at all.
 *
 * happy-dom implements `window.open` — it returns a real second `Window` whose elements are of this
 * same realm — so the popup route can be exercised as written. It implements no picture-in-picture,
 * which is exactly the position Firefox and Safari are in, so the preferred route is stubbed on for
 * the tests that are about it. What happy-dom does *not* do is fire `pagehide` when a window closes,
 * so the tests that are about a reader closing the window dispatch that event themselves.
 */
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** An anchor of a known size, so what the window is asked to open at can be read back. */
function anchorOf(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
  return element;
}

/** A stand-in for the Chromium API, answering with whatever the test wants it to. */
function stubPictureInPicture(answer: () => Promise<Window>): { calls: number } {
  const seen = { calls: 0 };
  const api: DocumentPictureInPicture = Object.assign(new EventTarget(), {
    window: null,
    requestWindow: () => {
      seen.calls += 1;
      return answer();
    },
  });
  vi.stubGlobal('documentPictureInPicture', api);
  return seen;
}

describe('useDetachedWindow', () => {
  it('opens a popup and reports the window it got', () => {
    const { result } = renderHook(() => useDetachedWindow('Preview'));
    expect(result.current.target).toBeNull();

    act(() => {
      result.current.detach(anchorOf(900, 600));
    });

    expect(result.current.target).not.toBeNull();
    expect(result.current.refused).toBe(false);
  });

  it('opens at the size of the box the panel is giving up', () => {
    const open = vi.spyOn(window, 'open');
    const { result } = renderHook(() => useDetachedWindow('Preview'));

    act(() => {
      result.current.detach(anchorOf(900, 600));
    });

    expect(open).toHaveBeenCalledWith('', '_blank', 'popup=yes,width=900,height=600');
  });

  it('opens no smaller than a preview is worth looking at, whatever the box measured', () => {
    const open = vi.spyOn(window, 'open');
    const { result } = renderHook(() => useDetachedWindow('Preview'));

    // What an unmounted or hidden anchor measures — and a size Chromium rejects outright.
    act(() => {
      result.current.detach(anchorOf(0, 0));
    });

    expect(open).toHaveBeenCalledWith('', '_blank', 'popup=yes,width=480,height=360');
  });

  it('re-parses the popup with a doctype, which `about:blank` arrives without', () => {
    const { result } = renderHook(() => useDetachedWindow('Preview'));

    act(() => {
      result.current.detach(anchorOf(900, 600));
    });

    // Quirks mode is what a document with no doctype gets, and there the root element's
    // `clientHeight` reports its own content rather than the viewport — the pair every floating
    // surface in the panel's toolbar is clamped against.
    expect(result.current.target?.document.doctype?.name).toBe('html');
  });

  it('says so when the browser refuses, rather than leaving a control that does nothing', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { result } = renderHook(() => useDetachedWindow('Preview'));

    act(() => {
      result.current.detach(anchorOf(900, 600));
    });

    expect(result.current.target).toBeNull();
    expect(result.current.refused).toBe(true);
  });

  it('closes the window and takes the panel back when asked', () => {
    const { result } = renderHook(() => useDetachedWindow('Preview'));
    act(() => {
      result.current.detach(anchorOf(900, 600));
    });
    const opened = result.current.target;

    act(() => {
      result.current.reattach();
    });

    expect(result.current.target).toBeNull();
    expect(opened?.closed).toBe(true);
  });

  it('takes the panel back when the reader closes the window themselves', () => {
    const { result } = renderHook(() => useDetachedWindow('Preview'));
    act(() => {
      result.current.detach(anchorOf(900, 600));
    });
    const opened = result.current.target;

    act(() => {
      opened?.dispatchEvent(new Event('pagehide'));
    });

    expect(result.current.target).toBeNull();
  });

  it('closes the window when the panel unmounts', () => {
    const { result, unmount } = renderHook(() => useDetachedWindow('Preview'));
    act(() => {
      result.current.detach(anchorOf(900, 600));
    });
    const opened = result.current.target;

    unmount();

    expect(opened?.closed).toBe(true);
  });

  it('closes the popup when the opener goes, which a popup would otherwise outlive', () => {
    const { result } = renderHook(() => useDetachedWindow('Preview'));
    act(() => {
      result.current.detach(anchorOf(900, 600));
    });
    const opened = result.current.target;

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(opened?.closed).toBe(true);
  });

  it('names the window after the sheet, and renames it when the sheet changes', () => {
    const { result, rerender } = renderHook(({ title }) => useDetachedWindow(title), {
      initialProps: { title: 'Sprite Gubbins — first.png' },
    });
    act(() => {
      result.current.detach(anchorOf(900, 600));
    });
    const opened = result.current.target;
    expect(opened?.document.title).toBe('Sprite Gubbins — first.png');

    rerender({ title: 'Sprite Gubbins — second.png' });

    expect(opened?.document.title).toBe('Sprite Gubbins — second.png');
  });

  it('prefers picture-in-picture where the browser has it', async () => {
    const popup = vi.spyOn(window, 'open');
    const chromeless = window.open('', '_blank');
    if (chromeless === null) throw new Error('happy-dom refused a window this test needs.');
    popup.mockClear();
    const api = stubPictureInPicture(() => Promise.resolve(chromeless));

    const { result } = renderHook(() => useDetachedWindow('Preview'));
    await act(async () => {
      result.current.detach(anchorOf(900, 600));
    });

    expect(api.calls).toBe(1);
    expect(popup).not.toHaveBeenCalled();
    expect(result.current.target).toBe(chromeless);
  });

  it('falls back to a popup when picture-in-picture is refused', async () => {
    stubPictureInPicture(() => Promise.reject(new Error('NotAllowedError')));
    const { result } = renderHook(() => useDetachedWindow('Preview'));

    await act(async () => {
      result.current.detach(anchorOf(900, 600));
    });

    expect(result.current.target).not.toBeNull();
    expect(result.current.refused).toBe(false);
  });

  it('reports a refusal only once both routes have refused', async () => {
    stubPictureInPicture(() => Promise.reject(new Error('NotAllowedError')));
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { result } = renderHook(() => useDetachedWindow('Preview'));

    await act(async () => {
      result.current.detach(anchorOf(900, 600));
    });

    expect(result.current.refused).toBe(true);
  });
});
