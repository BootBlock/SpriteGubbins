import { useCallback } from 'react';
import { useFileSave } from './useFileSave.ts';

/**
 * Offering generated **text** as a download: a string the app has already composed, wrapped in the
 * media type that says what it is.
 *
 * The saving itself is {@link useFileSave}; what this adds is the one thing text needs and bytes do
 * not, which is that wrapper.
 *
 * **What decides whether a download comes through here is what the caller already holds**, not
 * which downloads the app has. A caller holding a string wraps it here; a caller holding anything
 * else builds its own `Blob` and calls {@link useFileSave} directly — an encoder's output in
 * {@link useImageDownload}, or a settled palette in {@link usePaletteDownload}, which is a picture
 * in one of its three forms and text in the other two and so would be on both sides of any split
 * drawn between file *kinds*. This sentence used to draw one, saying a quantised sheet took
 * {@link useImageDownload} "instead": true of the two downloads that existed, and silent about
 * every one added since.
 *
 * **The JSON pack this used to call "the preset pack" is the whole library** — the projects, the
 * saves filed under them and the quantiser dial presets, in one `sprite-gubbins-library.json`
 * written by `ProjectTransferControls`. There was one pack per collection when that name was
 * written down here, and the collections have since been merged into a single file.
 */
export function useDownload(): (filename: string, text: string, mimeType: string) => void {
  const save = useFileSave();

  return useCallback(
    (filename, text, mimeType) => {
      save(filename, new Blob([text], { type: mimeType }), `Downloaded ${filename}`);
    },
    [save],
  );
}
