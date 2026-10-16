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
 * does not guard against it. A control character or one of the characters Windows refuses in a file
 * name leaves an entry some reader cannot extract.
 *
 * **The rule is a whole segment's, not the one position the pack uses today.** A trailing dot or
 * space is harmless where `.png` follows the name, but Windows strips one from a name that ends a
 * file or a directory, so a layout that ever ended a path with the name would extract it under
 * another. The parser trims every name before this sees it, so only a direct caller reaches the
 * space check, and a leading space is not checked at all.
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
