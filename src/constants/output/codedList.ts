import { spokenList } from '../../utils/spokenList.ts';

/** Identifiers in backticks, as a sentence of guidance lists them: `` `A`, `B` and `C` ``. */
export function coded(names: readonly string[]): string {
  return spokenList(names.map((name) => `\`${name}\``));
}
