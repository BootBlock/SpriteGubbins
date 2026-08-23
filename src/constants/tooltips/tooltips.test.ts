import { describe, expect, it } from 'vitest';
import { ACCENT_HUES } from '../../types/settings.ts';
import { ANTI_ALIAS_GUIDANCE } from '../antiAlias.ts';
import { AUTO_TUNE_GUIDANCE } from '../autoTune.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { DIAL_HISTORY_GUIDANCE } from '../dialHistory.ts';
import { TARGET_MODELS } from '../models.ts';
import { accentSwatchGuidance } from '../settings.ts';
import { IDENTITY_CAPTURE_UNAVAILABLE } from '../identityCapture.ts';
import { SHEET_IDENTITY_GUIDANCE } from '../sheetIdentity.ts';
import { STUDIO_HISTORY_GUIDANCE } from '../studioHistory.ts';
import { APP_TAB_CHOICES } from '../ui.ts';
import { presetCollectionGuidance } from './presets.ts';

/**
 * Every module under `src/constants/`, so the guidance sets can be *found* rather than listed.
 *
 * This walk used to be six hand-written imports, and the six were exactly the files in this folder —
 * so its coverage tracked a directory rather than the guidance surface. Guidance is deliberately
 * filed in two places (see the note in `./index.ts`): an action's sits here, and a setting's sits
 * beside the options it explains. The second group — 190 entries when this was written, across
 * four sets and every category definition — was never walked, and two `ATLAS_TOOLTIPS` entries
 * reached the bundle
 * carrying three straight apostrophes between them, past the test written to catch exactly that.
 *
 * A hand-kept list of "all the guidance in the app" is that same failure one layer up, so the shape
 * that keeps being added — a flat record of sentences, named `*_TOOLTIPS` for the surface it
 * explains — is discovered instead. Test files are excluded because importing one registers its
 * suites into this one.
 */
const CONSTANT_MODULES = import.meta.glob<Readonly<Record<string, unknown>>>(
  ['../**/*.ts', '!../**/*.test.ts'],
  { eager: true },
);

/**
 * The floor under that discovery, and the only thing standing between a glob that stops matching and
 * a suite that walks the three hand-named groups below while reporting nothing wrong.
 *
 * Adding guidance never touches this number — it can only be broken by deleting a set or by breaking
 * the pattern, which are the two things worth being told about.
 */
const FEWEST_SETS = 10;

