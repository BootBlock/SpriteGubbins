import { relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';
import { ARCHITECTURE_SECTIONS } from '../src/constants/architecture.ts';
import { HARDWARE_PROFILES } from '../src/constants/hardware/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { PALETTES } from '../src/constants/palettes/index.ts';
import type { HardwareProfileId } from '../src/types/hardware.ts';
import { SUBJECT_FIELD_KEYS } from '../src/types/subject.ts';
import { channelSpaceSize } from '../src/utils/channelLevels.ts';
import { spellNumber } from '../src/utils/numberWords.ts';

/**
 * The counts the Architecture tab states, re-derived from the tree it is describing.
 *
 * That tab renders `ARCHITECTURE_SECTIONS` verbatim, and its own docblock says why the words have
 * to be true: a specification tab documenting an architecture the app no longer has is worse than
 * no tab at all. Two of its figures had stopped being true anyway — six Zustand stores against
 * thirteen on disk, and twenty-five output settings against twenty-eight on `OutputConfig` — and
 * neither growth had any reason to open this file. A correction pass had already been made once, in
 * August 2026, and it rewrote the very sentence that carried the twenty-five.
 *
 * So the fix is not a third correction. Every figure is a count of something the tree already
 * knows, and this is what reads them back: adding a store or an output setting fails here, naming
 * the sentence whose figure it moved. The machine section is pinned the same way, after it called
 * all eighteen systems real — PICO-8 is a fantasy console — claimed a per-scanline sprite limit for
 * every machine where seven state one, and named two channel depths where the palettes shipped
 * five. The tab beside it does the same thing for the version number, in
 * `src/components/tabs/AboutSection.test.tsx`, and for the same reason.
 *
 * **It pins the figures, not the wording.** A sentence rewritten around the same true count still
 * has to keep the phrase these assertions look for, which is deliberate: the phrase is short, and
 * an author changing it is an author reading the count as they go.
 */

/**
 * The app's own speller, rather than a second copy of one.
 *
 * This file used to carry its own `UNITS`/`TENS` tables and a speller over them. When the sheet
 * plans stopped writing their counts out by hand they needed the same thing, and a helper two test
 * files and seven plan files all want belongs in `src/utils/` — so the tables moved there and this
 * reads them. The two spelled identically over 1–99, which is the whole range either asks for: the
 * call sites below count stores, subject fields, output settings, machines and the machines that
 * state a scanline limit, none of which can be zero without the assertion around it being
 * meaningless.
 *
 * `spellNumber` refuses zero where the retired copy named it, and that is the right direction for a
 * count of things a file walk found: a section claiming “zero independent Zustand stores” is a
 * sentence nobody should be able to satisfy.
 */

/** Where a store is filed, once the walk's absolute paths are made relative and POSIX. */
const STORES = 'src/stores/';

/**
 * What marks a file in there as a Zustand store: it imports `create` from the library.
 *
 * Reading the *binding* instead — `= create<` — would have read a spelling rather than a fact. A
 * store written `create(persist<FooState>(…))`, or one whose type arrives as an annotation on the
 * constant, makes a store and binds no such text, and that difference fails **open**: the count
 * stays where it was, the prose still matches it, and the drift this suite exists to catch goes
 * straight past. The import is the one thing every store has to do, however it is written, and
 * an import nothing calls does not survive the lint gate.
 */
const MAKES_A_STORE = /import\s*\{[^}]*\bcreate\b[^}]*\}\s*from\s*'zustand'/;

/**
 * Every Zustand store in the app, by path.
 *
 * Read off disk rather than imported, because importing them is what the assertion is trying not
 * to depend on: a store nobody has wired up yet is still a store the sentence is counting, and a
 * barrel file listing them would be one more hand-kept list to drift. The walk is
 * `scannableSources()`, this repository's one answer to what counts as source — a second walk
 * here would be a second answer, and it would be the shallower of the two, blind to a store filed
 * a directory further down.
 *
 * The two helpers filed beside the stores — the dial snapshot and its setters — import nothing
 * from the library, which is what keeps them out. The colocated tests do import it, and are kept
 * out by name: a suite exercising a store is not one.
 */
