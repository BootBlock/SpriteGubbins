import type { IconRoster } from '../types/iconRoster.ts';

/**
 * Whether two rosters ask for the same icons in the same look and order — or are both absent.
 *
 * Compared by value, for the reason `samePosition` compares the sixteen fields by value: a preset load
 * hands over a freshly built roster that may hold exactly the picks already in force, and an identity
 * check would record that as a change.
 */
export function sameIconRoster(a: IconRoster | undefined, b: IconRoster | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return (
    a.look === b.look && a.picks.length === b.picks.length && a.picks.every((id, at) => b.picks[at] === id)
  );
}
