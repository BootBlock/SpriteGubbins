import { useEffect } from 'react';

/**
 * Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y, claimed for the window on behalf of one tab's undo stack.
 *
 * Registered on the window rather than on the panel that carries the two buttons, because the
 * control a reader has just moved is what holds focus when they want it — a slider three panels
 * down, or a combo box in the middle of the subject form. Both tabs that have a stack use this, and
 * only one of them is mounted at a time, so there is never a second listener to disagree with.
 *
 * **A text box keeps its own undo**, which is the one case a window-wide binding must not take: a
 * name field and the combo boxes have a native stack of their own, and a reader pressing the
 * shortcut inside one means that one. A slider or a select is not that case — neither has any undo
 * of its own — so the test is what kind of control has focus rather than whether a control has it.
 */
export function useUndoShortcut(undo: () => void, redo: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTextEntry(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [undo, redo]);
}

/**
 * Whether a keypress landed in something with an undo stack of its own.
 *
 * Text entry only, which is narrower than "an input": a range slider and a select are both form
 * controls and neither has a stack for the shortcut to belong to, and seventeen of the quantiser's
 * twenty dials are one or the other. A `type` a browser does not know falls back to `text`, so an
 * unknown one is treated as text entry — the safe direction, since the cost of being wrong that way
 * is a shortcut that does nothing rather than one that eats a reader's typing.
 */
function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !NON_TEXT_INPUT_TYPES.has(target.type);
}

/** The input types that hold no text, and therefore no undo of their own. */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);
