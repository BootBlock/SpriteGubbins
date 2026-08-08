import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import { ACCENT_HUES, MOTION_PREFERENCES } from '../types/settings.ts';
import type { AppSettings } from '../types/settings.ts';
import { APP_TABS } from '../types/ui.ts';
import { isRecord, pick, pickBoolean } from './readers.ts';

/**
 * Turning stored interface settings back into an `AppSettings`.
 *
 * The same contract `db/configParsers.ts` states and for the same reason: **this is not a
 * compatibility layer and must not become one.** Nothing here translates a retired identifier into
 * its replacement — a value that no longer matches its union simply falls back to the default. What
 * it is for is storage that has been hand-edited, truncated, or written by a build that spelled a
 * setting differently, all of which stay possible however stable the shape is.
 *
 * Every union is checked against the `as const` array that *defines* it, so a hue added to
 * `ACCENT_HUES` or a view added to `APP_TABS` is admitted here by that edit alone.
 *
 * Falls back **field by field**, never wholesale: one unreadable preference costs that preference,
 * where discarding the object would silently reset the other three as well.
 */
export function parseSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return DEFAULT_SETTINGS;

  return {
    accentHue: pick(value, 'accentHue', DEFAULT_SETTINGS.accentHue, ACCENT_HUES),
    motion: pick(value, 'motion', DEFAULT_SETTINGS.motion, MOTION_PREFERENCES),
    ambientBackdrop: pickBoolean(value, 'ambientBackdrop', DEFAULT_SETTINGS.ambientBackdrop),
    openingView: pick(value, 'openingView', DEFAULT_SETTINGS.openingView, APP_TABS),
  };
}
