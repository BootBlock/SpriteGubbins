import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMERA_ELEVATIONS,
  DEPTH_ORDER_TEXT,
  DIRECTION_LISTS,
  FACING_TEXT,
  OBJECT_YAW,
} from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';
import { directionalRotation } from './directionalRotation.ts';

/**
 * The block that turns three direction *names* into three object yaws.
 *
 * The defect these are written against: named alone, `front-three-quarter`, `right side` and
 * `back-three-quarter` were all satisfied by the same flattering three-quarter view with the details
 * moved about. So the assertions are about what distinguishes the views — a distinct yaw each, and a
 * statement of what each yaw hides — rather than about the prose being present.
 */

const THREE = DIRECTION_LISTS.THREE_CLASSIC;

/** An angled-overhead camera, where a turn genuinely hides one side and reveals another. */
const ANGLED = DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN;

/** Directly overhead, where it does neither. */
const OVERHEAD = DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN;

describe('directionalRotation', () => {
  it('gives every facing of a set a distinct object yaw', () => {
    const block = directionalRotation(THREE, ANGLED);

    expect(block).toContain('**Front-three-quarter — object yaw 45°.**');
    expect(block).toContain('**Right side — object yaw 90°.**');
    expect(block).toContain('**Back-three-quarter — object yaw 135°.**');
  });

  it('states what each yaw hides, not only what it shows', () => {
    // A direction name can be met by a three-quarter view with different details; "front-facing
    // features are mostly turned away" cannot. Occlusion is the half that makes the rotation real.
    const block = directionalRotation(THREE, ANGLED);

    expect(block).toContain('the left side is completely hidden');
    expect(block).toContain('front-facing features are mostly turned away');
  });

  it('separates the yaw figure from the screen angle it produces', () => {
    // Yaw is a rotation of the object, and the projection decides how much apparent turn that is.
    // Demanding 90° of visible screen rotation from an angled-overhead camera is unsatisfiable.
    expect(directionalRotation(THREE, ANGLED)).toContain(
      'not a screen angle to measure off the finished image',
    );
  });

  it('claims no occlusion at all from a camera directly overhead', () => {
    // The defect: from the vertical the same top surface faces the camera at every yaw, so a front
    // and a rear view differ by an in-plane rotation and nothing else. Stating that one hides what
    // the other presents asks for a difference this camera cannot produce — and section 9 then
    // audits for it and fails the sheet over it either way round.
    const block = directionalRotation(DIRECTION_LISTS.FOUR_CARDINAL, OVERHEAD);

    expect(block).toContain('**South — object yaw 0°.**');
    expect(block).not.toContain('no part of the rear is visible');
    expect(block).not.toContain('completely hidden');
    expect(block).not.toContain('fully presented');
  });

  it('says where each facing points instead, and where its own sides land', () => {
    // What a plan view actually varies, and the half that goes wrong when nothing states it: seen
    // from above, a subject facing down the frame has its right side towards the frame's left.
    const block = directionalRotation(DIRECTION_LISTS.FOUR_CARDINAL, OVERHEAD);

    expect(block).toContain('front axis points towards the bottom of the frame');
    expect(block).toContain('**right** side the frame’s left');
    expect(block).toContain('a yaw *is* the turn you see');
    expect(block).not.toContain('not a screen angle to measure off the finished image');
  });

  it('says a single-facing sheet is one run of a series, not a sheet to mirror', () => {
    const block = directionalRotation(['north-west'], ANGLED);

    expect(block).toContain('This sheet covers one object yaw');
    expect(block).toContain('**North-west — object yaw 135°.**');
    expect(block).toContain('never this sheet mirrored');
    // Nothing about comparing views: there is only one on this sheet.
    expect(block).not.toContain('in the order below');
  });

  it('measures a single facing from the frame when there is nothing to face', () => {
    // The datum survives the register change: yaw still starts from the same orientation, stated in
    // the only terms a plan view leaves — "facing the camera" describes nothing from the vertical.
    const block = directionalRotation(['north-west'], OVERHEAD);

    expect(block).toContain('This sheet covers one object yaw');
    // Matched across the block's own wrapping, so re-flowing the paragraph does not fail a test
    // about what it says.
    expect(block).toMatch(/front axis pointing\s+towards the bottom of the frame/);
    expect(block).toContain('never this sheet mirrored');
    expect(block).not.toContain('measured from the component facing the camera');
  });

  it('never lets two facings of one set claim the same yaw', () => {
    // The whole mechanism rests on this: two views at one yaw are two views facing the same way,
    // which is the failure being fixed.
    for (const facings of Object.values(DIRECTION_LISTS)) {
      const yaws = facings.map((facing) => OBJECT_YAW[facing]);
      expect(new Set(yaws).size, facings.join(', ')).toBe(facings.length);
    }
  });

  it('agrees with the depth order about which side leads', () => {
    // Two maps describing one facing: `rotation.ts` says which side the turn presents, `depthOrder.ts`
    // says which side's pieces therefore render in front of the body. Both reach the same prompt, so
    // a disagreement is a self-contradiction the generator resolves however it likes — and they
    // *did* disagree: the two southern diagonals named the far side as the near one.
    const NEAR_SIDE = /near \((left|right)\) side|profile with the (left|right) side/;

    for (const facing of Object.keys(FACING_TEXT) as Direction[]) {
      const leading = /\*\*(left|right)\*\*/.exec(FACING_TEXT[facing]);
      if (leading === null) continue; // `front`, `south` and `north` present no side at all.

      const near = NEAR_SIDE.exec(DEPTH_ORDER_TEXT[facing]);
      expect(near, `${facing} names a leading side but its depth order names no near side`).not.toBeNull();
      expect(near?.[1] ?? near?.[2], facing).toBe(leading[1]);
    }
  });
});
