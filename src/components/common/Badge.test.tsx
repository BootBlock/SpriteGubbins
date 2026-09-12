import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge.tsx';
import type { BadgeTone } from './Badge.tsx';

/**
 * The chip, and the two distinctions its tones carry.
 *
 * A badge says what it is saying, not what colour it is, and two of its tones make promises the rest
 * of the palette depends on: `live` is the one that moves, because it marks something recomputing as
 * the reader works, and `view` is the one with no colour of its own, because it belongs to whatever set
 * `--color-tab` around it. A tone that started pulsing, or a view chip pinned to a fixed role, would
 * look fine on its own and quietly break the meaning of every other chip on the page.
 */

/** Every tone, spelled once and checked by the compiler to be the whole union and nothing more. */
const TONE_NAMES = {
  accent: 'accent',
  view: 'view',
  live: 'live',
  attention: 'attention',
  valid: 'valid',
  neutral: 'neutral',
} as const satisfies { readonly [Tone in BadgeTone]: Tone };

const TONES = Object.values(TONE_NAMES);

function chip(tone: BadgeTone): HTMLElement {
  render(<Badge tone={tone}>{`chip-${tone}`}</Badge>);
  return screen.getByText(`chip-${tone}`);
}

describe('Badge', () => {
  it('renders what it is given, in the neutral tone when none is named', () => {
    render(<Badge>RIGGED</Badge>);
    const unnamed = screen.getByText('RIGGED');

    expect(unnamed.className).toBe(chip('neutral').className);
  });

  it('pulses for the live tone and for no other', () => {
    // The pulse is the whole of what separates "recomputing now" from "true of this item". A static
    // chip that pulsed would teach a reader that the motion means nothing.
    const pulsing = TONES.filter((tone) => chip(tone).classList.contains('animate-pulse-glow'));

    expect(pulsing).toStrictEqual(['live']);
  });

  it('takes the view tone from the colour its container set, and only the view tone', () => {
    // A preset card re-points `--color-tab` to its own stop on the wheel, and its category chip has to
    // follow. Any other tone reaching for a `-tab` utility would change colour with the view it happens
    // to be shown in.
    const following = TONES.filter((tone) => [...chip(tone).classList].some((name) => name.endsWith('-tab')));

    expect(following).toStrictEqual(['view']);
  });

  it('gives every tone a look of its own', () => {
    const looks = TONES.map((tone) => chip(tone).className);

    expect(new Set(looks).size).toBe(TONES.length);
  });
});
