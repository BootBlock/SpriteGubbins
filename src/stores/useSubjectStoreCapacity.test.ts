import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { canUndoStudio } from '../utils/studioHistory.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { iconPickId } from '../utils/iconPickId.ts';

/**
 * The roster's capacity, as the store enforces it on a tick.
 *
 * In a file of its own because it moves the capacity. The real one is reached only by ticking most of
 * the catalogue, which `useSubjectStore.test.ts` does once; here the edge cases want a set a few ticks
 * from full. Moved to five, every module in this file reads the moved figure, which is the claim under
 * test — that the store measures a tick against `ICON_ROSTER_CAPACITY` and refuses what does not fit.
 */
vi.mock('../constants/iconCatalogue/iconSheetLimits.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../constants/iconCatalogue/iconSheetLimits.ts')>();
  return { ...actual, ICON_ROSTER_CAPACITY: 5 };
});

function iconStudio(picks: readonly string[]): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: { ...defaultSubjectFor('ICON'), icons: { look: 'ISOLATED_MARK', picks: cataloguePicks(picks) } },
  });
  useSubjectStore.getState().openStudio();
}

function picks(): readonly string[] {
  return (useSubjectStore.getState().subject.icons?.picks ?? []).map(iconPickId);
}

describe('the icon roster’s capacity', () => {
  beforeEach(() => {
    iconStudio(['heal-minor', 'heal-major', 'mana-minor']);
  });

  it('ticks what fits and hands back what does not, in catalogue order', () => {
    const refused = useSubjectStore
      .getState()
      .toggleIcons(['system-bags', 'mana-major', 'stamina-restore', 'heal-standard'], true);

    expect(picks()).toEqual(['heal-minor', 'heal-standard', 'heal-major', 'mana-minor', 'mana-major']);
    expect(refused).toEqual(['stamina-restore', 'system-bags']);
  });

  it('refuses a tick into a full set without recording a step', () => {
    useSubjectStore.getState().toggleIcons(['heal-standard', 'mana-major'], true);
    useSubjectStore.getState().openStudio();

    expect(useSubjectStore.getState().toggleIcons(['system-bags'], true)).toEqual(['system-bags']);
    expect(picks()).not.toContain('system-bags');
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
  });

  it('refuses a two-state icon that would straddle the limit, and still ticks one that fits after it', () => {
    useSubjectStore.getState().toggleIcons(['heal-standard'], true);

    // One component left: the sound toggle is drawn twice, and the map pin after it once.
    const refused = useSubjectStore.getState().toggleIcons(['system-sound', 'pin-quest-available'], true);

    expect(refused).toEqual(['system-sound']);
    expect(picks()).toContain('pin-quest-available');
  });
});
