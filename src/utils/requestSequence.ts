/**
 * Which of several overlapping reads of a file is the one the reader asked for last.
 *
 * Reading a file is asynchronous, and reads do not settle in the order they began:
 * `createImageBitmap` on a 4096² sheet takes hundreds of milliseconds, and a small sheet dropped
 * after it is back first. Applying each result as it settles hands the target to whichever read
 * happened to be slowest, which is the reader's *earlier* choice. So every read is started through
 * one sequence per target, and a result is applied only while its read is still the latest thing
 * the reader did to that target.
 *
 * **Anything else the reader does to the target supersedes a read in flight**, not just another
 * read. Clearing it, pasting over it or taking its value from somewhere else is a later choice than
 * a file still decoding, so each of those calls {@link RequestSequence.supersede} and the read's
 * result is dropped when it settles.
 *
 * **A retired read is also told so, through its {@link RequestTicket.signal}**, because dropping
 * the answer is not the whole cost. A palette read runs for seconds on a thread of its own, and a
 * reader who drops three sheets in a row would otherwise have three threads working on answers
 * nobody will look at. The signal aborts the moment the read is retired, so the work that owns it
 * can stop rather than finish into the bin.
 */
export interface RequestSequence {
  /** Start a read, and answer whether it is still the latest each time the answer is needed. */
  begin(): RequestTicket;
  /** Retire every read in flight, because the reader has since done something else to the target. */
  supersede(): void;
}

/** One read: call it to ask whether it is still current, and hand its signal to work that can stop. */
export interface RequestTicket {
  (): boolean;
  /** Aborted the moment a later read begins or the target is superseded, and never before. */
  readonly signal: AbortSignal;
}

export function createRequestSequence(): RequestSequence {
  let latest = 0;
  let retiring = new AbortController();

  const retire = (): void => {
    latest += 1;
    retiring.abort();
    retiring = new AbortController();
  };

  return {
    begin: () => {
      retire();
      const ticket = latest;
      return Object.assign(() => ticket === latest, { signal: retiring.signal });
    },
    supersede: retire,
  };
}
