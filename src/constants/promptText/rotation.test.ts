import { describe, expect, it } from 'vitest';
import type { Direction } from '../../types/rendering.ts';
import { signedObjectYaw } from './chirality.ts';
import { PLAN_VIEW_ELEVATION } from './elevation.ts';
import { FACING_TEXT, facingText, PLAN_FACING_TEXT } from './rotation.ts';

/**
 * What a plan view's facings say, re-derived from the yaw rather than read back.
 *
 * `PLAN_FACING_TEXT` is thirteen hand-written sentences making two geometric claims each — where the
 * front axis points in the frame, and where the subject's own two sides land — and the second is the
 * kind of thing that is wrong as often as it is right when written by eye: seen from **above**, a
 * form whose front points down the frame has its right side towards the frame's *left*. With no
 * occlusion left to contradict it, a sentence that got that backwards would send back a sheet of
 * left-handed subjects and nothing in the prompt would disagree with it.
 *
 * So the expected screen directions are computed here from `OBJECT_YAW` and the set the facing
 * belongs to, and the prose is parsed for what it actually says.
 */

/**
 * Every facing, taken off the record itself — `Direction` is a bare union with no array to walk,
 * and the record is exhaustive over it by its own type.
 */
const ALL_FACINGS = Object.keys(PLAN_FACING_TEXT) as Direction[];

/** Clockwise on screen from the bottom of the frame, in 45° steps. */
const SCREEN_DIRECTIONS = [
  'bottom',
  'bottom-left',
  'left',
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
] as const;

/** Compound names first, so `top-left` is never read as `top`. */
const NAME = '(top-left|top-right|bottom-left|bottom-right|top|bottom|left|right)';

/**
 * Where a facing's front axis points in the frame.
 *
 * The two direction sets turn opposite ways — `west` at 90° faces screen-left where the classic
 * `right side` at 90° faces screen-right, which `FACING_TEXT` states outright — so the sense comes
 * from which set the facing belongs to, and the compass names then land on their own compass points.
 * {@link signedObjectYaw} is where that sense is recovered, and taking it from there rather than
 * repeating the `× −1` keeps one statement of it: this suite still checks the *prose* against the
 * arithmetic, so a sign that flipped in the helper would fail here rather than pass quietly.
 */
function frontBearing(direction: Direction): string {
  return atBearing(signedObjectYaw(direction));
}

/** The screen direction `degrees` clockwise from the bottom of the frame. */
function atBearing(degrees: number): string {
  const step = (((degrees / 45) % 8) + 8) % 8;
  const name = SCREEN_DIRECTIONS[step];
  if (name === undefined) throw new Error(`No screen direction at ${String(degrees)}°.`);
  return name;
}

/** What the sentence claims, or `null` where it never says. */
function claimed(text: string, pattern: RegExp): string | null {
  return pattern.exec(text)?.[1] ?? null;
}

describe('the yaws a plan view states', () => {
  it.each(ALL_FACINGS)('points %s where its own yaw puts it', (direction) => {
    const text = PLAN_FACING_TEXT[direction];
    const front = frontBearing(direction);

    expect(claimed(text, new RegExp(`front axis points towards the ${NAME}\\b`)), text).toBe(front);
    // Measured from the front rather than restated, so a rear that drifted half a turn is a failure
    // rather than a second opinion.
    expect(claimed(text, new RegExp(`rear towards the ${NAME}\\b`)), text).toBe(
      atBearing(bearingOf(front) + 180),
    );
  });

  it.each(ALL_FACINGS)('keeps %s’s own left and right on the sides the turn puts them', (direction) => {
    // Viewed from above, a subject's right side is a quarter turn **clockwise** from its front: face
    // the bottom of the frame and your right hand is towards the frame's left. That is the reversal
    // this record exists to state, so it is the one the test derives rather than reads.
    const text = PLAN_FACING_TEXT[direction];
    const front = bearingOf(frontBearing(direction));

    expect(
      claimed(text, new RegExp(`\\*\\*left\\*\\* side faces (?:the frame’s |the )${NAME}\\b`)),
      text,
    ).toBe(atBearing(front - 90));
    expect(claimed(text, new RegExp(`\\*\\*right\\*\\* side (?:the frame’s |the )${NAME}\\b`)), text).toBe(
      atBearing(front + 90),
    );
  });

  it('drops every occlusion claim, which is the whole point of the register', () => {
    // Each of these is true of a camera with somewhere to stand behind the subject and of no camera
    // on the vertical, and each is a clause section 9 audits for.
    for (const direction of ALL_FACINGS) {
      const text = PLAN_FACING_TEXT[direction];
      expect(text, direction).not.toMatch(/hidden|visible|presented|foreshortened|occlude/);
    }
  });

  it('switches register at the vertical and nowhere else', () => {
    // One degree short of the vertical the camera still has a horizontal component, so the yaw hides
    // exactly what it hides at eye level and the occlusion contract is honest. A threshold below
    // that would drop a contract the sheet can still be held to.
    expect(facingText('west', PLAN_VIEW_ELEVATION - 1)).toBe(FACING_TEXT.west);
    expect(facingText('west', PLAN_VIEW_ELEVATION)).toBe(PLAN_FACING_TEXT.west);
  });
});

/** The inverse of {@link atBearing}: degrees clockwise from the bottom of the frame. */
function bearingOf(name: string): number {
  const index = SCREEN_DIRECTIONS.indexOf(name as (typeof SCREEN_DIRECTIONS)[number]);
  if (index < 0) throw new Error(`${name} is not a screen direction.`);
  return index * 45;
}
