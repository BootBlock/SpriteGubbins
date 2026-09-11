import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HARDWARE_PROFILES } from '../src/constants/hardware/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import { PALETTES } from '../src/constants/palettes/index.ts';
import { describePalette } from '../src/constants/promptText/hardware.ts';
import { STYLE_REFERENCES } from '../src/constants/styleReferences/index.ts';
import { HARDWARE_PROFILE_IDS } from '../src/types/hardware.ts';
import { PALETTE_IDS, type Palette, type PaletteId } from '../src/types/palette.ts';
import { STYLE_REFERENCE_IDS } from '../src/types/styleReference.ts';
import { channelSpaceSize } from '../src/utils/channelLevels.ts';
import { spellNumber } from '../src/utils/numberWords.ts';
import { codeSpans, documentBlock, markdownTables, oneLine } from './baselinePromptDocument.ts';
import { isInside, sectionNumber, TEMPLATE_GATES, TEMPLATE_LINES } from './templateGates.ts';

/**
 * §2's hardware, palette and art-direction block, read back against the three libraries and the
 * template blocks it says they emit.
 *
 * This is the block where the document's figures were most exposed to drift — it was written after
 * the rest of §2, against libraries that grow by a machine or a game at a time — and it is the one
 * where reading it back found a claim that had never been true: that the palette block's background
 * exception holds because “no palette in the library contains magenta”. The ZX Spectrum's fixed list
 * holds `#FF00FF`, and every channel-depth space reaches it, since each channel's ladder runs from 0
 * to 255. The exception holds because section 0 fixes the key colour, which is what the corrected
 * sentence says.
 *
 * **The library totals are gone rather than guarded**, for the reason §2's subject line lost its
 * counts in issue #164: "eighteen machines" and "nineteen palettes" were true and were figures the
 * table never needed, since each row already names the directory a reader would open. What stays,
 * and is derived here, is the figures that are evidence — the sizes the palette paragraph quotes to
 * show what a fixed list and a channel depth are, and the fields a profile and a reference write.
 */
const SUBSECTION = ['## 2. Parameters', '### `HARDWARE_PROFILE`'] as const;

/** What the document calls each setting a profile or a reference writes, and the field it is. */
const SETTING_WORDS: Readonly<Record<string, string>> = {
  'render style': 'renderStyle',
  'surface detail': 'surfaceDetail',
  resolution: 'resolutionProfile',
  'component size': 'spriteTargetSize',
  outline: 'outlineStyle',
  lighting: 'lightingModel',
  palette: 'palette',
  projection: 'projection',
  'camera elevation': 'cameraElevation',
  machine: 'hardwareProfile',
  'colour budget': 'paletteLimit',
};

function prose(): string {
  return oneLine(documentBlock(...SUBSECTION));
}

function rowFor(parameter: string): readonly string[] {
  const rows = markdownTables(documentBlock(...SUBSECTION))[0]?.rows ?? [];
  const row = rows.find((cells) => codeSpans(cells[0] ?? '')[0] === parameter);
  if (row === undefined) throw new Error(`§2 no longer has a row for \`${parameter}\`.`);
  return row;
}

/** `the render style, surface detail and palette` as the fields it names, sorted. */
function fieldsNamed(list: string): readonly string[] {
  return list
    .split(/, | and /)
    .map((word) => word.replace(/^the /, ''))
    .map((word) => SETTING_WORDS[word] ?? `(unknown setting “${word}”)`)
    .sort();
}

function paletteFor(id: PaletteId): Palette {
  const palette = PALETTES[id];
  if (palette === null) throw new Error(`${id} has no palette definition.`);
  return palette;
}

function fixedEntries(id: PaletteId): readonly string[] {
  const { space } = paletteFor(id);
  if (space.kind !== 'FIXED') throw new Error(`${id} is no longer a fixed palette.`);
  return space.entries;
}

function bitsPerChannel(id: PaletteId): number {
  const { space } = paletteFor(id);
  if (space.kind !== 'CHANNEL_DEPTH') throw new Error(`${id} is no longer a channel-depth palette.`);
  return space.bitsPerChannel;
}

const PROFILES = Object.values(HARDWARE_PROFILES).filter((profile) => profile !== null);
const REFERENCES = Object.values(STYLE_REFERENCES).filter((reference) => reference !== null);
const LIBRARY_PALETTES = Object.values(PALETTES).filter((palette) => palette !== null);

