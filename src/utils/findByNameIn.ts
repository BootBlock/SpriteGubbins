import { findByName } from './findByName.ts';

/**
 * Which record filed under `projectId` a typed name refers to, or `undefined` if none there holds
 * it.
 *
 * **A name is unique inside one project**, for both saved collections: the studio's archetypes and
 * the quantiser's dial positions. Every path that could put a name into a project asks this one
 * question over the same set — a save, which updates the match; a rename, which is refused by it;
 * and a move, which is refused by it too (issue #454). A move that let two records with one name
 * share a project left every later save and rename acting on whichever the list showed first, so
 * the three have to agree on the set as well as on the comparison, which is `findByName`'s.
 */
export function findByNameIn<T extends { readonly name: string; readonly projectId: string }>(
  records: readonly T[],
  projectId: string,
  name: string,
): T | undefined {
  return findByName(
    records.filter((record) => record.projectId === projectId),
    name,
  );
}
