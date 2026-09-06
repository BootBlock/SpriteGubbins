import type { PromptHistoryLog } from '../types/history.ts';
import type { LibraryPack } from '../types/libraryPack.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';

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
  | { readonly kind: 'deleteHistoryLog'; readonly logId: string }
  | { readonly kind: 'clearHistoryLogs' }
  | { readonly kind: 'listProjects' }
  | { readonly kind: 'saveProject'; readonly project: Project }
  | { readonly kind: 'deleteProject'; readonly projectId: string }
  | { readonly kind: 'savePreset'; readonly preset: CustomArchetype }
  | { readonly kind: 'listPresets' }
  | { readonly kind: 'deletePreset'; readonly presetId: string }
  | { readonly kind: 'saveQuantisePreset'; readonly preset: QuantisePreset }
  | { readonly kind: 'listQuantisePresets' }
  | { readonly kind: 'deleteQuantisePreset'; readonly presetId: string }
  | { readonly kind: 'replaceLibrary'; readonly pack: LibraryPack }
  | { readonly kind: 'loadSettings' }
  | { readonly kind: 'saveSettings'; readonly settings: AppSettings }
  | { readonly kind: 'loadSession' }
  | { readonly kind: 'saveSession'; readonly session: StudioSession };

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
 * Why the database could not be opened — the two answers that are *not* the same answer.
 *
 * `ABSENT` is OPFS being unavailable: a private window, a browser without it, an exhausted quota.
 * Those are ordinary, they mean this browser cannot store a database here at all, and the answer to
 * every one of them is the localStorage fallback.
 *
 * `HELD_ELSEWHERE` is the opposite finding. OPFS is present, the database exists, it holds the
 * reader's work — and another tab of this origin has the SAH pool's access handles open, which the
 * VFS is single-writer by design. Answering that with localStorage is what produced the defect this
 * type exists to end: the second tab reads an empty library, writes a fresh Default project into a
 * store the first tab cannot see, and the reader ends up with two of everything and no way back to
 * the half they wrote second.
 */
export const DATABASE_REFUSALS = ['ABSENT', 'HELD_ELSEWHERE'] as const;
export type DatabaseRefusal = (typeof DATABASE_REFUSALS)[number];

/**
 * Sent once, unprompted, as soon as the worker knows whether it has a database.
 *
 * **It carries a reason, and for exactly as long as there is something that can act on one.** This
 * used to be a bare boolean, on the stated ground that every way of failing to open OPFS has the
 * same answer. Two of the three do; the third does not, and the boolean is what made the app unable
 * to tell them apart — see {@link DatabaseRefusal}. A third reason worth distinguishing belongs
 * here, and a third reason that is genuinely answered by the fallback belongs in `ABSENT` rather
 * than in a member of its own.
 */
export type WorkerHandshake =
  { readonly ready: true } | { readonly ready: false; readonly refusal: DatabaseRefusal };

/** Narrow a message from the worker to a reply. */
export function isWorkerReply(message: unknown): message is WorkerReply {
  return typeof message === 'object' && message !== null && 'id' in message && 'ok' in message;
}

/** Narrow a message from the worker to the opening handshake. */
export function isWorkerHandshake(message: unknown): message is WorkerHandshake {
  return typeof message === 'object' && message !== null && 'ready' in message;
}
