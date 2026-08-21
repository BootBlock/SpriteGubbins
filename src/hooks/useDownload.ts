import { useCallback } from 'react';
import { useFileSave } from './useFileSave.ts';

/**
 * Offering generated **text** as a download — the compiled prompt as Markdown, and the preset pack
 * and the prompt history as JSON.
 *
 * The saving itself is {@link useFileSave}; what this adds is the one thing text needs and bytes do
 * not, which is a media type to wrap the string in. A quantised sheet takes {@link useImageDownload}
 * instead, because what it has to wrap is an encoder rather than a string.
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
