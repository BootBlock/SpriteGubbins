import { describe, expect, it } from 'vitest';
import { isRefusedStart, retryRefusedStart, START_ATTEMPTS } from '../scripts/retryRefusedStart.ts';

/**
 * The secret scan's answer to a machine that will not start its git (see `retryRefusedStart`).
 *
 * The errors below are shaped as Node's own: a start the system refuses carries only its `code`,
 * while a program that ran and failed carries its exit `status` (git's `rev-parse` of a missing
 * name leaves `status: 128` and no `code`). Pauses are recorded rather than slept.
 */
function refused(code = 'EPERM'): Error {
  return Object.assign(new Error(`spawnSync git ${code}`), { code, status: null, signal: null });
}

/** A start that fails with each of `failures` in turn, then answers `'ok'`. */
function startFailing(...failures: Error[]): { start: () => string; calls: () => number } {
  let calls = 0;
  return {
    start: () => {
      const failure = failures[calls++];
      if (failure) throw failure;
      return 'ok';
    },
    calls: () => calls,
  };
}

describe('retryRefusedStart', () => {
  it('starts a refused process again, pausing a little longer before each retry', () => {
    const pauses: number[] = [];
    const { start, calls } = startFailing(refused(), refused('EAGAIN'));
    expect(retryRefusedStart(start, (ms) => pauses.push(ms))).toBe('ok');
    expect(calls()).toBe(3);
    expect(pauses).toEqual([50, 100]);
  });

  it('throws an answer from the program at once, since asking again asks the same question', () => {
    const exited = Object.assign(new Error('git exited 128'), { status: 128, signal: null });
    const { start, calls } = startFailing(exited);
    expect(() => retryRefusedStart(start, () => {})).toThrow(exited);
    expect(calls()).toBe(1);
  });

  it('gives up after its last attempt, so a machine that cannot start git still fails loudly', () => {
    const last = refused();
    const failures = [...Array.from({ length: START_ATTEMPTS - 1 }, () => refused()), last, refused()];
    const { start, calls } = startFailing(...failures);
    expect(() => retryRefusedStart(start, () => {})).toThrow(last);
    expect(calls()).toBe(START_ATTEMPTS);
  });
});

describe('isRefusedStart', () => {
  it.each([
    ['a refused start', refused(), true],
    ['the POSIX refusal', refused('EAGAIN'), true],
    ['a program that is not there', refused('ENOENT'), false],
    ['an exit status beside the code', Object.assign(refused(), { status: 1 }), false],
    ['a signal beside the code', Object.assign(refused(), { signal: 'SIGTERM' }), false],
    ['a thrown string', 'EPERM', false],
    ['nothing', null, false],
  ])('judges %s', (_name, error, expected) => {
    expect(isRefusedStart(error)).toBe(expected);
  });
});
