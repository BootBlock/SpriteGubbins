import { describe, expect, it } from 'vitest';
import type { ResolutionProfile } from '../../types/output.ts';
import { RESOLUTION_PROFILES } from '../../types/output.ts';
import { everySheetOf } from '../../test/categoryProse.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { statedTargetSize } from '../../utils/componentTargetSize.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { OUTPUT_TOOLTIPS } from '../output/tooltips.ts';
import { minFeatureSize, resolutionProfileDescription, shareRange } from './renderStyle.ts';

/** The three profiles that *are* a scale, and so state a range. `CUSTOM` is not one. */
const SCALE_BEARING = ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT'] as const;

/** The two of those that state their range as a share of a cell rather than in pixels. */
const SHARE_BEARING = ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const;

/**
 * Every scale unit a sheet plan states, with the category whose sheet states it — the whole space
 * `resolutionProfileDescription`'s third argument ranges over.
 *
 * Read off the plans rather than written out, so a new sheet's unit is swept the moment it exists.
 */
const SHEET_UNITS: readonly (readonly [SubjectCategory, string])[] = SUBJECT_CATEGORIES.flatMap((category) =>
  [...new Set(everySheetOf(category).map((plan) => plan.scaleUnit))].map((unit) => [category, unit] as const),
);

/**
 * The figure alone, which is what the rungs below are about — the unit has its own test.
 *
 * It is taken off the stated measurement rather than from a second export, so a rung assertion still
 * fails if the suffix stops being there at all.
 */
const NATIVE = ' native pixels';
function figure(profile: ResolutionProfile, spriteTargetSize: string): string {
  const size = parseTargetSize(spriteTargetSize);
  const stated = minFeatureSize(profile, size === null ? null : { quantity: 'COMPONENT', size }, true);
  expect(stated.endsWith(NATIVE), stated).toBe(true);
  return stated.slice(0, -NATIVE.length);
}

/**
 * The pixel-discipline minimum, which is a function of the scale rather than a lookup on the
 * profile — because one of the four profiles carries no scale of its own.
 */
