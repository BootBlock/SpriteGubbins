/**
 * What the About section says: which build this is, who made it, and where the source lives.
 *
 * Kept as data so the view that renders it stays a view, matching `architecture.ts` next door.
 */

/**
 * Replaced at build time by Vite's `define` (see `vite.config.ts`), single-sourced from
 * package.json's `version`.
 *
 * Declared rather than imported: the substitution happens in the bundler, so there is no module to
 * import and package.json stays out of the bundle. The trade is that a missing `define` is a
 * *runtime* `ReferenceError` rather than a compile error, which is what `AboutSection.test.tsx`
 * pins by asserting the rendered version against package.json on disk.
 */
declare const __APP_VERSION__: string;

/** The application version, single-sourced from package.json. */
export const APP_VERSION: string = __APP_VERSION__;

/** Who to credit. Also package.json's `author` and the copyright line in `LICENSE`. */
export const AUTHOR_NAME = 'Joe Cox';

/** The author's own site. */
export const AUTHOR_URL = 'https://bootblock.co.uk';

/** The public source repository — the same one the deploy workflow publishes from. */
export const REPOSITORY_URL = 'https://github.com/BootBlock/SpriteGubbins';

/** The licence this application is released under, and where to read it in full. */
export const LICENCE_NAME = 'MIT';
export const LICENCE_URL = 'https://github.com/BootBlock/SpriteGubbins/blob/main/LICENSE';
