import { TARGET_MODELS } from './models.ts';

/**
 * Every target's whole entry, keyed by its id, for the controls that act on the chosen target.
 *
 * Built once rather than a `find` per render, for the reason `HistoryEntry`'s name table is one:
 * `TARGET_MODELS` is a compile-time constant, so re-scanning it on every keystroke in the studio is
 * work with no possible change in answer. Shared because two controls ask it — the link beside the
 * target select, and the preview's Copy, open & next — and each needs the same generator site.
 *
 * Every id in the union has an entry (`targetCapabilities.test.ts` pins that the table covers it),
 * so a miss is unreachable. A caller still answers one, because the lookup is a `Map`.
 */
export const TARGET_MODEL_ENTRIES = new Map(TARGET_MODELS.map((model) => [model.id, model]));