describe('minFeatureSize', () => {
  it('gives each fixed profile the minimum its own scale affords', () => {
    expect(figure('HIGH_RESOLUTION', '')).toBe('3 × 3');
    expect(figure('MID_RESOLUTION', '')).toBe('2 × 2');
    expect(figure('RETRO_16_BIT', '')).toBe('1 × 1');
  });

  it('ignores a target size on a profile that already states its own scale', () => {
    // Those three *are* a scale, so a size left in the field cannot move them. Only `CUSTOM` defers
    // to it, which is what keeps the two statements of scale from arguing.
    expect(figure('HIGH_RESOLUTION', '16 × 16 px')).toBe('3 × 3');
    expect(figure('RETRO_16_BIT', '512 × 512 px')).toBe('1 × 1');
  });

  it('lets CUSTOM reach single-pixel detail at the sizes sprites are actually drawn at', () => {
    // The defect a flat `2 × 2` for every `CUSTOM` configuration produced: a 16-pixel icon whose
    // smallest permitted feature was four pixels asked for a sprite drawn in sixteenths of itself,
    // and the generator resolved that by discarding one half of the instruction.
    expect(figure('CUSTOM', '16 × 16 px')).toBe('1 × 1');
    expect(figure('CUSTOM', '32 × 32 px')).toBe('1 × 1');
    // The same prose read as a component size, which is what a sheet of whole deliverable units
    // makes it — the word “assembled” is the preset author's and nothing here parses it. The case at
    // the foot of this file drives the other reading, on a sheet whose components are parts.
    expect(figure('CUSTOM', '48 × 96 px assembled (2 metres tall at 48 px per metre)')).toBe('1 × 1');
  });

  it('climbs the rungs as the stated component grows', () => {
    expect(figure('CUSTOM', '128 × 128 px')).toBe('1 × 1');
    expect(figure('CUSTOM', '129 × 129 px')).toBe('2 × 2');
    expect(figure('CUSTOM', '256 × 256 px')).toBe('2 × 2');
    expect(figure('CUSTOM', '512 × 512 px')).toBe('3 × 3');
  });

  it('keys on the smaller edge, which is the one detail runs out on', () => {
    // A polearm is a hundred and twenty-eight rows and sixteen columns, and it is the sixteen that
    // decide what a feature can cost. Keying on height would call this mid-resolution.
    expect(figure('CUSTOM', '16 × 512 px')).toBe('1 × 1');
    expect(figure('CUSTOM', '512 × 16 px')).toBe('1 × 1');
  });

  it('falls back to the middle rung when CUSTOM states no readable size', () => {
    // `CUSTOM` then means "work to the sheet aspect", so there is no scale to reason from and
    // neither extreme can be justified.
    expect(figure('CUSTOM', '')).toBe('2 × 2');
    expect(figure('CUSTOM', 'as big as it needs to be')).toBe('2 × 2');
    expect(figure('CUSTOM', '2 metres tall at 48 px per metre')).toBe('2 × 2');
  });

  it('counts native pixels only where the prompt defines one, and delivered pixels otherwise', () => {
    // The defect: the bullet said *native pixels* on every pixel-art sheet, while the block defining
    // a native pixel is gated on a far narrower condition — so the app's own default configuration
    // stated a measurement in a unit its prompt never established.
    expect(minFeatureSize('CUSTOM', { quantity: 'COMPONENT', size: { width: 16, height: 32 } }, true)).toBe(
      '1 × 1 native pixels',
    );
    expect(minFeatureSize('HIGH_RESOLUTION', null, false)).toBe('3 × 3 delivered pixels');
    // The figure does not move with the unit — only the noun does.
    expect(minFeatureSize('MID_RESOLUTION', null, true)).toBe('2 × 2 native pixels');
    expect(minFeatureSize('MID_RESOLUTION', null, false)).toBe('2 × 2 delivered pixels');
  });

  it('takes the finest rung where the stated size is the assembly, never a coarser guess', () => {
    // A rig sheet's components are a head, a torso, a pelvis and twelve limb segments, so the size
    // it states is the figure they assemble into and no rung can be derived from it. Two wrong
    // answers were available and both are coarser than the truth: the rung of the assembly is at
    // least as coarse as the rung of any piece of it, and the unstated middle rung is `2 × 2`. A
    // floor that is too coarse forbids detail a small piece legitimately needs, where one that is
    // too fine is merely inert — so the finest rung is the only answer that cannot be wrong.
    const assembled = statedTargetSize(
      'CHARACTER',
      'CUTOUT_RIG_SINGLE_DIRECTION',
      'SINGLE_FRONT',
      0,
      '480 × 960 px assembled',
    );
    expect(assembled).toEqual({ quantity: 'ASSEMBLED', size: { width: 480, height: 960 } });
    // 480 would be past the last rung as a component size, which is what makes this case the one
    // that shows the difference: `3 × 3` on limb segments a few dozen pixels across.
    expect(figure('CUSTOM', '480 × 960 px')).toBe('3 × 3');
    expect(minFeatureSize('CUSTOM', assembled, false)).toBe('1 × 1 delivered pixels');

    // And the three shipped rig presets that carry CUSTOM keep the floor they always had — each
    // sits on the finest rung by its assembled edge, so this restores rather than changes them.
    for (const size of ['64 × 96 px assembled', '56 × 88 px assembled', '64 × 80 px assembled']) {
      const rig = statedTargetSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'SINGLE_FRONT', 0, size);
      expect(minFeatureSize('CUSTOM', rig, false)).toBe('1 × 1 delivered pixels');
    }
  });

  it('states what CUSTOM works to, and never names a component on a sheet that has no such size', () => {
    // The two are printed one line apart in section 2, so a flat lookup here told the generator to
    // work to a component size directly above a line stating a size and saying no component is it.
    expect(resolutionProfileDescription('CUSTOM', false, 'a full figure')).toContain('target component size');
    expect(resolutionProfileDescription('CUSTOM', true, 'a full figure')).toContain('target assembled size');
    expect(resolutionProfileDescription('CUSTOM', true, 'a full figure')).not.toContain('component size');

    // The three that *are* a scale read the same either way — the assembled answer is CUSTOM's
    // alone, because CUSTOM is the only profile that defers to the field.
    for (const profile of SCALE_BEARING) {
      expect(resolutionProfileDescription(profile, true, 'a full figure')).toBe(
        resolutionProfileDescription(profile, false, 'a full figure'),
      );
    }
  });

  it('states CUSTOM the same way on every sheet, whichever quantity the size names, because it takes no unit', () => {
    // `CUSTOM` defers to the target-size line, which names its own quantity — so it is the one
    // profile the sheet cannot move, and a unit interpolated into it would be a second answer to a
    // question that line has already answered.
    //
    // **Both answers to `statesAssembled`**, because the assembled wording is the one that took a
    // unit, and issue #275 is what that cost: BACKGROUND's layer library states a whole backdrop and
    // read “the share of one parallax band it occupies” with no band on the sheet.
    for (const statesAssembled of [true, false]) {
      const [first = ''] = SHEET_UNITS.map(([, unit]) => unit);
      for (const [category, unit] of SHEET_UNITS) {
        expect(
          resolutionProfileDescription('CUSTOM', statesAssembled, unit),
          `${category} / ${unit} / assembled=${String(statesAssembled)}`,
        ).toBe(resolutionProfileDescription('CUSTOM', statesAssembled, first));
        expect(resolutionProfileDescription('CUSTOM', statesAssembled, unit)).not.toContain(unit);
      }
    }
  });
});

