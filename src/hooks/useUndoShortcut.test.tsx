import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useUndoShortcut } from './useUndoShortcut.ts';

/** The hook, and one control of each kind the window-wide binding has to tell apart. */
function Harness({ undo, redo }: { readonly undo: () => void; readonly redo: () => void }) {
  useUndoShortcut(undo, redo);
  return (
    <>
      <input aria-label="name" />
      <input aria-label="locked" readOnly value="" onChange={() => undefined} />
      <input aria-label="dial" type="range" />
    </>
  );
}

/** Render the harness and hand back the two spies the shortcut is meant to reach. */
function harness() {
  const undo = vi.fn();
  const redo = vi.fn();
  const rendered = render(<Harness undo={undo} redo={redo} />);
  return { undo, redo, ...rendered };
}

/** A control by its accessible name, which is what the keypress is dispatched at. */
const control = (name: string) => screen.getByRole(name === 'dial' ? 'slider' : 'textbox', { name });

describe('useUndoShortcut', () => {
  it('runs undo on Ctrl+Z pressed outside any control', () => {
    const { undo, redo } = harness();

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });

    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
  });

  it('runs redo on both Ctrl+Shift+Z and Ctrl+Y', () => {
    const { undo, redo } = harness();

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });

    expect(redo).toHaveBeenCalledTimes(2);
    expect(undo).not.toHaveBeenCalled();
  });

  it('stands aside inside a text box, which has a native stack of its own', () => {
    const { undo } = harness();

    fireEvent.keyDown(control('name'), { key: 'z', ctrlKey: true });

    expect(undo).not.toHaveBeenCalled();
  });

  it('runs inside a read-only box, whose native stack does not exist', () => {
    const { undo } = harness();

    // `NumberField` renders its unavailable state as `readOnly` and keeps the control in the tab
    // order, so a reader can focus one. Nothing in it was ever edited, so the tab's own undo is the
    // only undo in reach.
    fireEvent.keyDown(control('locked'), { key: 'z', ctrlKey: true });

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('runs on a slider, which holds no text and no stack', () => {
    const { undo } = harness();

    fireEvent.keyDown(control('dial'), { key: 'z', ctrlKey: true });

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('stands aside while an overlay is open, which is inert over the tab it would rewrite', () => {
    const { undo } = harness();
    const overlay = document.createElement('dialog');
    overlay.open = true;
    document.body.append(overlay);

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    overlay.remove();

    expect(undo).not.toHaveBeenCalled();
  });

  it('stops listening once the tab unmounts', () => {
    const { undo, unmount } = harness();
    unmount();

    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });

    expect(undo).not.toHaveBeenCalled();
  });
});