function zustandStores(): string[] {
  return scannableSources()
    .map((file) => relative(process.cwd(), file).split(sep).join('/'))
    .filter((path) => path.startsWith(STORES) && !path.endsWith('.test.ts'))
    .filter((path) => MAKES_A_STORE.test(sourceText(path)))
    .sort();
}

/**
 * The machines whose constraints were chosen rather than imposed, by id.
 *
 * A `HardwareProfile` records no such fact — nothing the app does differs for a fantasy console —
 * so this is the one hand-kept list the file has. A new machine moves the total and fails until
 * the prose is updated, and an author adding a fantasy console adds it here as they do.
 */
const FANTASY_CONSOLES: ReadonlySet<HardwareProfileId> = new Set(['PICO_8']);

/** Whichever section states `phrase`, or `undefined` where none of them does. */
function sectionStating(phrase: string): string | undefined {
  return ARCHITECTURE_SECTIONS.find((section) => section.body.includes(phrase))?.heading;
}

describe('the figures the Architecture tab states', () => {
  it('counts the Zustand stores the app is built on', () => {
    const stores = zustandStores();
    const phrase = `${spellNumber(stores.length)} independent Zustand stores`;

    expect(
      sectionStating(phrase),
      `No Architecture section says “${phrase}”. src/stores/ holds ${stores.length}: ${stores.join(', ')}.`,
    ).toBeDefined();
  });

  it('counts the subject fields and the output settings the compiler is a function of', () => {
    const settings = Object.keys(DEFAULT_OUTPUT_CONFIG);
    const phrase = `${spellNumber(SUBJECT_FIELD_KEYS.length)} subject fields and the ${spellNumber(settings.length)} output settings`;

    expect(
      sectionStating(phrase),
      `No Architecture section says “${phrase}”. SUBJECT_FIELD_KEYS has ${SUBJECT_FIELD_KEYS.length} entries and OutputConfig has ${settings.length}.`,
    ).toBeDefined();
  });

  it('counts the machines, and names the fantasy consoles among them', () => {
    const machines = Object.values(HARDWARE_PROFILES).filter((profile) => profile !== null);
    const fantasy = machines.filter((profile) => FANTASY_CONSOLES.has(profile.id));
    const real = `${spellNumber(machines.length)} systems — ${spellNumber(machines.length - fantasy.length)} real machines`;
    const named = `${spellNumber(fantasy.length)} fantasy console${fantasy.length === 1 ? '' : 's'}, ${fantasy.map((profile) => profile.name).join(', ')}`;

    expect(fantasy, 'A fantasy console listed here has no hardware profile.').toHaveLength(
      FANTASY_CONSOLES.size,
    );
    expect(
      sectionStating(real),
      `No Architecture section says “${real}”. HARDWARE_PROFILES has ${machines.length} machines.`,
    ).toBeDefined();
    expect(sectionStating(named), `The section that says “${real}” does not say “${named}”.`).toBe(
      sectionStating(real),
    );
  });

  it('counts the machines whose constraints state a per-scanline sprite limit', () => {
    const machines = Object.values(HARDWARE_PROFILES).filter((profile) => profile !== null);
    const limited = machines.filter((profile) =>
      profile.constraints.some((line) => line.includes('scanline')),
    );
    const phrase = `for ${spellNumber(limited.length)} of the consoles, how many sprites may cross one scanline`;

    expect(
      sectionStating(phrase),
      `No Architecture section says “${phrase}”. These machines state one: ${limited.map((profile) => profile.id).join(', ')}.`,
    ).toBeDefined();
  });

  it('states the range of colours the channel-depth palettes span', () => {
    const sizes = Object.values(PALETTES).flatMap((palette) =>
      palette?.space.kind === 'CHANNEL_DEPTH' ? [channelSpaceSize(palette.space.bitsPerChannel)] : [],
    );
    const count = (n: number): string => n.toLocaleString('en-GB');
    const phrase = `from ${count(Math.min(...sizes))} to ${count(Math.max(...sizes))} colours`;

    expect(
      sectionStating(phrase),
      `No Architecture section says “${phrase}”. The channel-depth palettes hold ${sizes.map(count).join(', ')} colours.`,
    ).toBeDefined();
  });
});