/**
 * The scale-bearing profiles against the unit each sheet is actually priced in.
 *
 * The defect: all three stated their range against `a full figure`, which is a referent nine of the
 * thirteen categories have nothing to offer — a FONT sheet of twenty-six glyphs was told a full
 * figure occupies 25–35% of its height.
 */
describe('resolutionProfileDescription — the unit the range is stated of', () => {
  it('names the sheet’s own unit in the profile that states a height in pixels', () => {
    for (const [category, unit] of SHEET_UNITS) {
      expect(resolutionProfileDescription('RETRO_16_BIT', false, unit), category).toContain(unit);
    }
  });

  it('never states a figure on a category that is not one, on any path through the function', () => {
    // CHARACTER is the exception rather than the only category the word could honestly reach:
    // `CATEGORY_ASSEMBLY` says in as many words that a creature is a figure for a generator's
    // purposes, which is why the two share `no assembled figure`. CREATURE is held here anyway
    // because section 2 has a noun of its own to use and no reason to borrow another category's.
    //
    // **Both answers to `statesAssembled`**, because the assembled wording is the path the first
    // pass missed: `CUSTOM` on an OBJECT, ITEM or VEHICLE sheet read "the share of that figure it
    // occupies" long after the three scale-bearing profiles had stopped saying it.
    for (const [category, unit] of SHEET_UNITS) {
      if (category === 'CHARACTER') continue;
      for (const profile of RESOLUTION_PROFILES) {
        for (const statesAssembled of [true, false]) {
          const stated = resolutionProfileDescription(profile, statesAssembled, unit);
          expect(stated, `${category} / ${profile} / assembled=${String(statesAssembled)}`).not.toContain(
            'figure',
          );
        }
      }
    }
  });

  it('states the whole sentence a reader sees, not only the unit it was handed', () => {
    // The assertions above interpolate the unit they check for, so they can only catch the
    // interpolation being deleted outright. These are written out, so the wording is pinned by
    // something that does not move when a plan does — both share rungs, the absolute rung, and the
    // assembled wording only `CUSTOM` reaches, on the unit of the sheet issue #275 was found on.
    expect(resolutionProfileDescription('HIGH_RESOLUTION', false, 'a full figure')).toBe(
      'High resolution — the largest component occupies 50–65% of its cell height in the exploded grid, and every other component is drawn to that same scale',
    );
    expect(resolutionProfileDescription('MID_RESOLUTION', false, 'one capital glyph')).toBe(
      'Mid resolution — the largest component occupies 35–50% of its cell height in the exploded grid, and every other component is drawn to that same scale',
    );
    expect(resolutionProfileDescription('RETRO_16_BIT', false, 'one frame of the effect')).toBe(
      '16-bit retro scale — one frame of the effect is roughly 64–96 pixels tall',
    );
    expect(resolutionProfileDescription('RETRO_16_BIT', false, 'a full figure')).toBe(
      '16-bit retro scale — a full figure is roughly 64–96 pixels tall',
    );
    expect(resolutionProfileDescription('CUSTOM', true, 'one mid mass')).toBe(
      'Custom — work to the target assembled size stated below, drawing every component at the share of the assembled whole it occupies',
    );
  });
});