/** Whether an export is the shape this walk understands: a flat record of sentences. */
function isGuidanceRecord(value: unknown): value is Readonly<Record<string, string>> {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

/**
 * The `*_TOOLTIPS` sets, keyed by name so the six this folder re-exports through `./index.ts` are
 * counted once rather than twice.
 *
 * A set named this way that is *not* a record of sentences throws rather than being skipped: a
 * silent skip is how the four missing sets stayed missing, and this is the one place that could
 * quietly reintroduce it.
 */
function discoverTooltipSets(): Record<string, Readonly<Record<string, string>>> {
  const sets: Record<string, Readonly<Record<string, string>>> = {};

  for (const [path, module] of Object.entries(CONSTANT_MODULES)) {
    for (const [name, value] of Object.entries(module)) {
      if (!name.endsWith('_TOOLTIPS')) continue;
      if (!isGuidanceRecord(value)) {
        throw new Error(`${path} exports ${name}, which is not a record of guidance strings.`);
      }
      sets[name] = value;
    }
  }

  return sets;
}

const TOOLTIP_SETS = discoverTooltipSets();

/**
 * Every piece of guidance in the app, gathered under the name a failure should report.
 *
 * The two functions are here as their arguments' worth of entries rather than as one sample: a
 * template with a name substituted into it is exactly the shape that reads fine in the abstract and
 * produces "Shows the built-in presets written for the  category" on the one input nobody tried.
 *
 * The groups below the sets are the shapes discovery cannot see — a function, and guidance hanging
 * off a list rather than filed in a record of its own. Each is walked whole rather than sampled,
 * which is what keeps *them* from drifting: a tenth category, or a seventeenth field, arrives
 * checked.
 *
 * `TARGET_MODELS` earns its place here for the reason its own selector gives: the ⓘ beside that
 * control explains what a target model *is*, in one sentence for all eleven, and the half that can
 * only be written per target is rendered under the control instead. It is the control's own
 * explanation shown a second way, not a label — so it is held to the same rules.
 */
const GUIDANCE: readonly (readonly [string, string])[] = [
  ...records(TOOLTIP_SETS),
  ...Object.entries(CATEGORY_OPTIONS).flatMap(([category, definition]) =>
    definition.fields.map((field) => [`${category}.${field.key}`, field.tooltip] as const),
  ),
  ...TARGET_MODELS.map((model) => [`TARGET_MODELS.${model.id}`, model.description] as const),
  // The second thing that list carries, and it reaches the reader the same way the first does: a
  // target with nowhere to open renders its link button disabled, and this note is what the card
  // says after the sentence every target shares. Two of the three are about open weights, which is
  // the pair the “no two controls share a sentence” check is for.
  ...TARGET_MODELS.flatMap((model) =>
    model.generatorSite.kind === 'NONE'
      ? [[`TARGET_MODELS.${model.id}.generatorSite`, model.generatorSite.note] as const]
      : [],
  ),
  ...APP_TAB_CHOICES.map((tab) => [`APP_TAB_CHOICES.${tab.id}`, tab.guidance] as const),
  ...ACCENT_HUES.map((hue) => [`accentSwatchGuidance(${hue})`, accentSwatchGuidance(hue)] as const),
  ['presetCollectionGuidance(built-in)', presetCollectionGuidance('Humanoid Character', false)],
  ['presetCollectionGuidance(custom)', presetCollectionGuidance('Your presets', true)],
  // Two of `AUTO_TUNE_GUIDANCE`'s five, and the split is the rule this suite is named for: what
  // counts is the surface, not the filing. `idle` says what pressing Auto does and `waiting` says
  // why it is unavailable — both are the control's own explanation rendered under it rather than
  // behind an ⓘ, which is the standing `TARGET_MODELS.description` case. The other three report the
  // state of *this sheet's* sweep, which is the `QUANTISE_SCALE_GUIDANCE` case and out of scope.
  ['AUTO_TUNE_GUIDANCE.idle', AUTO_TUNE_GUIDANCE.idle],
  ['AUTO_TUNE_GUIDANCE.waiting', AUTO_TUNE_GUIDANCE.waiting],
  // Both entries of both undo panels, on the same footing as the two above: each says what the two
  // buttons beside it do — what a step back restores, and what performing another act costs — which
  // is a control's own explanation rendered under it rather than behind an ⓘ. Neither record is
  // named `*_TOOLTIPS`, so neither is discovered, and the studio's arrived as the second instance
  // of a shape the quantiser's had already been missing from this walk.
  ['DIAL_HISTORY_GUIDANCE.open', DIAL_HISTORY_GUIDANCE.open],
  ['DIAL_HISTORY_GUIDANCE.available', DIAL_HISTORY_GUIDANCE.available],
  ['STUDIO_HISTORY_GUIDANCE.open', STUDIO_HISTORY_GUIDANCE.open],
  ['STUDIO_HISTORY_GUIDANCE.available', STUDIO_HISTORY_GUIDANCE.available],
  // **All five of `ANTI_ALIAS_GUIDANCE`**, where only two of `AUTO_TUNE_GUIDANCE`'s five qualify —
  // and the difference is the rule this suite is named for rather than an inconsistency. That panel
  // reports a *sweep*, so three of its entries describe the state of this sheet. This one reports
  // nothing at all: it has no reading, and every one of its five paragraphs is a function of the
  // control positions alone — what the pass is for, what each of the three scopes softens, and why
  // the palette control is absent. That is a control's own explanation rendered under it rather than
  // behind an ⓘ, which is the standing `TARGET_MODELS.description` case.
  ...Object.entries(ANTI_ALIAS_GUIDANCE).map(([key, text]) => [`ANTI_ALIAS_GUIDANCE.${key}`, text] as const),
  // Both entries of `SHEET_IDENTITY_GUIDANCE`, on the `ANTI_ALIAS_GUIDANCE` footing rather than the
  // `QUANTISE_SCALE_GUIDANCE` one — and the panel it belongs to is the case where the two are easiest
  // to confuse, because it sits among the quantiser's readings and looks like one. It reports no
  // reading: it says what a download will record and what the two step buttons beside it do, and it
  // says outright that it is not a reading of the reader's image. That is a control's own explanation
  // rendered under it rather than behind an ⓘ, which is the standing `TARGET_MODELS.description` case.
  ...Object.entries(SHEET_IDENTITY_GUIDANCE).map(
    ([key, text]) => [`SHEET_IDENTITY_GUIDANCE.${key}`, text] as const,
  ),
  // All five of `IDENTITY_CAPTURE_UNAVAILABLE`, on the `TARGET_MODELS[].generatorSite.note` footing:
  // a disabled button, and the sentence its card carries after the one every state shares. Filed
  // outside `constants/tooltips/` because they are findings about the app's state rather than an
  // explanation of the control — which is the filing, not the surface, and the surface is what this
  // suite is named for.
  ...Object.entries(IDENTITY_CAPTURE_UNAVAILABLE).map(
    ([key, text]) => [`IDENTITY_CAPTURE_UNAVAILABLE.${key}`, text] as const,
  ),
];

/** Flattens the records into `NAME.key` pairs, so a failure names the entry rather than a position. */
function records(sets: Record<string, Readonly<Record<string, string>>>): (readonly [string, string])[] {
  return Object.entries(sets).flatMap(([setName, set]) =>
    Object.entries(set).map(([key, text]) => [`${setName}.${key}`, text] as const),
  );
}

/**
 * The shortest a piece of guidance may be and still have said anything.
 *
 * Not a target — several of these are one sentence about a Cancel button, and padding those out
 * would be worse writing, not better guidance. It is a floor against the failure this whole feature
 * exists to fix: a control that carries a tooltip prop filled in with three words, which looks
 * covered from the outside and explains nothing.
 */
const SHORTEST_USEFUL = 60;

describe('control guidance', () => {
  it('finds every set filed under src/constants/', () => {
    expect(Object.keys(TOOLTIP_SETS).length).toBeGreaterThanOrEqual(FEWEST_SETS);
  });

  it.each(GUIDANCE)('%s says enough to be worth reading', (_name, text) => {
    expect(text.length).toBeGreaterThanOrEqual(SHORTEST_USEFUL);
  });

  it.each(GUIDANCE)('%s is written as prose', (_name, text) => {
    // A capital and a full stop, because these are sentences shown to strangers rather than labels.
    expect(text).toMatch(/^[A-Z“]/);
    expect(text.endsWith('.')).toBe(true);
    expect(text).not.toMatch(/ {2}/);
    expect(text.trim()).toBe(text);
  });

  it.each(GUIDANCE)('%s uses typographic punctuation', (_name, text) => {
    // The app's copy is set with real apostrophes and quotes throughout; a straight one is the tell
    // that a line was pasted in from somewhere else rather than written here.
    expect(text).not.toContain("'");
    expect(text).not.toContain('"');
  });

  it('never repeats itself', () => {
    // Two controls sharing a sentence is the copy-paste that leaves one of them describing the
    // other — and it is invisible in review, because each call site reads correctly on its own.
    const byText = new Map<string, string[]>();
    for (const [name, text] of GUIDANCE) byText.set(text, [...(byText.get(text) ?? []), name]);

    expect([...byText.values()].filter((names) => names.length > 1)).toEqual([]);
  });
});
