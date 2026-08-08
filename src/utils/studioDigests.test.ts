import { describe, expect, it } from 'vitest';
import { NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { OutputConfig } from '../types/output.ts';
import {
  continuityDigest,
  projectionDigest,
  renderStyleDigest,
  riggingDigest,
  sheetDigest,
  subjectGroupDigest,
} from './studioDigests.ts';

/**
 * What a folded group says it is set to.
 *
 * The property under test throughout is **agreement with the controls**: a digest naming a field the
 * open group does not render is worse than no digest at all, because the user reads it as the
 * configuration and it is not. So every conditional here is pinned on both sides — the rig geometry
 * that only exists for a `CUTOUT_RIG`, the primary facing that only exists when the mode splits into
 * runs, the manifest that only exists where the target has a text channel to return one through.
 */
function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_OUTPUT_CONFIG, ...overrides };
}

describe('subjectGroupDigest', () => {
  it('lists the group’s values in the order the group names them', () => {
    expect(subjectGroupDigest(DEFAULT_PRESET.subject, ['species', 'role'])).toBe(
      `${DEFAULT_PRESET.subject.species} · ${DEFAULT_PRESET.subject.role}`,
    );
  });

  it('drops a cleared field rather than leaving a gap where a value would be', () => {
    const subject = { ...DEFAULT_PRESET.subject, gender: '   ' };
    expect(subjectGroupDigest(subject, ['species', 'gender', 'age'])).toBe(
      `${subject.species} · ${subject.age}`,
    );
  });

  it('is empty when the whole group is', () => {
    const subject = { ...DEFAULT_PRESET.subject, primary_colours: '', accent_colours: '' };
    expect(subjectGroupDigest(subject, ['primary_colours', 'accent_colours'])).toBe('');
  });

  it('bounds a value the user typed, so one field cannot crowd out its group', () => {
    const subject = { ...DEFAULT_PRESET.subject, species: 'x'.repeat(400) };
    const digest = subjectGroupDigest(subject, ['species', 'role']);
    expect(digest).toContain('…');
    // Bounded, and the rest of the group survives.
    expect(digest.length).toBeLessThan(120);
    expect(digest).toContain(subject.role);
  });

  it('leaves every option the app itself offers intact', () => {
    // The longest string in any shipped pool is 41 characters; the limit is 48. A digest that
    // ellipsised a value the user picked from the list would be cutting the app's own vocabulary.
    const longest = 'Dark Stained Wood & Vermilion Red #EA580C';
    const subject = { ...DEFAULT_PRESET.subject, primary_colours: longest };
    expect(subjectGroupDigest(subject, ['primary_colours'])).toBe(longest);
  });
});

describe('sheetDigest', () => {
  it('states an uncapped budget in words rather than printing nought', () => {
    const digest = sheetDigest('CHARACTER', withOutput({ componentBudget: NO_COMPONENT_BUDGET }));
    // "uncapped", not "no budget" — the latter reads in plain English as *no allowance*, which is
    // the exact misreading of `0` this branch exists to prevent.
    expect(digest).toContain('uncapped');
    expect(digest).not.toContain('budget 0');
  });

  it('states a real budget as a number', () => {
    expect(sheetDigest('CHARACTER', withOutput({ componentBudget: 43 }))).toContain('budget 43');
  });

  it('resolves the mode through the category, as the control does', () => {
    // A tileset is not something a character sheet can produce, so the stored value is resolved to
    // the plan the category actually has — and the digest must agree with the select showing it.
    const digest = sheetDigest('CHARACTER', withOutput({ directionalMode: 'TILESET_MODULAR' }));
    expect(digest).not.toContain('TILESET_MODULAR');
  });

  it('names the background key and the canvas aspect', () => {
    const digest = sheetDigest('CHARACTER', DEFAULT_OUTPUT_CONFIG);
    expect(digest).toContain(DEFAULT_OUTPUT_CONFIG.backgroundKey);
    expect(digest).toContain(DEFAULT_OUTPUT_CONFIG.aspectRatio);
  });
});

