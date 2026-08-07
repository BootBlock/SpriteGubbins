import { describe, expect, it } from 'vitest';
import { BACKGROUND_KEYS } from '../types/rendering.ts';
import { BACKGROUND_KEY_COLORS } from './backgroundKeyColors.ts';
import { BACKGROUND_KEY_TEXT } from './promptText/sheet.ts';

/**
 * The one thing that can silently go wrong with two tables describing the same four colours.
 *
 * `BACKGROUND_KEY_TEXT` tells the *model* which colour to fill the background with;
 * `BACKGROUND_KEY_COLORS` tells `identityPalette` which colour to key back *out* of what the model
 * returned. `Readonly<Record<BackgroundKey, …>>` pins the keys in both, so a missing member is a
 * compile error — but nothing pins the values, and a correction applied to one of them would leave
 * the app asking for a background it then refuses to recognise.
 */

/** `#RRGGBB` as `BACKGROUND_KEY_TEXT` writes it, or `null` where the prose names no colour. */
function statedHex(text: string): string | null {
  return /#[0-9A-F]{6}/.exec(text)?.[0] ?? null;
}

describe('BACKGROUND_KEY_COLORS', () => {
  it.each(BACKGROUND_KEYS)('agrees with the prompt text for %s', (key) => {
    const color = BACKGROUND_KEY_COLORS[key];
    const hex = statedHex(BACKGROUND_KEY_TEXT[key]);

    // A key whose prose names no hex is one with no colour to exclude, and vice versa. TRANSPARENT
    // is the only such member, and the two tables have to agree that it is.
    if (hex === null) {
      expect(color).toBeNull();
      return;
    }

    expect(color).not.toBeNull();
    const { r, g, b } = color ?? { r: -1, g: -1, b: -1 };
    expect(`#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase()).toBe(hex);
  });
});
