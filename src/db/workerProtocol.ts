import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';

/**
 * The messages the database worker understands, and what comes back.
 *
 * Shared by both sides so the protocol is one declaration rather than two that have to agree —
 * adding an operation without handling it in the worker is a compile error, which is the whole
 * reason this file exists separately from either end.
 *
 * Everything crossing the boundary is structured-cloneable: plain objects, strings and numbers. No
 * class instances, no functions, and nothing holding a database handle.
 */
export type WorkerRequest =
  | { readonly kind: 'addHistoryLog'; readonly log: PromptHistoryLog }
  | { readonly kind: 'listHistoryLogs' }
  | { readonly kind: 'clearHistoryLogs' }
  | { readonly kind: 'savePreset'; readonly preset: PresetArchetype }
  | { readonly kind: 'listPresets' }
  | { readonly kind: 'deletePreset'; readonly presetId: string }
  | { readonly kind: 'replacePresets'; readonly presets: readonly PresetArchetype[] };

/** A request with the correlation id the reply will carry back. */
export interface WorkerCall {
  readonly id: number;
  readonly request: WorkerRequest;
}

/**
 * A reply.
 *
 * The list operations resolve to **raw rows** — `snake_case` records straight out of SQLite — rather
 * than domain objects. Validation stays on the main thread in `db/rows.ts`, where it already lives
 * for the localStorage backend, so one set of parsers covers both and the worker stays a thin
 * executor of SQL with no opinion about what the rows mean.
 */
export type WorkerReply =
  | { readonly id: number; readonly ok: true; readonly value: unknown }
  | { readonly id: number; readonly ok: false; readonly error: string };

/**
 * Sent once, unprompted, as soon as the worker knows whether it has a database.
 *
 * Carries no reason for a failure, because there is nothing that could act on one: every way of
 * failing to open OPFS has the same answer — use localStorage — and the caller takes it without
 * asking which. Diagnosing a *particular* failure is a job for instrumenting the worker, not for a
 * field the app reads and discards.
 */
export type WorkerHandshake = { readonly ready: boolean };

/** Narrow a message from the worker to a reply. */
export function isWorkerReply(message: unknown): message is WorkerReply {
  return typeof message === 'object' && message !== null && 'id' in message && 'ok' in message;
}

/** Narrow a message from the worker to the opening handshake. */
export function isWorkerHandshake(message: unknown): message is WorkerHandshake {
  return typeof message === 'object' && message !== null && 'ready' in message;
}
