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
 */
export interface RequestSequence {
  /** Start a read, and answer whether it is still the latest each time the answer is needed. */
  begin(): () => boolean;
  /** Retire every read in flight, because the reader has since done something else to the target. */
  supersede(): void;
}

export function createRequestSequence(): RequestSequence {
  let latest = 0;

  return {
    begin: () => {
      latest += 1;
      const ticket = latest;
      return () => ticket === latest;
    },
    supersede: () => {
      latest += 1;
    },
  };
}
