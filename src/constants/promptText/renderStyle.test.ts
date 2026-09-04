import { describe, expect, it } from 'vitest';
import type { ResolutionProfile } from '../../types/output.ts';
import { RESOLUTION_PROFILES } from '../../types/output.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { statedTargetSize } from '../../utils/componentTargetSize.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { minFeatureSize, resolutionProfileDescription } from './renderStyle.ts';
import { SCALE_UNIT_TEXT } from './subject.ts';

/** The three profiles that *are* a scale, and so state a range against a unit. `CUSTOM` is not one. */
const SCALE_BEARING = ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT'] as const;

/**
 * Both frames, for the assertions the frame is not the subject of.
 *
 * The frame is the sheet's answer and no longer the category's — see `SheetPlan.scaleUnitFrame` —
 * so a test about the *unit* has to be run under both rather than under whichever one its category
 * happens to take. Which sheet takes which is pinned in `utils/sheetPlans.test.ts`, against a table
 * written out there for the reason this file writes its own sentences out.
 */
const BOTH_FRAMES = ['CELL', 'SHEET'] as const;

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
    expect(resolutionProfileDescription('CUSTOM', false, 'CHARACTER', 'SHEET')).toContain(
      'target component size',
    );
    expect(resolutionProfileDescription('CUSTOM', true, 'CHARACTER', 'SHEET')).toContain(
      'target assembled size',
    );
    expect(resolutionProfileDescription('CUSTOM', true, 'CHARACTER', 'SHEET')).not.toContain(
      'component size',
    );

    // The three that *are* a scale read the same either way — the assembled answer is CUSTOM's
    // alone, because CUSTOM is the only profile that defers to the field.
    for (const profile of SCALE_BEARING) {
      for (const frame of BOTH_FRAMES) {
        expect(resolutionProfileDescription(profile, true, 'CHARACTER', frame)).toBe(
          resolutionProfileDescription(profile, false, 'CHARACTER', frame),
        );
      }
    }
  });

  it('states CUSTOM the same way for every category, because it names no unit at all', () => {
    // `CUSTOM` defers to the target-size line, which names its own quantity — so it is the one
    // profile the category cannot move, and a unit interpolated into it would be a second answer to
    // a question that line has already answered. The frame cannot move it either, for the same
    // reason: `CUSTOM` states no share, so it has nothing to measure against anything.
    for (const category of SUBJECT_CATEGORIES) {
      for (const frame of BOTH_FRAMES) {
        expect(resolutionProfileDescription('CUSTOM', false, category, frame)).toBe(
          resolutionProfileDescription('CUSTOM', false, 'CHARACTER', 'SHEET'),
        );
      }
    }
  });
});

/**
 * The scale-bearing profiles against the unit each category's sheet is actually priced in.
 *
 * The defect: all three stated their range against `a full figure`, which is a referent nine of the
 * thirteen categories have nothing to offer — a FONT sheet of twenty-six glyphs was told a full
 * figure occupies 25–35% of its height.
 */
