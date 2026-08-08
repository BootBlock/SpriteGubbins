import { describe, expect, it } from 'vitest';
import { NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { OutputConfig } from '../types/output.ts';
import {
  companionDigest,
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
    // With no palette pinned, which is what leaves the colour budget as the group's colour setting.
    const output = withOutput({ spriteTargetSize: '48 × 96 px', palette: 'FREE' });
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

  it('names a pinned palette in place of the budget it supersedes', () => {
    // The digest lists what the group's controls actually *do*, and a pinned palette leaves the
    // budget doing nothing — the prompt drops its line and the quantiser ignores it. Naming both
    // would put a setting in a folded header that has no effect anywhere.
    const digest = renderStyleDigest(
      withOutput({ palette: 'GAME_BOY_DMG', paletteLimit: 'STRICT_32_COLOR' }),
    );

    expect(digest).toContain('GAME_BOY_DMG');
    expect(digest).not.toContain('STRICT_32_COLOR');
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

  it('names the set the sheet is drawn to, not the one the mode discarded', () => {
    // The regression this pair exists for, and the one every case above is blind to: each of them
    // holds a set the mode would have chosen anyway, so reading `output.directions` raw and reading
    // it through `effectiveDirectionSet` produce the same string. Only a *disagreeing* pair can
    // tell them apart — eight compass points asked for, three classic yaws drawn.
    const discarded = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
    expect(projectionDigest(discarded)).toBe('THREE_QUARTER_TOPDOWN · 35° · THREE_CLASSIC');

    // The same stored set, on a mode that does defer to it: here it is the honest answer.
    const deferring = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
    expect(projectionDigest(deferring)).toBe('THREE_QUARTER_TOPDOWN · 35° · EIGHT_COMPASS · north-west');
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

  it('says nothing about the manifest, which is not one of its controls', () => {
    // The checkbox lives in `CompanionOutputFields`. A digest naming a control its group does not
    // render is the failure this whole module is written to avoid.
    expect(continuityDigest(withOutput({ emitManifest: true }))).not.toContain('manifest');
  });
});

describe('companionDigest', () => {
  it('says the target returns the image alone when neither box is ticked', () => {
    expect(companionDigest(withOutput({ emitManifest: false, emitPromptFeedback: false }))).toBe(
      'image only',
    );
  });

  it('names each deliverable that was asked for', () => {
    const digest = companionDigest(
      withOutput({ emitManifest: true, emitPromptFeedback: true, targetModel: 'CHATGPT_5_6_SOL' }),
    );
    expect(digest).toContain('JSON manifest');
    expect(digest).toContain('adherence report');
  });

  it('names neither where the target cannot deliver them, however the preference is stored', () => {
    // Midjourney returns an image and nothing else, so both checkboxes render unticked and
    // disabled while the stored preference survives — and the digest has to agree with the screen,
    // not with the store.
    expect(
      companionDigest(
        withOutput({ emitManifest: true, emitPromptFeedback: true, targetModel: 'MIDJOURNEY' }),
      ),
    ).toBe('image only');
  });
});
