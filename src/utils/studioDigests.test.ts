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

  it('names which sheet of the series, and only where that control exists', () => {
    // The group grew a fifth control, and the rule this module is written to is that a folded group
    // must not hide a setting. Two sheets of one series differ in nothing else the header carries, so
    // without this the collapsed digest read identically above two entirely different inventories.
    const core = sheetDigest('CHARACTER', withOutput({ sheetIndex: 0 }));
    const limbs = sheetDigest('CHARACTER', withOutput({ sheetIndex: 1 }));

    expect(core).toContain('Directional core');
    expect(limbs).toContain('Articulation');
    expect(core).not.toBe(limbs);

    // And silent where the pairing is one generation: the control is not rendered there, and a digest
    // naming a setting that is not on screen is what the module forbids in the other direction.
    const single = sheetDigest('OBJECT', withOutput({ sheetIndex: 0 }));
    expect(single).not.toContain('Directional views');
    expect(single).toBe(sheetDigest('OBJECT', withOutput({ sheetIndex: 1 })));
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

  it('drops the three settings a validation pass supersedes, and keeps the light a clay pass uses', () => {
    // `RenderStyleFields` withdraws those three controls on the same lookup, so a header naming them
    // would report a configuration the open group no longer offers — and, worse, one the prompt no
    // longer carries. The lighting model stays: a clay render is read by the way light falls across
    // it, which is the one surface setting this pass keeps.
    const digest = renderStyleDigest(
      withOutput({
        renderStyle: 'CLAY_RENDER',
        surfaceDetail: 'TEXTURED',
        paletteLimit: 'STRICT_32_COLOR',
        outlineStyle: 'PURE_BLACK_OUTLINE',
        lightingModel: 'ISOMETRIC_TOP_LEFT',
      }),
    );

    expect(digest).toContain('CLAY_RENDER');
    expect(digest).toContain('ISOMETRIC_TOP_LEFT');
    expect(digest).not.toContain('TEXTURED');
    expect(digest).not.toContain('STRICT_32_COLOR');
    expect(digest).not.toContain('PURE_BLACK_OUTLINE');
  });

  it('takes the light too where the pass leaves nowhere for it to land', () => {
    // The narrower half of the same rule, and the one a single validation-pass check would miss: a
    // flat fill of one colour has no surface for a key light, so that control goes as well.
    const digest = renderStyleDigest(
      withOutput({ renderStyle: 'SILHOUETTE_ONLY', lightingModel: 'ISOMETRIC_TOP_LEFT' }),
    );

    expect(digest).toContain('SILHOUETTE_ONLY');
    expect(digest).not.toContain('ISOMETRIC_TOP_LEFT');
  });

  it('still names a pinned palette under a pass, which supersedes the budget and not the list', () => {
    // The two supersessions stack rather than collide: one material or one fill takes its colour
    // from the pinned list like anything else does, and the prompt still carries the palette block.
    const digest = renderStyleDigest(
      withOutput({
        renderStyle: 'SILHOUETTE_ONLY',
        palette: 'GAME_BOY_DMG',
        paletteLimit: 'STRICT_32_COLOR',
      }),
    );

    expect(digest).toContain('GAME_BOY_DMG');
    expect(digest).not.toContain('STRICT_32_COLOR');
  });
});

