import { describe, expect, it } from 'vitest';
import { APP_TAB_CHOICES, APP_TAB_CHOICE_BY_ID } from './ui.ts';
import { APP_TABS } from '../types/ui.ts';

/**
 * The record is exhaustive by construction — `satisfies Record<AppTab, AppTabChoice>` refuses to
 * compile without an entry per view — so what is left to assert is the *ordered* list, which is
 * hand-written and is therefore the half a new view can be dropped from silently. The switcher
 * lays its columns out from that list and the settings dialog builds its opening-view field from
 * it, so a view missing here is a view the app offers no way to reach.
 */
describe('APP_TAB_CHOICES', () => {
  it('lists every view exactly once', () => {
    expect([...APP_TAB_CHOICES].map((tab) => tab.id).sort()).toEqual([...APP_TABS].sort());
  });

  it('lists the same objects the record holds, rather than a second copy of them', () => {
    for (const tab of APP_TAB_CHOICES) {
      expect(tab).toBe(APP_TAB_CHOICE_BY_ID[tab.id]);
    }
  });
});
