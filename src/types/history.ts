import type { SubjectCategory } from './subject.ts';
import type { TargetModelId } from './output.ts';

/**
 * One entry in the prompt history — a record of a prompt the user actually copied, not of every
 * keystroke. Copying only: a download names its own file and lands somewhere the user chose, so it
 * is already a record; the clipboard keeps nothing once the next thing is copied over it.
 *
 * Stored in the `prompt_history` table. `wordCount` and `modelUsed` are denormalised onto the
 * row rather than recomputed on read: the history drawer lists them for every entry, and the
 * prompt that produced a count is the one already stored beside it.
 */
export interface PromptHistoryLog {
  readonly id: string;
  readonly category: SubjectCategory;
  readonly promptText: string;
  /** Milliseconds since the epoch, as stored in the table's INTEGER column. */
  readonly createdAt: number;
  readonly wordCount: number;
  readonly modelUsed: TargetModelId;
}

/**
 * A log entry as its *caller* knows it — everything except the two fields that describe the row
 * rather than the prompt.
 *
 * `id` and `createdAt` are minted by `useHistoryStore.addLog`, not supplied: identity and
 * insertion time are properties of the record, and a component that had to invent them could get
 * them wrong (a colliding id, a timestamp taken well before the write) in a way nothing would
 * catch.
 */
export type NewPromptHistoryLog = Omit<PromptHistoryLog, 'id' | 'createdAt'>;
