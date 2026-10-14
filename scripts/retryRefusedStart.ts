/**
 * Codes with which the operating system refuses to start a process at all.
 *
 * Windows under heavy load now and then refuses a `spawnSync`: it fails with `EPERM`, before the
 * program has run a single instruction. `EAGAIN` is the POSIX spelling of the same refusal, when
 * the process table or the memory to fork is momentarily short.
 */
const REFUSED_START_CODES: ReadonlySet<string> = new Set(['EPERM', 'EAGAIN']);

/** How many times a refused start is tried in all, and the pause before each retry grows by. */
export const START_ATTEMPTS = 5;
const PAUSE_STEP_MS = 50;

/**
 * Whether `error` is a refusal to start rather than an answer from the program.
 *
 * A program that ran and failed leaves its exit `status` on the error, and one killed by a signal
 * leaves the `signal`; a refused start leaves neither, only the system's `code`.
 */
export function isRefusedStart(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = 'code' in error ? error.code : undefined;
  const status = 'status' in error ? error.status : undefined;
  const signal = 'signal' in error ? error.signal : undefined;
  return typeof code === 'string' && REFUSED_START_CODES.has(code) && status == null && signal == null;
}

/**
 * Run `start`, and run it again when the operating system refused to start the process it spawns.
 *
 * The secret scan's runner starts `git` once per diff, so a push of many commits starts hundreds of
 * processes, and a single refusal used to escape as an uncaught error: the runner died with a Node
 * stack trace in place of a verdict, which is how `tests/secret-scan-commits.test.ts` failed about
 * one full parallel run in a hundred. A refused start has done nothing, so starting it again is
 * safe. Anything else — git's own non-zero exit above all — is thrown at once, because retrying an
 * answer only asks the same question twice. After {@link START_ATTEMPTS} refusals the last one is
 * thrown, so a machine that cannot start git at all still fails loudly.
 */
export function retryRefusedStart<T>(start: () => T, pause: (ms: number) => void = sleep): T {
  for (let attempt = 1; ; attempt++) {
    try {
      return start();
    } catch (error) {
      if (attempt >= START_ATTEMPTS || !isRefusedStart(error)) throw error;
      pause(PAUSE_STEP_MS * attempt);
    }
  }
}

/** Block the thread for `ms`, as a synchronous caller has no event loop turn to wait on. */
function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
