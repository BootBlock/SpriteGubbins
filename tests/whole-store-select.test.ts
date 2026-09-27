import { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

/**
 * A component never subscribes to a whole store, and lint is what says so.
 *
 * CLAUDE.md bans selecting a whole store, and for as long as the ban existed no rule enforced it.
 * The two shapes it takes are a store hook called with no selector and one handed a selector that
 * returns its argument; both subscribe the component to every field, so it re-renders on every write
 * anywhere in the store and nothing about it looks wrong.
 *
 * The rule is read from the config ESLint resolves for a file under `src/`, rather than restated
 * here, and then run over probe sources on its own. That tests the selectors the CLI acts on, and
 * keeps the probes off disk, where they would be real violations and fail `npm run lint`.
 */
async function storeRule(): Promise<Linter.RuleEntry> {
  const config: Linter.Config = await new ESLint().calculateConfigForFile('src/components/common/Badge.tsx');
  const rule = config.rules?.['no-restricted-syntax'];
  if (rule === undefined) throw new Error('no-restricted-syntax is not configured for src/');
  return rule;
}

/** What the resolved rule reports on `code`, as the message of each finding. */
async function findings(code: string): Promise<string[]> {
  const linter = new Linter({ configType: 'flat' });
  const config: Linter.Config[] = [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: { 'no-restricted-syntax': await storeRule() },
    },
  ];
  return linter.verify(code, config, 'probe.tsx').map((message) => message.message);
}

describe('selecting a whole store', () => {
  it('is reported when the hook is called with no selector', async () => {
    expect(await findings('const all = useQuantiseStore();')).toHaveLength(1);
  });

  it('is reported when the selector hands back the whole state', async () => {
    expect(await findings('const all = useUIStore((state) => state);')).toHaveLength(1);
  });

  it('is reported for a selector returning any bare name, since the rule cannot see which one', async () => {
    // Recorded rather than wished away: a selector returning a value from outside the store is no
    // selector at all, and the rule reports it on the same ground as the identity it exists for.
    expect(await findings('const value = useUIStore(() => fallback);')).toHaveLength(1);
  });

  it('is not reported for a selector that picks a field', async () => {
    // The shape every store read in the app takes, so a rule that flagged it would fail everywhere.
    expect(await findings('const accent = useSettingsStore((state) => state.accentHue);')).toStrictEqual([]);
  });

  it("leaves React's own external-store hook alone", async () => {
    // It takes callbacks, and a snapshot getter may well return a bare identifier.
    expect(await findings('const on = useSyncExternalStore(subscribe, () => snapshot);')).toStrictEqual([]);
  });
});
