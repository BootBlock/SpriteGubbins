import { useEffect, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

interface ComboBoxParams {
  readonly options: readonly string[];
  /** Called with the option the user took. */
  readonly onCommit: (option: string) => void;
  /** Wraps the whole control, so a press outside it can be recognised. */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** The scrolling options container, so the highlight can be kept in view. */
  readonly listboxRef: RefObject<HTMLDivElement | null>;
}

export interface ComboBoxState {
  readonly isOpen: boolean;
  /** The keyboard highlight. `-1` means "nothing highlighted", not "the first option". */
  readonly activeIndex: number;
  open(): void;
  toggle(): void;
  highlight(index: number): void;
  /** Take an option: report it and close. */
  commit(option: string): void;
  /** Arrow / Enter / Escape / Tab handling for the text field. */
  handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}

/**
 * The interaction half of `ComboBox` — open state, the keyboard highlight, and the two listeners the
 * pattern needs.
 *
 * Separated from the markup because they are two responsibilities, and the combined file had grown
 * past the size at which that stops being obvious. Not a general-purpose abstraction: it implements
 * the ARIA editable-combobox keyboard contract for exactly one component, and belongs to it.
 *
 * The refs are **passed in rather than created here**, and nothing ref-shaped comes back. A hook that
 * returned refs alongside its state would have the component reading them out of that object during
 * render, which the React Compiler rules reject — correctly, since a ref's value is not something a
 * render may depend on.
 */
export function useComboBox({ options, onCommit, containerRef, listboxRef }: ComboBoxParams): ComboBoxState {
  const [isOpen, setIsOpen] = useState(false);
  const [storedIndex, setActiveIndex] = useState(-1);

  /**
   * The highlight, clamped to the pool that is actually on screen.
   *
   * `options` is replaced wholesale when the category changes, and the component is *not* remounted
   * — every category defines the same sixteen field keys, so React reuses the element. A highlight
   * left over from a longer pool would otherwise point `aria-activedescendant` at an id that no
   * longer exists, and Enter would silently commit nothing.
   */
  const activeIndex = storedIndex < options.length ? storedIndex : -1;

  function close() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  // A pointer press anywhere else dismisses the list. `mousedown` rather than `click`, so the list is
  // gone before the press lands on whatever was underneath it.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && containerRef.current?.contains(target) === false) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [containerRef]);

  // Keep the highlight in view: the list scrolls, and a highlight the keyboard has moved past the
  // fold is a highlight the user cannot see.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const option = listboxRef.current?.children[activeIndex];
    if (option instanceof HTMLElement) option.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex, listboxRef]);

  return {
    isOpen,
    activeIndex,
    open: () => {
      setIsOpen(true);
    },
    toggle: () => {
      setIsOpen((current) => !current);
    },
    highlight: setActiveIndex,
    commit: (option) => {
      onCommit(option);
      close();
    },
    handleKeyDown: (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Claimed before the field can move the caret, which would otherwise jump to either end.
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => {
          // Nothing highlighted yet: down starts at the first option and up at the last, which is
          // what a native `<select>` does. Treating -1 as an ordinary index instead would send an
          // opening ArrowUp into the middle of the pool.
          if (current < 0) return step === 1 ? 0 : options.length - 1;
          // Wraps, so holding a key cannot strand the highlight at an end of a sixteen-option pool.
          return (current + step + options.length) % options.length;
        });
        return;
      }

      if (event.key === 'Enter' && isOpen) {
        const option = options[activeIndex];
        if (option !== undefined) {
          event.preventDefault();
          onCommit(option);
          close();
        }
        return;
      }

      if (event.key === 'Escape') {
        close();
        return;
      }

      // Tab must move focus, not be swallowed — so the list closes and the key is left alone.
      // `close()`, not just `setIsOpen(false)`: leaving the highlight behind is how it survives to
      // meet a different pool.
      if (event.key === 'Tab') close();
    },
  };
}
