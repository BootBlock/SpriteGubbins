import { describe, expect, it } from 'vitest';
import { HARDWARE_PROFILE_IDS } from '../../types/hardware.ts';
import type { HardwareProfile } from '../../types/hardware.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { paletteFor } from '../palettes/index.ts';
import { HARDWARE_PROFILE_CHOICES, HARDWARE_PROFILES, hardwareProfileFor } from './index.ts';

/**
 * The hardware library's own contract, and the boundary between it and the palette library.
 *
 * The division of labour is what most of this is about: a profile owns geometry and a palette owns
 * colour, and the moment a profile starts describing colours the two can contradict each other in a
 * prompt — which is precisely the failure the split was designed to make impossible. A grep for
 * colour words in `constraints` is a blunt instrument and it is the right one, because the mistake
 * it catches is somebody writing a sentence rather than somebody changing a type.
 */

const DEFINED: readonly HardwareProfile[] = HARDWARE_PROFILE_IDS.map((id) => HARDWARE_PROFILES[id]).filter(
  (profile): profile is HardwareProfile => profile !== null,
);

/** Words that would mean a constraint line has wandered into the palette's half. */
const COLOUR_WORDS = /\bcolou?rs?\b|\bpalettes?\b|\bshades?\b|\bhues?\b/i;

describe('the hardware library', () => {
  it('defines every id except NONE, and NONE alone', () => {
    expect(hardwareProfileFor('NONE')).toBeNull();
    expect(DEFINED).toHaveLength(HARDWARE_PROFILE_IDS.length - 1);
  });

  it.each(DEFINED)('$id carries its own id, so a lookup cannot return a mislabelled machine', (profile) => {
    expect(HARDWARE_PROFILES[profile.id]).toBe(profile);
  });

  it('offers exactly one choice per id, in the union’s order', () => {
    expect(HARDWARE_PROFILE_CHOICES.map((choice) => choice.value)).toEqual([...HARDWARE_PROFILE_IDS]);
  });

  it.each(DEFINED)('$id names itself in prose the prompt can use', (profile) => {
    // Interpolated mid-sentence — "artwork for the Sega Mega Drive" — so the stored identifier
    // reaching it would read as a substitution that failed.
    expect(profile.name).not.toContain('_');
    expect(profile.name).not.toBe(profile.id);
    expect(profile.name.trim()).toBe(profile.name);
  });
});

describe('a profile’s constraints', () => {
  it.each(DEFINED)('$id states at least two, as complete sentences', (profile) => {
    // One line is not a machine's shape, and the list is emitted as a bullet list and joined into
    // the control's description, so each line has to stand as a sentence in both.
    expect(profile.constraints.length).toBeGreaterThanOrEqual(2);
    for (const constraint of profile.constraints) {
      expect(constraint.trim()).toBe(constraint);
      expect(constraint).toMatch(/\.$/);
    }
  });

  it.each(DEFINED)('$id says nothing about colour, which is the palette’s half', (profile) => {
    const trespassing = profile.constraints.filter((constraint) => COLOUR_WORDS.test(constraint));
    expect(
      trespassing,
      `${profile.id} states colour in a geometry constraint; put it in its palette's note instead`,
    ).toEqual([]);
  });

  it.each(DEFINED)('$id states the display it is drawn for', (profile) => {
    // Every machine here has a native resolution, and it is the single most useful figure in the
    // list — a profile that omitted it would be describing sprite sizes against nothing.
    expect(profile.constraints.some((constraint) => /\d+\s*×\s*\d+/.test(constraint))).toBe(true);
  });
});

describe('a profile’s settings', () => {
  it.each(DEFINED)('$id pins a palette that exists and is not FREE', (profile) => {
    // A machine with no palette would apply a package that says nothing about its colours, which is
    // the one thing a user choosing "Game Boy" is certain to expect it to do.
    expect(profile.settings.palette).not.toBe('FREE');
    expect(paletteFor(profile.settings.palette)).not.toBeNull();
  });

  it.each(DEFINED)('$id gives its CUSTOM resolution a size to work to', (profile) => {
    // `CUSTOM` means "work to the target component size". With an unreadable size it means nothing
    // at all, and the prompt loses its only statement of scale — the same invariant the preset
    // library is held to.
    expect(profile.settings.resolutionProfile).toBe('CUSTOM');
    expect(parseTargetSize(profile.settings.spriteTargetSize)).not.toBeNull();
  });

  it.each(DEFINED)('$id draws in one of the two pixel styles', (profile) => {
    // Every machine in the library predates smooth rendering, so a painted or 3D render style in a
    // shipped profile would be a package contradicting the hardware it is named for. A user may
    // still choose one afterwards — that is their unusual request to make, not the preset's.
    expect(['PIXEL_ART', 'RETRO_PIXEL_ART']).toContain(profile.settings.renderStyle);
  });
});
