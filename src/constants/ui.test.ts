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

  /**
   * No view's guidance may count the others.
   *
   * The Studio card told a reader that “nothing in the other three views changes a word of it” for
   * as long as the app had five views, because Projects shipped and this string had no reason to be
   * opened. It is not a docblock — it is rendered under the switcher button and in the settings
   * dialog's opening-view field — so the stale count was on screen rather than in a comment, and it
   * is the one kind of hand-kept figure a reader is actually shown.
   *
   * The count carried nothing the sentence needed, so the sentence now states the relationship. This
   * is what stops the next author reaching for “the other four”: a guidance string may describe the
   * others, and may not enumerate them. Seven spellings are refused rather than a digit alone,
   * because prose in this app is written in words.
   */
  it('describes the other views without counting them', () => {
    const counted =
      /\b(two|three|four|five|six|seven|\d+)\s+(other\s+)?(views?|tabs?)\b|\bother\s+(two|three|four|five|six|seven|\d+)\b/i;

    for (const tab of APP_TAB_CHOICES) {
      expect(
        tab.guidance,
        `${tab.label}'s guidance states how many views the app has. That figure moves whenever a ` +
          'view is added, it is rendered to the reader rather than kept in a comment, and nothing ' +
          'else would report it — say “any other view” instead of counting them.',
      ).not.toMatch(counted);
    }
  });
});
