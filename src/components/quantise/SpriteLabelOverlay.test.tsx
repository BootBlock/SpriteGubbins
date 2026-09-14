import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import type { SpriteBox } from '../../types/quantiser.ts';
import { resolveAssignment } from '../../utils/spriteAssignment.ts';
import { SpriteLabelOverlay } from './SpriteLabelOverlay.tsx';

/**
 * The labels over the marked preview: what each sprite will be called, and the press that selects it.
 *
 * The names themselves are pinned in `utils/spriteAssignment.test.ts`. What can only be checked here
 * is that the label a reader sees on the artwork is that name — the claim the whole feature makes —
 * and that the chips are placed on their own sprites rather than all in one corner.
 */

function boxAt(left: number, top = 0): SpriteBox {
  return { left, top, width: 4, height: 4, pixels: 16 };
}

const BOXES = [boxAt(0), boxAt(10), boxAt(20)];
const INVENTORY = ['arm-left', 'arm-right', 'torso'];

function show(magnification = 2, inventory: readonly string[] = INVENTORY) {
  const { edits } = useSpriteAssignmentStore.getState();
  render(
    <SpriteLabelOverlay
      assignment={resolveAssignment(BOXES, edits, inventory)}
      magnification={magnification}
    />,
  );
}

beforeEach(() => {
  useSpriteAssignmentStore.getState().forget();
});

describe('SpriteLabelOverlay', () => {
  it('labels each sprite with the name the download will write', () => {
    show();

    expect(screen.getByRole('button', { name: '1 · arm-left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 · torso' })).toBeInTheDocument();
  });

  it('numbers them where the pieces do not match the inventory', () => {
    show(2, ['arm-left']);

    expect(screen.getByRole('button', { name: '1 · sprite-1' })).toBeInTheDocument();
  });

  it('places each chip on its own sprite, at the canvas’s own magnification', () => {
    // One result pixel covers `zoom * grid` screen pixels, so a chip placed at a result coordinate
    // times that factor lands on the artwork it names. Placed anywhere else, three labels would
    // stack in one corner and name nothing.
    show(4);

    expect(screen.getByRole('button', { name: '2 · arm-right' }).parentElement?.parentElement).toHaveStyle({
      left: '40px',
      top: '0px',
    });
  });

  it('selects the sprite it is pressed on, and lets a second press let go', async () => {
    show();
    const second = screen.getByRole('button', { name: '2 · arm-right' });

    await userEvent.click(second);
    expect(useSpriteAssignmentStore.getState().selected).toStrictEqual({ x: 12, y: 2 });

    await userEvent.click(second);
    expect(useSpriteAssignmentStore.getState().selected).toBeNull();
  });

  it('says a joined sprite is joined rather than repeating its piece’s name', () => {
    // Two chips carrying one name is indistinguishable on the artwork from the duplicate-name error
    // the feature exists to reveal — which is how this state actually looked in the browser.
    useSpriteAssignmentStore.getState().decide({ x: 12, y: 2 }, { kind: 'JOIN', to: { x: 2, y: 2 } });
    show();

    expect(screen.getByRole('button', { name: '2 · joined to 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^2 · sprite/ })).not.toBeInTheDocument();
  });

  it('says which sprites are being left out rather than hiding them', () => {
    // A sprite left out has no piece and so no name, and it stays on the preview: a chip that
    // vanished would leave no way to put it back from the artwork.
    useSpriteAssignmentStore.getState().decide({ x: 12, y: 2 }, { kind: 'LEAVE_OUT' });
    show();

    expect(screen.getByRole('button', { name: '2 · left out' })).toBeInTheDocument();
  });

  it('keeps its pointer press away from the scrollport that would swallow the click', async () => {
    // **The defect only a real browser showed.** `PanViewport` answers a pointerdown by calling
    // `preventDefault` and capturing the pointer, which suppresses the compatibility mouse events —
    // `click` among them. So a mouse press on a chip did nothing at all, while this suite's own
    // `userEvent.click` went on passing, because a synthetic click does not travel that path.
    const ancestor = vi.fn();
    const { edits } = useSpriteAssignmentStore.getState();
    render(
      <div onPointerDown={ancestor}>
        <SpriteLabelOverlay assignment={resolveAssignment(BOXES, edits, INVENTORY)} magnification={2} />
      </div>,
    );

    await userEvent.click(screen.getAllByRole('button', { name: '1 · arm-left' })[0] as HTMLElement);

    expect(ancestor).not.toHaveBeenCalled();
    expect(useSpriteAssignmentStore.getState().selected).toStrictEqual({ x: 2, y: 2 });
  });

  it('ignores a press that travelled, which is a pan and not a click', async () => {
    // The pane is panned by dragging the image and the scrollport captures the pointer, so a drag
    // beginning on a chip still ends as a `click` on it.
    show();
    const chip = screen.getByRole('button', { name: '1 · arm-left' });

    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: chip, coords: { clientX: 10, clientY: 10 } },
      { target: chip, coords: { clientX: 60, clientY: 34 } },
      { keys: '[/MouseLeft]', target: chip, coords: { clientX: 60, clientY: 34 } },
    ]);

    expect(useSpriteAssignmentStore.getState().selected).toBeNull();
  });

  it('judges a keyboard press on its own, whatever a pointer gesture left behind', async () => {
    // A touch drag that lifts off the chip fires a `pointerup` here and no `click`, so the "that was
    // a drag" flag survives the gesture. Without the keyboard's own test it would then swallow the
    // next Enter on any chip in the layer.
    show();
    const chip = screen.getByRole('button', { name: '1 · arm-left' });
    await userEvent.pointer([
      { keys: '[TouchA>]', target: chip, coords: { clientX: 10, clientY: 10 } },
      { target: chip, coords: { clientX: 80, clientY: 60 } },
      { keys: '[/TouchA]', target: chip, coords: { clientX: 80, clientY: 60 } },
    ]);

    screen.getByRole('button', { name: '2 · arm-right' }).focus();
    await userEvent.keyboard('{Enter}');

    expect(useSpriteAssignmentStore.getState().selected).toStrictEqual({ x: 12, y: 2 });
  });
});
