import { useId } from 'react';
import { ControlTooltip } from './ControlTooltip.tsx';

interface FilePickerFieldProps {
  readonly label: string;
  /**
   * What the chosen file is read for, shown on hovering or focusing the chooser.
   *
   * A prop rather than one sentence written here, because the callers do entirely different things
   * with the file: one loads a sheet into the quantiser's pipeline, one reads a palette out of a
   * sheet and writes it into the identity lock, one reads the colours a project already uses, and
   * one reads an engine's rig. What they share is the control, not the reason.
   */
  readonly tooltip: string;
  readonly acceptFile: (file: File | null | undefined) => void;
  /**
   * What the chooser offers, as the `accept` attribute spells it.
   *
   * Required rather than defaulted to images: one caller reads a JSON document rather than a
   * picture and another takes a picture or either of two text formats, so a default would have
   * offered them every PNG on the machine and nothing else they can read.
   * A picker that filters for the wrong kind of file is a control that refuses what the user just
   * chose, after they chose it.
   */
  readonly accept: string;
  /** Which tone the label takes, so a picker can sit in a panel or in a form row. */
  readonly tone?: 'muted' | 'faint';
}

/**
 * A labelled file input — the click-to-choose half of every drop target in the app.
 *
 * The drag half is owned elsewhere and differently — `useImageDrop` on the window for the
 * quantiser, `useFileDropTarget` on the element for the two studio panels that take a file — and
 * this is the other half, which was copied rather than shared the first time. The class
 * string, the `input.value = ''` reset and the label association are the solved problem, not the
 * presentation: the two callers wrap this in quite different surfaces — one a tab's primary panel,
 * the other a compact row — and that difference stays with them.
 *
 * The reset is why this is a component rather than a snippet. Without it, re-picking the *same*
 * file fires no `change` event at all, so a sheet read against the wrong background key could never
 * be retried without picking something else first.
 */
export function FilePickerField({
  label,
  tooltip,
  acceptFile,
  accept,
  tone = 'muted',
}: FilePickerFieldProps) {
  const inputId = useId();

  return (
    <>
      <label
        htmlFor={inputId}
        className={`text-xs font-semibold ${tone === 'faint' ? 'text-ink-faint' : 'text-ink-muted'}`}
      >
        {label}
      </label>
      {/* The wrapper takes the input's place as a flex item in whichever row the caller laid out, so
          the width cap travels with it — the input keeps its own copy for the box inside. */}
      <ControlTooltip hint={label} text={tooltip} className="relative inline-flex max-w-full">
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={(event) => {
            const input = event.currentTarget;
            acceptFile(input.files?.item(0));
            input.value = '';
          }}
          // The chooser wears the view's colour like every other action inside a tab — both callers
          // are tab panels. `file:` reaches `::file-selector-button`, which is where the border and
          // the fill belong; the input itself is only the label beside it.
          //
          // The hover is spelled out here because **`file:` carries the utility's resting declarations
          // and silently drops its nested `&:hover` and `&:disabled` rules** — verified by grepping the
          // built CSS, where `.file\:action-tab::file-selector-button` emits four declarations and no
          // state rule at all. So this restores the one state that matters: the border going to full
          // opacity. (The bloom does not survive, and the disabled colours have nothing to restore —
          // this input is never disabled.) `hover:file:` is hover on the *input*, which is also how
          // the treatment this replaced was written, so the trigger area is unchanged.
          className="max-w-full text-xs text-ink-muted file:mr-3 file:action-tab file:rounded-lg file:px-3 file:py-1.5 file:font-semibold hover:file:border-tab"
        />
      </ControlTooltip>
    </>
  );
}
