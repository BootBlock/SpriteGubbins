import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { ICON } from '../categories/icon.ts';
import { iconCatalogueEntry } from '../iconCatalogue/index.ts';
import { iconPickId } from '../../utils/iconPickId.ts';
import { ICON_SET_PRESETS } from './iconSets.ts';

/**
 * That each ICON preset's values say what its card says (audit findings O3 and O12).
 *
 * A preset is chosen by its card, so a value contradicting the card hands the reader a set they did not
 * choose: status badges drawn cursed and cracked, system buttons carrying an equipped tick, an emote
 * wheel shown in the social panels, and a pixel-art map pin asked for engraved lines its 32 px display
 * cannot hold.
 */

function preset(id: string) {
  const found = ICON_SET_PRESETS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no preset ${id}`);
  return found;
}

const LINE_TECHNIQUES = ICON.fields.find((field) => field.key === 'worn_details')?.lineTechniques ?? [];

describe('the ICON presets against their cards', () => {
  it('draws the status badges as plain conditions, neither cursed nor cracked', () => {
    const { subject } = preset('pixel-status-badge-set');
    expect([subject.gender, subject.age, subject.clothing].join(' ')).not.toMatch(/curs|crack|broken/iu);
  });

  it('adds no equipped tick to a system button, which is opened and never equipped', () => {
    expect(preset('flat-system-button-set').subject.additional_anatomy).toBe(NO_ADDITIONAL_ANATOMY);
  });

  it('shows every set of emotes in the emote wheel', () => {
    for (const { name, subject } of ICON_SET_PRESETS) {
      const kinds = (subject.icons?.picks ?? []).map(
        (pick) => iconCatalogueEntry(iconPickId(pick))?.id ?? '',
      );
      if (kinds.length > 0 && kinds.every((id) => id.startsWith('emote-'))) {
        expect(subject.species, name).toBe('Ping & Emote Wheel');
      }
    }
  });

  it.each(ICON_SET_PRESETS.filter((candidate) => candidate.output.renderStyle === 'PIXEL_ART'))(
    '$name asks for no line technique its pixel-art style bans as microtexture',
    ({ subject }) => {
      expect(LINE_TECHNIQUES).not.toContain(subject.worn_details);
    },
  );
});