/**
 * What the two share rungs measure, and what they must never measure.
 *
 * **Every share is of the largest component's own cell.** A share of the sheet height was decided by
 * something else in the same prompt on every kind of sheet: by the component count where the sheet
 * draws its unit once per component (issue #178), and by the layout where it draws the parts of one
 * whole — all eighteen character sheets measured for issue #245 drew the head and the pelvis alone at
 * 40–73% of the sheet height against a figure priced at 25–35%. `tests/resolution-profile-fit.test.ts`
 * holds the arithmetic against every compiled sheet; this is the wording half.
 */
describe('resolutionProfileDescription — the frame a share is stated in', () => {
  /**
   * The two ranges, written out rather than read back off `SHARE_RANGE`.
   *
   * An expectation built from the record the function reads would assert nothing: both sides would
   * move together, and a rung swapped for another would pass.
   */
  const STATED = {
    HIGH_RESOLUTION: '50–65%',
    MID_RESOLUTION: '35–50%',
  } as const;

  it('states each share rung as one sentence on every sheet, naming no sheet’s unit', () => {
    // The unit is what reached the six whole-subject categories as `a full X`, which names a whole
    // the sheet draws only in pieces and has no cell of its own. The largest component is a piece
    // every sheet has, so the sentence cannot depend on the sheet at all.
    for (const profile of SHARE_BEARING) {
      const sentence = resolutionProfileDescription(profile, false, 'one icon');
      expect(sentence, profile).toContain(
        `the largest component occupies ${STATED[profile]} of its cell height in the exploded grid`,
      );
      for (const [category, unit] of SHEET_UNITS) {
        expect(resolutionProfileDescription(profile, false, unit), `${category} / ${profile}`).toBe(sentence);
        expect(sentence, `${category} / ${profile}`).not.toContain(unit);
      }
    }
  });

  it('never states a share of the sheet height, on any profile, sheet or stated size', () => {
    for (const [category, unit] of SHEET_UNITS) {
      for (const profile of RESOLUTION_PROFILES) {
        for (const statesAssembled of [true, false]) {
          expect(
            resolutionProfileDescription(profile, statesAssembled, unit),
            `${category} / ${profile} / assembled=${String(statesAssembled)}`,
          ).not.toContain('of the sheet height');
        }
      }
    }
  });

  it('gives the field’s guidance the same two ranges the prompt states', () => {
    // The guidance used to carry the four figures of two frames in hand-written prose, which is the
    // copy that goes stale the moment a rung moves. It reads them from `shareRange` now, and this is
    // what notices if it stops.
    for (const profile of SHARE_BEARING) expect(shareRange(profile)).toBe(STATED[profile]);
    // Written as the sentence pairs them, so a swap of the two rungs fails as well as a stale figure.
    expect(OUTPUT_TOOLTIPS.resolutionProfile).toContain(
      `fills ${STATED.HIGH_RESOLUTION} of its cell height at high resolution and ${STATED.MID_RESOLUTION} at mid`,
    );
    expect(OUTPUT_TOOLTIPS.resolutionProfile).not.toContain('sheet height');
  });
});
