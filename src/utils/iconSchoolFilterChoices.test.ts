import { describe, expect, it } from 'vitest';
import { DAMAGE_SCHOOLS } from '../types/iconCatalogue.ts';
import { iconSchoolFilterChoices } from './iconSchoolFilterChoices.ts';

describe('iconSchoolFilterChoices', () => {
  it('offers every school after the option for all of them, in the schools’ order', () => {
    expect(iconSchoolFilterChoices('Near-Future Cyberpunk').map((choice) => choice.value)).toEqual([
      'ALL',
      ...DAMAGE_SCHOOLS,
    ]);
  });

  it('names a school as the world does, with the catalogue’s name where the two differ', () => {
    const fantasy = iconSchoolFilterChoices('High Fantasy');
    expect(fantasy.find((choice) => choice.value === 'THERMAL')?.label).toBe('Fire (thermal)');
    expect(fantasy.find((choice) => choice.value === 'NANITE')?.label).toBe('Holy (nanite)');

    const cyberpunk = iconSchoolFilterChoices('Near-Future Cyberpunk');
    expect(cyberpunk.find((choice) => choice.value === 'THERMAL')?.label).toBe('Thermal');
  });

  it('names each school by the catalogue’s name in a world no family names', () => {
    const typed = iconSchoolFilterChoices('Clockwork Moon Colony');
    expect(typed.find((choice) => choice.value === 'NETRUN')?.label).toBe('Netrun');
  });
});
