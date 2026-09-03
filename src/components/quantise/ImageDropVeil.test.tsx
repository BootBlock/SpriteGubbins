import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageDropVeil } from './ImageDropVeil.tsx';

/**
 * What the veil says, and that it says it from the top layer.
 *
 * The wording is the whole of what a reader gets out of this surface, and it is the half that can be
 * wrong without anything failing — a veil offering to *replace* a sheet nobody has loaded reads as
 * an app that has lost the file. The lift is asserted through the call rather than the paint: the
 * top layer is not observable from the DOM, and `src/test/setup.ts` stubs the API to no-ops for
 * exactly that reason, so what is checkable is that the attribute and the call arrive together.
 */

describe('ImageDropVeil', () => {
  it('offers to load a sheet while none is held', () => {
    render(<ImageDropVeil currentName={null} />);

    expect(screen.getByText('Drop the sheet anywhere')).toBeInTheDocument();
  });

  it('offers to replace the one that is', () => {
    render(<ImageDropVeil currentName="armour.png" />);

    expect(screen.getByText('Drop anywhere to replace the loaded sheet')).toBeInTheDocument();
  });

  it('lifts itself into the top layer, attribute and call together', () => {
    const show = vi.spyOn(HTMLElement.prototype, 'showPopover');
    const hide = vi.spyOn(HTMLElement.prototype, 'hidePopover');

    const { container, unmount } = render(<ImageDropVeil currentName={null} />);
    const veil = container.firstElementChild;

    // `showPopover()` on an element carrying no `popover` attribute throws, so the two belong
    // together — see `useAnchoredSurface`, which sets both from one place for the same reason.
    expect(veil).toHaveAttribute('popover', 'manual');
    expect(show).toHaveBeenCalledTimes(1);

    unmount();
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('states its own colour, which the user-agent popover stylesheet would otherwise take', () => {
    const { container } = render(<ImageDropVeil currentName={null} />);

    // `[popover]` is given `color: CanvasText` and `width/height: fit-content` by the user agent.
    // Both are silent when they are missed: the first takes the surface out of the palette, and the
    // second shrinks a full-viewport veil to the size of its message.
    expect(container.firstElementChild).toHaveClass('text-ink', 'h-auto', 'w-auto');
  });
});
