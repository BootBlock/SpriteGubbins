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
        className="max-w-full text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-strong file:px-3 file:py-1.5 file:font-semibold file:text-ink hover:file:bg-accent"
      />
    </>
  );
}
