import { useFileDropTarget } from '../../hooks/useFileDropTarget.ts';
import { FilePickerField } from '../common/FilePickerField.tsx';

interface ImageDropZoneProps {
  readonly acceptFile: (file: File | null | undefined) => void;
  /** The image currently loaded, or `null` before anything has been brought in. */
  readonly currentName: string | null;
}

/**
 * The three ways an image gets into this tab: dropped, pasted, or chosen.
 *
 * Rendered whether or not an image is already loaded, because replacing one is the common case — a
 * split rig is eight sheets, worked through one after another, and hiding the way in behind an empty
 * state would make the second sheet harder to load than the first.
 *
 * The paste route has no visible control here by design: it is registered on the window by
 * `useImagePaste`, which the tab adds, so a pasted sheet lands wherever the caret is. It is named in
 * the copy, which is the only way anyone would know it exists.
 */
export function ImageDropZone({ acceptFile, currentName }: ImageDropZoneProps) {
  const { isDraggedOver, dropHandlers } = useFileDropTarget(acceptFile);

  return (
    <section
      {...dropHandlers}
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-450 ${
        isDraggedOver
          ? 'scale-[1.01] border-tab bg-tab/10 shadow-2xl ring-1 ring-tab/40'
          : 'border-foundry-600 bg-foundry-800/60 hover:border-tab/50 hover:bg-foundry-800/80'
      }`}
    >
      {/* A sheen crossing the zone for as long as a file is over it — the one moment this panel is
          waiting on something, and the only one it moves for. */}
      {isDraggedOver && (
        <span
          aria-hidden="true"
          className="shimmer-surface animate-shimmer pointer-events-none absolute inset-0"
        />
      )}

      <p className="text-sm font-bold text-ink">
        {currentName === null ? 'Drop the sheet your model returned' : 'Drop another sheet to replace it'}
      </p>
      <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
        Paste one from the clipboard, or choose a file. Nothing is uploaded — the image is decoded in this
        tab, transformed here, and never leaves it.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <FilePickerField label="Choose an image" acceptFile={acceptFile} tone="faint" />
      </div>

      {currentName !== null && (
        <p className="mt-3 font-mono text-2xs text-ink-faint">Loaded: {currentName}</p>
      )}
    </section>
  );
}