describe('§2 of the baseline-prompt document describes the hardware, palette and reference libraries', () => {
  it('offers each library’s unset value first, and cites directories that exist', () => {
    expect(codeSpans(rowFor('HARDWARE_PROFILE')[1] ?? '')[0]).toBe(HARDWARE_PROFILE_IDS[0]);
    expect(codeSpans(rowFor('PALETTE')[1] ?? '')[0]).toBe(PALETTE_IDS[0]);
    expect(codeSpans(rowFor('STYLE_REFERENCE')[1] ?? '')[0]).toBe(STYLE_REFERENCE_IDS[0]);

    const cited = codeSpans(documentBlock(SUBSECTION[0])).filter((span) => span.startsWith('src/'));
    expect(cited.length).toBeGreaterThanOrEqual(3);
    expect(cited.filter((path) => !existsSync(resolve(process.cwd(), path)))).toStrictEqual([]);
  });

  it('emits each block under the heading and in the sections the table names', () => {
    for (const parameter of ['HARDWARE_PROFILE', 'PALETTE', 'STYLE_REFERENCE']) {
      const emits = rowFor(parameter)[2] ?? '';
      const heading = codeSpans(emits).find((span) => span.startsWith('### ')) ?? '(no heading named)';
      const named = [...emits.matchAll(/§(\d+)/g)].map((match) => Number(match[1])).sort((a, b) => a - b);
      const gated = TEMPLATE_GATES.filter(({ gate }) => gate.key === parameter && gate.operator === '').map(
        (line) => sectionNumber(line.section),
      );

      expect(
        [...new Set(gated)].sort((a, b) => a - b),
        `§2's \`${parameter}\` row`,
      ).toStrictEqual(named);
      expect(
        TEMPLATE_LINES.some((line) => line.text.startsWith(heading) && isInside(line, parameter)),
        `the template has no ${heading} inside [IF:${parameter}]`,
      ).toBe(true);
    }
  });

  it('names the game inside the reference block, and emits the characteristics either way', () => {
    const named = TEMPLATE_GATES.filter(({ gate }) => gate.key === 'STYLE_REFERENCE_NAMED');
    const characteristics = TEMPLATE_LINES.filter((line) =>
      line.text.includes('[DEFINE:STYLE_REFERENCE_CHARACTERISTICS]'),
    );
    const block = TEMPLATE_LINES.filter((line) => isInside(line, 'STYLE_REFERENCE')).map((line) => line.text);

    expect(rowFor('NAME_STYLE_REFERENCE')[2]).toContain(
      'inside that block naming the game; the characteristics are emitted either way',
    );
    expect(named.length).toBeGreaterThan(0);
    expect(named.every((line) => isInside(line, 'STYLE_REFERENCE'))).toBe(true);
    expect(characteristics.length).toBeGreaterThan(0);
    expect(
      characteristics.every(
        (line) => isInside(line, 'STYLE_REFERENCE') && !isInside(line, 'STYLE_REFERENCE_NAMED'),
      ),
    ).toBe(true);

    expect(prose()).toContain('says outright that the settings win where the two ever pull apart');
    expect(oneLine(block.join('\n'))).toContain('the setting wins');
    expect(prose()).toContain('It defaults to off');
    expect(DEFAULT_OUTPUT_CONFIG.nameStyleReference).toBe(false);
  });

  it('lists the fields a profile and a reference write, as the libraries hold them', () => {
    const profileList = /it writes the (.+?) in one act/.exec(prose())?.[1] ?? '';
    const profileFields = fieldsNamed(profileList);
    const reference = /the profile's (\S+) plus the (.+?) — and then emits/.exec(prose());
    const clause = ', where it pins no palette,';

    expect(PROFILES.length).toBeGreaterThan(0);
    expect(
      PROFILES.filter((profile) => Object.keys(profile.settings).sort().join() !== profileFields.join()),
    ).toStrictEqual([]);

    expect(reference?.[1]).toBe(spellNumber(profileFields.length));
    expect(reference?.[2]).toContain(clause);
    const referenceFields = [
      ...profileFields,
      ...fieldsNamed((reference?.[2] ?? '').replace(clause, '')),
    ].sort();
    expect(REFERENCES.length).toBeGreaterThan(0);
    expect(
      REFERENCES.filter((entry) => Object.keys(entry.settings).sort().join() !== referenceFields.join()),
    ).toStrictEqual([]);
    expect(
      REFERENCES.filter(
        (entry) => (entry.settings.palette === 'FREE') === (entry.settings.paletteLimit === null),
      ),
    ).toStrictEqual([]);
  });

  it('quotes the palette sizes the library holds, and writes every fixed entry into the prompt', () => {
    expect(prose()).toContain(
      `the Game Boy's ${spellNumber(fixedEntries('GAME_BOY_DMG').length)} greens, ` +
        `the C64's ${spellNumber(fixedEntries('COMMODORE_64').length)}, ` +
        `the 2600's ${String(fixedEntries('ATARI_2600_NTSC').length)}`,
    );
    expect(prose()).toContain(
      `the Master System (${String(bitsPerChannel('MASTER_SYSTEM'))} bits per channel), ` +
        `the Mega Drive (${String(bitsPerChannel('MEGA_DRIVE'))}), the Amiga (${String(bitsPerChannel('AMIGA_OCS'))}) ` +
        `and the SNES (${String(bitsPerChannel('SNES'))})`,
    );
    expect(prose()).toContain(
      `since ${String(channelSpaceSize(bitsPerChannel('MEGA_DRIVE')))} entries are not a list`,
    );

    expect(prose()).toContain('and every entry is written into the prompt');
    for (const palette of LIBRARY_PALETTES) {
      if (palette.space.kind !== 'FIXED') continue;
      const block = describePalette(palette);
      expect(
        palette.space.entries.filter((entry) => !block.includes(entry)),
        palette.id,
      ).toStrictEqual([]);
    }
  });

  it('drops the budget line where a palette is pinned, and keeps the background the key colour', () => {
    const strategy = TEMPLATE_LINES.filter((line) => line.text.includes('[DEFINE:PALETTE_DESCRIPTION]'));

    expect(prose()).toContain(`the strategy line is dropped from §${String(sectionNumber('STYLE'))}`);
    expect(strategy.length).toBeGreaterThan(0);
    expect(strategy.every((line) => line.section === 'STYLE' && isInside(line, 'PALETTE', '!=', 'yes'))).toBe(
      true,
    );

    expect(prose()).toContain(
      `the background field, which stays the key colour §${String(sectionNumber('CONTRACT'))} fixes rather than being drawn from the palette`,
    );
    expect(
      LIBRARY_PALETTES.filter((palette) => !describePalette(palette).includes('stays the key colour')),
    ).toStrictEqual([]);
  });
});
