import { describe, expect, it } from 'vitest';
import { HELD_ELSEWHERE_REFUSAL } from './heldElsewhereBackend.ts';
import { storageFailure } from './storageFailure.ts';

/**
 * That the one failure the app can explain reaches the reader, and that nothing else does.
 *
 * The two halves are equally the point. A reader in a second tab is told "Could not save that
 * preset" for a write that can never succeed until they close the other tab, which reads as a broken
 * app rather than as a condition with a fix — so the refusal replaces the shrug. And a reader whose
 * quota is full is *not* told "the database thread stopped answering", because the sentences the
 * backend rejects with elsewhere are written for a bug report and not for a notification.
 */
describe('storageFailure', () => {
  it('states the refusal where the app is the thing refusing', () => {
    expect(storageFailure('Could not save that preset', new Error(HELD_ELSEWHERE_REFUSAL))).toBe(
      HELD_ELSEWHERE_REFUSAL,
    );
  });

  it('keeps the caller’s own sentence for a failure nobody can name', () => {
    expect(storageFailure('Could not save that preset', new Error('QuotaExceededError'))).toBe(
      'Could not save that preset',
    );
  });

  it('keeps it for the backend’s own internal wording, which is not for a reader', () => {
    // `sqliteBackend.ts` rejects with both of these, and each is true and useless in a notification.
    expect(storageFailure('Could not load your projects', new Error('the database is not open'))).toBe(
      'Could not load your projects',
    );
    expect(
      storageFailure('Could not load your projects', new Error('The database thread stopped answering')),
    ).toBe('Could not load your projects');
  });

  it('keeps it for anything thrown that is not an Error at all', () => {
    // A rejection can carry any value, and a `catch` binding is `unknown` for that reason.
    expect(storageFailure('Could not delete that preset', HELD_ELSEWHERE_REFUSAL)).toBe(
      'Could not delete that preset',
    );
    expect(storageFailure('Could not delete that preset', undefined)).toBe('Could not delete that preset');
  });
});
