/**
 * A file name without its extension — `armour.png` → `armour`.
 *
 * One implementation because two downloads name their output after a file the reader brought in, and
 * both have to strip the same thing: the quantised sheet, which arrives as `armour-quantised.png`,
 * and the palette taken off it, which arrives as `armour-palette.gpl`. Two copies of this expression
 * is two chances for one of them to disagree about what an extension is — and a name that keeps one
 * puts the wrong extension in the middle of the file it produces.
 *
 * **Only a trailing run with no separator in it counts**, so `armour v1.2 final.webp` loses the
 * `.webp` and keeps the `1.2`, and a name that is all extension and no stem comes back empty for the
 * caller to answer for. The separators are both, because a name may have arrived from either
 * platform.
 *
 * Pure, as everything in this directory is.
 */
export function fileStem(name: string): string {
  return name.replace(/\.[^./\\]+$/, '');
}
