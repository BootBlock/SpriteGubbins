import { create } from 'zustand';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { OutputConfig } from '../types/output.ts';

/**
 * How the sheet should be rendered: the technical half of the prompt.
 *
 * Separate from `useSubjectStore` rather than one "studio" store, because the two change on
 * different rhythms — the subject is edited constantly, the output configuration is set once and
 * left — and a component selecting from one should never re-render because the other moved.
 */
export interface OutputState {
  readonly output: OutputConfig;

  /**
   * Change one setting.
   *
   * Generic over the key so the value is checked against *that* field's union: passing an aspect
   * ratio where a lighting model belongs is a compile error, which matters because every one of
   * these identifiers is copied verbatim into the compiled prompt.
   */
  setOutputField<K extends keyof OutputConfig>(key: K, value: OutputConfig[K]): void;
  /** Replace the whole configuration — what loading a preset does. */
  setOutputConfig(config: OutputConfig): void;
}

export const useOutputStore = create<OutputState>((set) => ({
  // `DEFAULT_OUTPUT_CONFIG`, not the default preset's own `output`. They hold the same values, but
  // this is the constant that *means* "the configuration the studio opens on", and it is already
  // what `db/rows.ts` repairs a malformed stored config from — so there is one default, not two.
  output: DEFAULT_OUTPUT_CONFIG,

  setOutputField: (key, value) => {
    set((state) => ({ output: { ...state.output, [key]: value } }));
  },

  setOutputConfig: (config) => {
    set({ output: config });
  },
}));
