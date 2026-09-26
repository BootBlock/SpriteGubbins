/**
 * Why one slot's `pack_piece_name` cannot name a file, or nothing.
 *
 * **The name is kept verbatim, so it has to be safe as it stands.** Every other name a sprite pack
 * writes goes through `slugify`, but this one is the key the engine's importer looks a piece up by,
 * and a slugged copy would be a piece with no socket. It becomes a manifest name and then a sprite
 * pack entry — `south/03-left-upper-arm.png` — so it has to be one path segment every extractor on
 * every platform writes as that one file.
 *
 * **A separator is the dangerous case.** `hip/left` nests the piece in a directory the facing-keyed
 * importer never reads, and `x/../../evil` climbs out of the extraction root in any extractor that
 * does not guard against it. A control character, one of the characters Windows refuses in a file
 * name, or a trailing dot or space (which Windows strips, so the file extracts under another name)
 * leaves an entry some reader cannot extract. A leading space is not checked, since the parser trims
 * every name before this sees it.
 *
 * Refused rather than repaired, as the rest of the contract is: a repaired name is not the name the
 * engine looks up.
 */

/** The characters Windows refuses in a file name, beyond the separators and control characters. */
const WINDOWS_FORBIDDEN = /[<>:"|?*]/u;
const CONTROL = /\p{Cc}/u;

export function rigPieceNameProblem(name: string, where: string): string | null {
  const reason =
    name.includes('/') || name.includes('\\')
      ? 'holds a path separator'
      : CONTROL.test(name)
        ? 'holds a control character'
        : WINDOWS_FORBIDDEN.test(name)
          ? 'holds a character Windows refuses in a file name'
          : name.endsWith('.') || name.endsWith(' ')
            ? 'ends in a dot or a space, which Windows strips from a file name'
            : null;
  if (reason === null) return null;
  return `${where}’s pack_piece_name ‘${name}’ ${reason}, and a sprite pack names the piece’s file after it.`;
}
