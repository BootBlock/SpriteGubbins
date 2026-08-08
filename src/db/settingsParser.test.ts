import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import { ACCENT_HUES, MOTION_PREFERENCES } from '../types/settings.ts';
import { APP_TABS } from '../types/ui.ts';
import { parseSettings } from './settingsParser.ts';

/**
 * What the settings parser is actually for, and what it must never become.
 *
 * Browser storage is hand-editable and can be truncated, so everything crossing that boundary is
 * `unknown` and every union has to be checked against the array that *defines* it. What this is
 * **not** is a compatibility layer: a value that no longer names a member is not translated into
 * its replacement, it falls back — which is the project's pre-1.0 policy, not a shortcut.
 */

describe('parseSettings', () => {
  it('answers with the defaults for anything that is not an object', () => {
    for (const value of [undefined, null, 'settings', 42, []]) {
      expect(parseSettings(value)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('keeps every field it can read', () => {
    const stored = { accentHue: 'jade', motion: 'reduced', ambientBackdrop: false, openingView: 'spec' };
    expect(parseSettings(stored)).toEqual(stored);
  });

  it('falls back field by field, never wholesale', () => {
    // One unreadable preference costs that preference. Discarding the object instead would quietly
    // reset the other three, which is how a single hand-edited character loses a set of choices.
    expect(parseSettings({ accentHue: 'chartreuse', motion: 'reduced' })).toEqual({
      ...DEFAULT_SETTINGS,
      motion: 'reduced',
    });
  });

  it('rejects a value that is merely shaped like the right one', () => {
    // `'true'` is the one worth naming: it is what a hand-edited store, or a value that went
    // through a query string, actually contains — and `Boolean('false')` is `true`.
    expect(parseSettings({ ambientBackdrop: 'true' }).ambientBackdrop).toBe(DEFAULT_SETTINGS.ambientBackdrop);
    expect(parseSettings({ openingView: 'STUDIO' }).openingView).toBe(DEFAULT_SETTINGS.openingView);
    expect(parseSettings({ motion: 'full' }).motion).toBe(DEFAULT_SETTINGS.motion);
  });

  it('admits every member of every union it validates against', () => {
    // The property that stops this rotting: the guard reads the `as const` arrays, so a hue added
    // to `ACCENT_HUES` or a view added to `APP_TABS` is accepted by that edit alone. A parser
    // written against a hand-copied list would keep passing while rejecting the new member — the
    // user picks it, it stores, and it comes back as the default on the next load.
    for (const accentHue of ACCENT_HUES) expect(parseSettings({ accentHue }).accentHue).toBe(accentHue);
    for (const motion of MOTION_PREFERENCES) expect(parseSettings({ motion }).motion).toBe(motion);
    for (const openingView of APP_TABS) {
      expect(parseSettings({ openingView }).openingView).toBe(openingView);
    }
  });
});