describe('resolutionProfileDescription — the unit the range is stated against', () => {
  it('names this category’s own unit in every profile that carries a range', () => {
    for (const category of SUBJECT_CATEGORIES) {
      for (const profile of SCALE_BEARING) {
        for (const frame of BOTH_FRAMES) {
          expect(resolutionProfileDescription(profile, false, category, frame)).toContain(
            SCALE_UNIT_TEXT[category],
          );
        }
      }
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
    for (const category of SUBJECT_CATEGORIES) {
      if (category === 'CHARACTER') continue;
      for (const profile of RESOLUTION_PROFILES) {
        for (const statesAssembled of [true, false]) {
          for (const frame of BOTH_FRAMES) {
            const stated = resolutionProfileDescription(profile, statesAssembled, category, frame);
            expect(stated, `${category} / ${profile} / assembled=${statesAssembled}`).not.toContain('figure');
          }
        }
      }
    }
  });

  it('states the whole sentence a reader sees, not only the unit it was handed', () => {
    // The assertion above reads the same map the function reads, so it can only catch the
    // interpolation being deleted outright. These five are written out, so the wording is pinned by
    // something that does not move when the map does — both frames, both share rungs, the absolute
    // rung that takes no frame, and the assembled wording only `CUSTOM` reaches.
    expect(resolutionProfileDescription('HIGH_RESOLUTION', false, 'CHARACTER', 'SHEET')).toBe(
      'High resolution — a full figure occupies 25–35% of the sheet height',
    );
    expect(resolutionProfileDescription('MID_RESOLUTION', false, 'FONT', 'CELL')).toBe(
      'Mid resolution — one capital glyph occupies 35–50% of its cell height in the exploded grid',
    );
    expect(resolutionProfileDescription('HIGH_RESOLUTION', false, 'ICON', 'CELL')).toBe(
      'High resolution — one icon occupies 50–65% of its cell height in the exploded grid',
    );
    // The sentence the parallax set now carries, which is what issue #216 settled: the same category
    // reads the second way on its layer library, where no band is drawn.
    expect(resolutionProfileDescription('HIGH_RESOLUTION', false, 'BACKGROUND', 'CELL')).toBe(
      'High resolution — one parallax band occupies 50–65% of its cell height in the exploded grid',
    );
    expect(resolutionProfileDescription('HIGH_RESOLUTION', false, 'BACKGROUND', 'SHEET')).toBe(
      'High resolution — one parallax band occupies 25–35% of the sheet height',
    );
    expect(resolutionProfileDescription('RETRO_16_BIT', false, 'EFFECT', 'CELL')).toBe(
      '16-bit retro scale — one frame of the effect is roughly 64–96 pixels tall',
    );
    expect(resolutionProfileDescription('CUSTOM', true, 'VEHICLE', 'SHEET')).toBe(
      'Custom — work to the target assembled size stated below, drawing every component at the share of a full vehicle it occupies',
    );
  });

  /**
   * The two sentences each frame produces, written out rather than read back off `SHARE_RANGE`.
   *
   * **The whole claim of the frame is in these four strings**, so an expectation built from the same
   * record `resolutionProfileDescription` reads would assert nothing: both sides move together, and
   * a rung swapped between the frames passes. Which *sheet* is owed which frame is the other half,
   * and it is pinned in `utils/sheetPlans.test.ts` — a table written out there for this reason, and
   * kept there because it is a claim about what each plan draws rather than about wording.
   */
  const FRAMED = {
    SHEET: {
      HIGH_RESOLUTION: '25–35% of the sheet height',
      MID_RESOLUTION: '18–25% of the sheet height',
    },
    CELL: {
      HIGH_RESOLUTION: '50–65% of its cell height in the exploded grid',
      MID_RESOLUTION: '35–50% of its cell height in the exploded grid',
    },
  } as const;

  it('states the range in the frame it is handed, for every category', () => {
    // The range belongs to the profile *within a frame*: it is the frame that follows the sheet, and
    // only because a share of the sheet height cannot be stated about a unit that sheet draws one of
    // per component. A range that varied by category inside one frame would be a third thing moving.
    for (const category of SUBJECT_CATEGORIES) {
      for (const frame of BOTH_FRAMES) {
        for (const profile of ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const) {
          expect(
            resolutionProfileDescription(profile, false, category, frame),
            `${category} / ${profile} / ${frame}`,
          ).toContain(FRAMED[frame][profile]);
        }
        // The absolute rung takes no frame at all, which is why it is the one the defect never
        // reached — and why it reads the same under both.
        expect(resolutionProfileDescription('RETRO_16_BIT', false, category, frame)).toContain(
          'roughly 64–96 pixels tall',
        );
      }
    }
  });

  it('never prices a unit against the sheet when it was handed the cell', () => {
    // The defect: twenty-eight icons were each told to occupy 25–35% of the sheet height, which is
    // 1.75 sheet heights squared of artwork on a 16:9 page measuring 1.78 — more than the whole
    // surface, with nothing left for the spacing the same prompt asks for two sections later. The
    // arithmetic is held in `tests/resolution-profile-fit.test.ts`; this is the wording half of it.
    for (const category of SUBJECT_CATEGORIES) {
      for (const profile of ['HIGH_RESOLUTION', 'MID_RESOLUTION'] as const) {
        expect(resolutionProfileDescription(profile, false, category, 'CELL'), category).not.toContain(
          'of the sheet height',
        );
      }
    }
  });
});
