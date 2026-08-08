import { useId } from 'react';

interface FilePickerFieldProps {
  readonly label: string;
  readonly acceptFile: (file: File | null | undefined) => void;
  /** Which tone the label takes, so a picker can sit in a panel or in a form row. */
  readonly tone?: 'muted' | 'faint';
}

/**
 * A labelled file input — the click-to-choose half of every drop target in the app.
 *
 * `useFileDropTarget` already owns the drag half for the same two callers; this is the other half,
 * and it was copied rather than shared the first time. The class string, the `input.value = ''`
 * reset and the label association are the solved problem, not the presentation: the quantiser's
 * drop zone and the studio's palette capture wrap this in quite different surfaces — one a tab's
 * primary panel, the other a compact row — and that difference stays with them.
 *
 * The reset is why this is a component rather than a snippet. Without it, re-picking the *same*
 * file fires no `change` event at all, so a sheet read against the wrong background key could never
 * be retried without picking something else first.
 */
export function FilePickerField({ label, acceptFile, tone = 'muted' }: FilePickerFieldProps) {
  const inputId = useId();

  return (
    <>
      <label
        htmlFor={inputId}
        className={`text-xs font-semibold ${tone === 'faint' ? 'text-ink-faint' : 'text-ink-muted'}`}
      >
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
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
    </>
  );
}
