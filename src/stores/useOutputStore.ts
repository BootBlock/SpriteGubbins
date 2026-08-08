import { create } from 'zustand';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { withCompanionOutputs } from '../utils/imageConfig.ts';
import type { ImageOutputConfig, OutputConfig } from '../types/output.ts';

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
  /**
   * Change several settings at once, leaving the rest alone.
   *
   * What choosing a hardware profile does: a machine writes seven settings and a palette in one
   * act, and doing that as eight `setOutputField` calls would put eight entries in the store's
   * history where the user performed one. It merges from the *current* state rather than from a
   * value the caller read earlier, which `setOutputConfig` cannot do — that one replaces, and a
   * component composing `{ ...output, ...patch }` would be writing back a snapshot.
   */
  applyOutputPatch(patch: Partial<OutputConfig>): void;
  /**
   * Replace everything that decides the image, keeping the companion outputs the user chose — what
   * loading a preset does.
   *
   * The distinction from `setOutputConfig` is the whole point: a preset describes an archetype and
   * has no business deciding whether this user wants a JSON manifest back, so those two answers
   * survive a load. A prompt restored from history goes the other way and takes the lot, because
   * that entry *is* the configuration that produced the prompt in it — companions included.
   */
  applyImageConfig(config: ImageOutputConfig): void;
  /** Replace the whole configuration — what restoring a history entry does. */
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

  applyOutputPatch: (patch) => {
    set((state) => ({ output: { ...state.output, ...patch } }));
  },

  applyImageConfig: (config) => {
    // Merged from the *current* state rather than from a snapshot the caller read, for the same
    // reason `applyOutputPatch` is: the two companion answers being carried across are the ones in
    // the store at the moment of the load.
    set((state) => ({ output: withCompanionOutputs(config, state.output) }));
  },

  setOutputConfig: (config) => {
    set({ output: config });
  },
}));
