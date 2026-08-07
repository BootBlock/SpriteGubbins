import { MAX_ANATOMY_MULTIPLIER, NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';

/**
 * Reading the additional-anatomy field as the list of components the sheet must actually draw.
 *
 * The field is free text in a combo box whose option pool states a multiplier, so the parse has to
 * accept both — a pooled `Demon Horn ×2, Tail ×1` and whatever a user types instead. See
 * {@link AnatomyComponent} for why the multiplier is not optional in the pool.
 *
 * Everything the prompt says about this field is rendered from the result: section 1's line and
 * section 4's entries both go through {@link formatAnatomyComponent}, so the sheet cannot describe
 * one set of anatomy and count another.
 */

/**
 * A trailing count — `Wing ×2`, `Wing x2`, `Wing *2`.
 *
 * `×` and `*` may sit tight against the name; a bare `x` must be preceded by whitespace, or the
 * trailing letter of a name like `Vortex` would be read as a multiplier.
 */
const MULTIPLIER = /(?:\s+x|\s*[×*])\s*(\d+)$/i;

/**
 * An entry that is nothing but a count — `×3`, `*3`, `x3`, `3`.
 *
 * Needed as well as {@link MULTIPLIER} because that pattern requires whitespace before a bare `x`,
 * so that a name like `Vortex` keeps its last letter. The cost is that `x3` standing alone never
 * matches it, and would otherwise survive as a component literally named `x3` — a piece the sheet
 * counts and the generator was never told the shape of.
 */
const COUNT_ONLY = /^[x×*]?\s*\d+$/i;

/**
 * Split one entry into its name and its count.
 *
 * A multiplier-shaped token is **always** taken off the name, even when its value is unusable. The
 * template tells the generator that an entry marked `×N` produces exactly N components, so leaving
 * a stray `×0` or `×007` in the name would emit `- Tail ×007 ×1.` — an entry carrying two different
 * counts, which is the silently-wrong sheet this whole mechanism exists to prevent.
 *
 * The value is then held inside `[1, MAX_ANATOMY_MULTIPLIER]`. `×0` draws nothing and a long enough
 * run of digits overflows to `Infinity`, neither of which is a sheet; and the ceiling is what stops
 * a typed `×5000000000` reaching the atlas preview, which allocates a cell per component.
 */
function splitMultiplier(item: string): AnatomyComponent {
  const match = MULTIPLIER.exec(item);
  const digits = match?.[1];
  if (!match || digits === undefined) return { name: item, count: 1 };

  const count = Number(digits);
  return {
    name: item.slice(0, match.index).trim(),
    count: count >= 1 ? Math.min(Math.floor(count), MAX_ANATOMY_MULTIPLIER) : 1,
  };
}

/**
 * Split the field into the components it names, in the order it names them.
 *
 * Order is load-bearing: section 4 places these last in the sheet's reading order, and reading order
 * is the only identity map a sheet carrying no labels has.
 */
export function parseAdditionalAnatomy(text: string): readonly AnatomyComponent[] {
  const components: AnatomyComponent[] = [];

  for (const entry of text.split(',')) {
    const item = entry.trim();
    if (!item) continue;

    const component = splitMultiplier(item);

    // An entry with no name left names no anatomy — `×3` on its own is a count of nothing, and
    // emitting it would ask the generator to draw a component it was never told the shape of. The
    // sentinel is tested *after* the multiplier comes off, because `NONE ×2` still says there is
    // none, and a user editing the field from `NONE` towards `Tail ×2` types it on the way.
    if (!component.name || COUNT_ONLY.test(component.name)) continue;
    if (component.name.toUpperCase() === NO_ADDITIONAL_ANATOMY) continue;

    components.push(component);
  }

  return components;
}

/** How many components the parsed list adds to the sheet. */
export function countAnatomyComponents(components: readonly AnatomyComponent[]): number {
  return components.reduce((total, component) => total + component.count, 0);
}

/**
 * One component as the prompt names it — `Demon Horn ×2`.
 *
 * The name is emitted exactly as it was written. Re-casing it would corrupt free text for no gain:
 * every pooled option is already capitalised, and `String.toUpperCase` is a full case fold, so a
 * leading `ß` would come back as `SS`.
 */
export function formatAnatomyComponent({ name, count }: AnatomyComponent): string {
  return `${name} ×${String(count)}`;
}
