import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './Toast.tsx';

interface ModalProps {
  readonly title: string;
  /** Decorative glyph beside the title. */
  readonly icon: string;
  readonly onClose: () => void;
  /**
   * Geometry and surface for the panel inside the overlay. A centred card takes a width and a
   * radius; the history drawer takes `ml-auto h-full self-stretch` to pin itself to the trailing
   * edge instead.
   */
  readonly panelClassName: string;
  readonly children: ReactNode;
}

/**
 * The shell both overlays sit in.
 *
 * Built on the native `<dialog>` element rather than a stack of positioned `<div>`s. That is what
 * makes the modality real: the top layer, the inert background, focus containment and Escape all
 * come from the platform, and hand-rolling them is how modals end up letting Tab wander behind the
 * overlay. `showModal()` has to be called imperatively, which is the one thing the element cannot
 * express declaratively — hence the effect, which closes the dialog again on unmount.
 *
 * There is deliberately no dismiss-on-backdrop-press. It would mean a click handler on the dialog
 * element, which is not an interactive element and so cannot carry one without also carrying
 * keyboard handling that duplicates the Escape the platform already provides. Escape and the
 * labelled close button are the two ways out, as they were in the application being migrated.
 *
 * **The toast is rendered inside the dialog**, and `App` renders it only while no overlay is open.
 * That is a consequence of the top layer, not a stylistic choice: an open modal dialog paints above
 * the entire normal document whatever its `z-index`, and makes the rest of it inert. A toast left
 * outside would be both hidden behind the backdrop and removed from the accessibility tree — so
 * copying the atlas spec, or a prompt out of the history drawer, would confirm to nobody.
 */
export function Modal({ title, icon, onClose, panelClassName, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape fires `cancel` and would close the element without telling the store, leaving the
        // app believing the overlay is still open. Suppressed, and routed through `onClose` instead.
        event.preventDefault();
        onClose();
      }}
      // The overlay opens in two halves: the ground behind it dims through `::backdrop`, and the
      // panel below rises into place. The dialog element itself is only the frame holding the two
      // apart, so it animates nothing — a fade on it would take the backdrop with it.
      className="fixed inset-0 m-0 flex h-dvh max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 text-ink backdrop:animate-backdrop-in backdrop:bg-foundry-950/80 backdrop:backdrop-blur-md"
    >
      <div className={`animate-modal-in ${panelClassName}`}>
        <div className="flex items-center justify-between border-b border-foundry-700 px-6 py-4">
          <h2 id={titleId} className="flex items-center gap-2.5 text-base font-bold text-ink">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-sm ring-1 ring-accent/30"
            >
              {icon}
            </span>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex size-7 items-center justify-center rounded-lg text-sm font-bold text-ink-faint transition-all duration-300 hover:rotate-90 hover:bg-foundry-700 hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </div>

      <Toast />
    </dialog>
  );
}