describe('projectionDigest', () => {
  it('carries the elevation with its unit', () => {
    expect(projectionDigest('CHARACTER', withOutput({ cameraElevation: 30 }))).toContain('30°');
  });

  it('names the primary facing only when the mode splits into runs', () => {
    // `CUTOUT_RIG_SINGLE_DIRECTION` covers one facing at a time over a set naming three, which is
    // exactly when `ProjectionFields` shows the facing control.
    const splitting = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'THREE_CLASSIC',
      primaryDirection: 'back-three-quarter',
    });
    expect(projectionDigest('CHARACTER', splitting)).toContain('back-three-quarter');

    // The default mode draws its own five facings whatever the facing said, and the control is
    // hidden — so the digest must not claim one.
    const fixed = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'FIVE_CLASSIC',
      primaryDirection: 'back-three-quarter',
    });
    // Naming the *set* is right; naming the facing is not, and an exact match is the only assertion
    // that can tell those two apart — `back-three-quarter` is a member of `FIVE_CLASSIC`.
    expect(projectionDigest('CHARACTER', fixed)).toBe('THREE_QUARTER_TOPDOWN · 35° · FIVE_CLASSIC');
  });

  it('names the chosen set on the core mode too, because the core now draws it', () => {
    // The chosen set steers every kind of sheet, so the digest echoes the choice — and the facing
    // stays absent on the core sheet, which covers its plan's own views whatever the facing said.
    const steered = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
    expect(projectionDigest('CHARACTER', steered)).toBe('THREE_QUARTER_TOPDOWN · 35° · EIGHT_COMPASS');

    // The same stored set on a run-list mode names the facing as well.
    const deferring = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
    expect(projectionDigest('CHARACTER', deferring)).toBe(
      'THREE_QUARTER_TOPDOWN · 35° · EIGHT_COMPASS · north-west',
    );
  });

  it('names the set and the camera the category can honour, not the ones it arrived holding', () => {
    // The same regression on the other two axes, and the reason this digest takes a category at all.
    // An INTERFACE draws `SINGLE_FRONT` whatever a stored `THREE_CLASSIC` says, and is drawn under
    // `ORTHOGRAPHIC_FRONT` whatever a stored `THREE_QUARTER_TOPDOWN` says — so a header reading the
    // raw fields would disagree with both the selects above it and the prompt below it. It would
    // also name a facing, because three classic yaws look like a run list until the category is
    // consulted, and a 35° elevation the flat camera it now names cannot be drawn at.
    const turned = withOutput({
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'THREE_CLASSIC',
      primaryDirection: 'front-three-quarter',
    });
    expect(projectionDigest('INTERFACE', turned)).toBe('ORTHOGRAPHIC_FRONT · 0° · SINGLE_FRONT');
    // The same configuration under a category whose subject does have a front and can be drawn under
    // any camera, where every part of it is honest — without this pair the assertions above would
    // also pass on a digest that had simply stopped reporting either field.
    expect(projectionDigest('CHARACTER', turned)).toBe(
      'THREE_QUARTER_TOPDOWN · 35° · THREE_CLASSIC · front-three-quarter',
    );
  });

  it('reads the same mode the controls under it do, resolved through the category', () => {
    // Both entries are answers about the sheet's mode, and the digest asked them of the stored one —
    // as the two controls it summarises did, which is why they went wrong together. The two
    // configurations below are the two directions of that: each names a pairing its category has no
    // plan for, so the sheet the compiler produces is the category's default and the digest above it
    // described a different sheet entirely.

    // An EFFECT's frame sequence defers to the chosen set, so the facing is live and the set is the
    // one asked for. Read raw, this line said `FIVE_CLASSIC` and named no facing — a set the
    // compiled prompt never mentions, beside a facing it drives the depth order from.
    const hidden = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
    expect(projectionDigest('EFFECT', hidden)).toBe(
      'THREE_QUARTER_TOPDOWN · 35° · EIGHT_COMPASS · north-west',
    );

    // And the other way about: an ITEM has no cut-out rig, so the sheet resolves to its directional
    // views — a multi-view sheet that draws the chosen set but reads no facing, so the digest names
    // the set alone.
    const shown = withOutput({
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
    expect(projectionDigest('ITEM', shown)).toBe('THREE_QUARTER_TOPDOWN · 35° · EIGHT_COMPASS');
  });
});

describe('riggingDigest', () => {
  it('says only the mode when the rig has no geometry to describe', () => {
    expect(riggingDigest('CHARACTER', withOutput({ rigMode: 'POSE_LIBRARY' }))).toBe('POSE_LIBRARY');
  });

  it('adds the joint, overlap and socket settings for a cut-out rig', () => {
    const digest = riggingDigest(
      'CHARACTER',
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
    expect(riggingDigest('CHARACTER', withOutput({ rigMode: 'CUTOUT_RIG', sockets: '' }))).not.toMatch(
      /·\s*$/,
    );
  });

  it('names the rig the sheet actually gets, not the one the configuration was left holding', () => {
    // The same rule `projectionDigest` is written to: a digest echoing back a value the compiler
    // discarded is the one place in the app still reporting it. A stored `CUTOUT_RIG` on a category
    // that turns about nothing emits no section 5, so the header may not claim one — and it may not
    // list the joint geometry either, since the controls for it are not on screen.
    expect(riggingDigest('INTERFACE', withOutput({ rigMode: 'CUTOUT_RIG', sockets: 'head' }))).toBe('NONE');
    expect(riggingDigest('BUILDING', withOutput({ rigMode: 'POSE_LIBRARY' }))).toBe('NONE');
  });
});

describe('continuityDigest', () => {
  it('says so when there is no identity lock, rather than saying nothing at all', () => {
    expect(continuityDigest(withOutput({ identityLock: '' }))).toBe('no identity lock');
  });

  it('shows the lock once it is written', () => {
    expect(continuityDigest(withOutput({ identityLock: 'Cyan visor' }))).toContain('Cyan visor');
  });

  it('says nothing about the component map, which is not one of its controls', () => {
    // The checkbox lives in `CompanionOutputFields`. A digest naming a control its group does not
    // render is the failure this whole module is written to avoid.
    expect(continuityDigest(withOutput({ emitComponentMap: true }))).not.toContain('component map');
  });
});

describe('companionDigest', () => {
  it('says the target returns the image alone when neither box is ticked', () => {
    expect(companionDigest(withOutput({ emitComponentMap: false, emitPromptFeedback: false }))).toBe(
      'image only',
    );
  });

  it('names each deliverable that was asked for', () => {
    const digest = companionDigest(
      withOutput({ emitComponentMap: true, emitPromptFeedback: true, targetModel: 'CHATGPT_5_6_SOL' }),
    );
    expect(digest).toContain('component map');
    expect(digest).toContain('adherence report');
  });

  it('names neither where the target cannot deliver them, however the preference is stored', () => {
    // Midjourney returns an image and nothing else, so both checkboxes render unticked and
    // disabled while the stored preference survives — and the digest has to agree with the screen,
    // not with the store.
    expect(
      companionDigest(
        withOutput({ emitComponentMap: true, emitPromptFeedback: true, targetModel: 'MIDJOURNEY' }),
      ),
    ).toBe('image only');
  });
});