describe('renderStyleDigest', () => {
  it('covers all seven controls when they are all set', () => {
    const output = withOutput({ spriteTargetSize: '48 × 96 px' });
    const digest = renderStyleDigest(output);
    for (const value of [
      output.renderStyle,
      output.surfaceDetail,
      output.resolutionProfile,
      output.spriteTargetSize,
      output.paletteLimit,
      output.outlineStyle,
      output.lightingModel,
    ]) {
      expect(digest).toContain(value);
    }
  });

  it('omits the target size when it has none — the compiler omits its line too', () => {
    expect(renderStyleDigest(withOutput({ spriteTargetSize: '' }))).not.toContain(' ·  · ');
  });
});

describe('projectionDigest', () => {
  it('carries the elevation with its unit', () => {
    expect(projectionDigest(withOutput({ cameraElevation: 30 }))).toContain('30°');
  });

  it('names the primary facing only when the mode splits into runs', () => {
    // `CUTOUT_RIG_SINGLE_DIRECTION` covers one facing at a time over a set naming three, which is
    // exactly when `ProjectionFields` shows the facing control.
    const splitting = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'THREE_CLASSIC',
      primaryDirection: 'back-three-quarter',
    });
    expect(projectionDigest(splitting)).toContain('back-three-quarter');

    // The default mode draws its own three facings whatever the facing said, and the control is
    // hidden — so the digest must not claim one.
    const fixed = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'THREE_CLASSIC',
      primaryDirection: 'back-three-quarter',
    });
    // Naming the *set* is right; naming the facing is not, and an exact match is the only assertion
    // that can tell those two apart — `back-three-quarter` is a member of `THREE_CLASSIC`.
    expect(projectionDigest(fixed)).toBe('THREE_QUARTER_TOPDOWN · 35° · THREE_CLASSIC');
  });
});

describe('riggingDigest', () => {
  it('says only the mode when the rig has no geometry to describe', () => {
    expect(riggingDigest(withOutput({ rigMode: 'POSE_LIBRARY' }))).toBe('POSE_LIBRARY');
  });

  it('adds the joint, overlap and socket settings for a cut-out rig', () => {
    const digest = riggingDigest(
      withOutput({
        rigMode: 'CUTOUT_RIG',
        jointCapStyle: 'ROUNDED',
        overlapMargin: 'HALF_CAP',
        sockets: 'head, chest',
      }),
    );
    expect(digest).toBe('CUTOUT_RIG · ROUNDED · HALF_CAP · head, chest');
  });

  it('omits empty sockets rather than trailing a separator', () => {
    expect(riggingDigest(withOutput({ rigMode: 'CUTOUT_RIG', sockets: '' }))).not.toMatch(/·\s*$/);
  });
});

describe('continuityDigest', () => {
  it('says so when there is no identity lock, rather than saying nothing at all', () => {
    expect(continuityDigest(withOutput({ identityLock: '' }))).toBe('no identity lock');
  });

  it('shows the lock once it is written', () => {
    expect(continuityDigest(withOutput({ identityLock: 'Cyan visor' }))).toContain('Cyan visor');
  });

  it('puts the manifest ahead of the lock, so the clipped end is the free text', () => {
    // The lock is the one unbounded value in any digest — a sentence, and `withPaletteSegment`
    // appends a palette to it. Behind it, the checkbox's only signal anywhere is what falls off.
    const digest = continuityDigest(
      withOutput({
        emitManifest: true,
        targetModel: 'CHATGPT_5_6_SOL',
        identityLock: 'Cyan visor across upper face; three amber chest lights in a vertical row',
      }),
    );
    expect(digest.indexOf('JSON manifest')).toBeLessThan(digest.indexOf('Cyan visor'));
  });

  it('names the manifest only where the target can return one', () => {
    // `CHATGPT_5_6_SOL` answers with text; Midjourney returns an image and nothing else, which is
    // why `ContinuityFields` disables the checkbox there.
    expect(continuityDigest(withOutput({ emitManifest: true, targetModel: 'CHATGPT_5_6_SOL' }))).toContain(
      'JSON manifest',
    );
    expect(continuityDigest(withOutput({ emitManifest: true, targetModel: 'MIDJOURNEY' }))).not.toContain(
      'JSON manifest',
    );
  });
});
