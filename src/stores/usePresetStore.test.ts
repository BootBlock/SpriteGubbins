import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import { createRefusingStorage } from '../test/storageDoubles.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { withCompanionOutputs } from '../utils/imageConfig.ts';
import { canUndoStudio } from '../utils/studioHistory.ts';
import { useOutputStore } from './useOutputStore.ts';
import { usePresetStore } from './usePresetStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * Backed by a real `LocalStorageBackend` over an in-memory store rather than a hand-written fake,
 * so what these tests assert about persistence is what the app actually does. Only the module that
 * *chooses* a backend is mocked — the choice needs a browser this environment doesn't have.
 *
 * `backend` is read lazily inside the factory, which is what lets each test start from empty
 * storage (or swap in a failing backend) after the mock has been hoisted.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

/** The pack the app itself exports, as a file the user would hand back to it. */
function packFile(presets: readonly unknown[]): File {
  return new File([JSON.stringify(presets)], 'sprite-gubbins-presets.json', {
    type: 'application/json',
  });
}

function customPreset(overrides: Partial<PresetArchetype> = {}): PresetArchetype {
  return {
    id: 'custom-imported-1',
    name: 'Imported Knight',
    description: '',
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
    ...overrides,
  };
}

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  usePresetStore.setState({ customPresets: [], isExporting: false });
  useSubjectStore.setState({ category: DEFAULT_PRESET.category, subject: DEFAULT_PRESET.subject });
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useUIStore.getState().dismissToast();
  useUIStore.setState({ activeTab: 'presets' });
});

afterEach(() => {
  // The store schedules a real auto-dismiss for every toast; cancel it so nothing is left pending
  // once the suite finishes.
  useUIStore.getState().dismissToast();
});

describe('loadPreset', () => {
  it('moves the whole image configuration into the studio', () => {
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');

    usePresetStore.getState().loadPreset(marine);

    expect(useSubjectStore.getState().category).toBe(marine.category);
    expect(useSubjectStore.getState().subject).toEqual(marine.subject);
    // Exactly the preset's image over the studio's own companion answers — nothing else, so an
    // extra key arriving from anywhere would fail here rather than pass a looser match.
    expect(useOutputStore.getState().output).toEqual(
      withCompanionOutputs(marine.output, DEFAULT_OUTPUT_CONFIG),
    );
    expect(useUIStore.getState().activeTab).toBe('studio');
    expect(useUIStore.getState().toastMessage).toContain(marine.name);
  });

  it('records a step even when the preset leaves the sixteen answers alone', () => {
    // The case a subject-only comparison misses. Load a preset, hand-tune the output, then load the
    // same preset again — which is what a reader does to put those settings back. The category and
    // the sixteen answers are unchanged by that second load, so the act looks like a no-op until the
    // output write is counted; without it inside the same act, the reader's tuning is replaced with
    // nothing on the stack to return to.
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');
    usePresetStore.getState().loadPreset(marine);
    useSubjectStore.getState().openStudio();
    useOutputStore.getState().setOutputField('targetModel', 'MIDJOURNEY');

    usePresetStore.getState().loadPreset(marine);

    expect(useOutputStore.getState().output.targetModel).toBe(marine.output.targetModel);
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(true);
    useSubjectStore.getState().undoStudio();
    expect(useOutputStore.getState().output.targetModel).toBe('MIDJOURNEY');
  });

  it('leaves the companion outputs exactly as the user set them', () => {
    // The two checkboxes under "Returned alongside the image" are working preferences, not part of
    // any archetype: a reader who wants a JSON manifest wants one for the sheet they are about to
    // make, and browsing the library must not quietly switch that off — or on.
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, emitManifest: true, emitPromptFeedback: true },
    });

    usePresetStore.getState().loadPreset(marine);

    const { output } = useOutputStore.getState();
    expect(output.emitManifest).toBe(true);
    expect(output.emitPromptFeedback).toBe(true);
    // And the rest of the studio really did move, so this is not passing on a load that did nothing.
    expect(output.targetModel).toBe(marine.output.targetModel);
  });

  it('leaves them off when that is how they were left', () => {
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });

    usePresetStore.getState().loadPreset(marine);

    expect(useOutputStore.getState().output.emitManifest).toBe(false);
    expect(useOutputStore.getState().output.emitPromptFeedback).toBe(false);
  });
});

describe('saveCustomPreset', () => {
  it('persists the studio state under the given name', async () => {
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('  My Archetype  ', '');

    const [saved] = usePresetStore.getState().customPresets;
    expect(saved?.name).toBe('My Archetype');
    expect(saved?.subject.role).toBe('Lamplighter');
    expect(saved?.isCustom).toBe(true);

    // And it is in storage, not merely in the store.
    await expect(backend.listPresets()).resolves.toHaveLength(1);
  });

  it('stores the image alone, not the user’s companion-output preferences', async () => {
    // What a preset holds is also what an exported pack publishes, so a `true` saved here would
    // travel to whoever imports the pack and turn a working preference into part of the archetype.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, emitManifest: true, emitPromptFeedback: true },
    });

    await usePresetStore.getState().saveCustomPreset('My Archetype', '');

    const [saved] = await backend.listPresets();
    expect(Object.keys(saved?.output ?? {})).not.toContain('emitManifest');
    expect(Object.keys(saved?.output ?? {})).not.toContain('emitPromptFeedback');
  });

  it('stores the description beside the name, trimmed', async () => {
    await usePresetStore.getState().saveCustomPreset('Described', '  A knight for the town scenes  ');

    const [saved] = await backend.listPresets();
    expect(saved?.description).toBe('A knight for the town scenes');
  });

  it('lets a preset be saved with no description at all', async () => {
    // Optional means optional: the card names the subject and setting instead, and the pack format
    // carries the empty string rather than dropping the field.
    await usePresetStore.getState().saveCustomPreset('Bare', '   ');

    const [saved] = await backend.listPresets();
    expect(saved?.description).toBe('');
  });

  it('writes the description it was given when it updates an existing preset', async () => {
    await usePresetStore.getState().saveCustomPreset('My Archetype', 'First wording');
    await usePresetStore.getState().saveCustomPreset('My Archetype', 'Second wording');

    const stored = await backend.listPresets();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.description).toBe('Second wording');
  });

  it('ignores a blank name without touching storage', async () => {
    await usePresetStore.getState().saveCustomPreset('   ', '');
    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });

  it('reports a failed write instead of showing a preset that was never saved', async () => {
    backend = createFailingBackend();
    await usePresetStore.getState().saveCustomPreset('Doomed', '');

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not save that preset');
  });

  /*
   * Saving over a name that is already in the library updates that preset.
   *
   * Minting an id unconditionally is what G5 was: load a preset, adjust a field, save it under the
   * same name, and you had two cards distinguishable only by which sorted newer.
   */
  it('updates the preset of that name rather than adding a second one', async () => {
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('My Archetype', '');
    const [first] = usePresetStore.getState().customPresets;
    if (!first) throw new Error('the preset should have been saved.');

    useSubjectStore.getState().setField('role', 'Bellfounder');
    await usePresetStore.getState().saveCustomPreset('My Archetype', '');

    const { customPresets } = usePresetStore.getState();
    expect(customPresets).toHaveLength(1);
    // Same preset, new contents — not a replacement that happens to look similar.
    expect(customPresets[0]?.id).toBe(first.id);
    expect(customPresets[0]?.subject.role).toBe('Bellfounder');
    // And in storage, not merely in the store.
    await expect(backend.listPresets()).resolves.toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Updated custom preset "My Archetype"');
  });

  it('says it saved when the name is new, and updated when it is not', async () => {
    await usePresetStore.getState().saveCustomPreset('Fresh', '');
    expect(useUIStore.getState().toastMessage).toBe('Saved custom preset "Fresh"');

    await usePresetStore.getState().saveCustomPreset('Fresh', '');
    expect(useUIStore.getState().toastMessage).toBe('Updated custom preset "Fresh"');
  });

  it('treats a differently-cased name as the same one, and adopts the new spelling', async () => {
    await usePresetStore.getState().saveCustomPreset('my knight', '');
    await usePresetStore.getState().saveCustomPreset('My Knight', '');

    const { customPresets } = usePresetStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0]?.name).toBe('My Knight');
  });

  it('still creates a new preset under a name nothing holds', async () => {
    await usePresetStore.getState().saveCustomPreset('First', '');
    await usePresetStore.getState().saveCustomPreset('Second', '');

    expect(
      usePresetStore
        .getState()
        .customPresets.map((preset) => preset.name)
        .sort(),
    ).toEqual(['First', 'Second']);
  });

  it('does not write over a built-in, which is not stored and cannot be overwritten', async () => {
    const builtIn = PRESETS[0];
    if (!builtIn) throw new Error('PRESETS must not be empty.');

    await usePresetStore.getState().saveCustomPreset(builtIn.name, '');

    // A custom preset of that name is created; the built-in constant is untouched. The library
    // tells them apart by its Built-in / Your preset badge, which is why this is not the duplicate
    // G5 is about.
    const [saved] = usePresetStore.getState().customPresets;
    expect(saved?.id).not.toBe(builtIn.id);
    expect(saved?.isCustom).toBe(true);
    expect(PRESETS[0]).toBe(builtIn);
  });
});

describe('updateCustomPresetDetails', () => {
  it('renames in the store and in storage, keeping the configuration', async () => {
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('Before', 'Was this');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await expect(
      usePresetStore.getState().updateCustomPresetDetails(saved.id, '  After  ', '  Is this now  '),
    ).resolves.toBe(true);

    const stored = await backend.listPresets();
    expect(stored.map((preset) => preset.name)).toEqual(['After']);
    // Editing the two must not blank what the preset holds — `savePreset` replaces the whole row.
    expect(stored[0]?.description).toBe('Is this now');
    expect(stored[0]?.subject.role).toBe('Lamplighter');
    expect(stored[0]?.id).toBe(saved.id);
    expect(useUIStore.getState().toastMessage).toBe('Updated "After"');
  });

  it('changes the description alone, which nothing else in the app can do', async () => {
    // Saving over a preset by name writes the studio as it stands, so it is no use to somebody who
    // wants to fix a sentence and change nothing else. This is the path that exists for that.
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('Kept', 'First wording');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');
    useSubjectStore.getState().setField('role', 'Bellfounder');

    await expect(
      usePresetStore.getState().updateCustomPresetDetails(saved.id, 'Kept', 'Second wording'),
    ).resolves.toBe(true);

    const stored = await backend.listPresets();
    expect(stored[0]?.description).toBe('Second wording');
    // The studio moved on underneath, and the preset did not follow it.
    expect(stored[0]?.subject.role).toBe('Lamplighter');
  });

  it('refuses a name another preset already holds, and changes nothing', async () => {
    await usePresetStore.getState().saveCustomPreset('Taken', '');
    await usePresetStore.getState().saveCustomPreset('Mine', '');
    const mine = usePresetStore.getState().customPresets.find((preset) => preset.name === 'Mine');
    if (!mine) throw new Error('the preset should have been saved.');

    await expect(usePresetStore.getState().updateCustomPresetDetails(mine.id, 'Taken', '')).resolves.toBe(
      false,
    );

    expect(
      usePresetStore
        .getState()
        .customPresets.map((preset) => preset.name)
        .sort(),
    ).toEqual(['Mine', 'Taken']);
    expect(useUIStore.getState().toastMessage).toBe('A preset named "Taken" already exists');
  });

  it('refuses a collision that differs only in case', async () => {
    await usePresetStore.getState().saveCustomPreset('Taken', '');
    await usePresetStore.getState().saveCustomPreset('Mine', '');
    const mine = usePresetStore.getState().customPresets.find((preset) => preset.name === 'Mine');
    if (!mine) throw new Error('the preset should have been saved.');

    await expect(usePresetStore.getState().updateCustomPresetDetails(mine.id, 'TAKEN', '')).resolves.toBe(
      false,
    );
    expect(usePresetStore.getState().customPresets).toHaveLength(2);
  });

  it('lets a preset be recapitalised, because it is not a collision with itself', async () => {
    await usePresetStore.getState().saveCustomPreset('my knight', '');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await expect(
      usePresetStore.getState().updateCustomPresetDetails(saved.id, 'My Knight', ''),
    ).resolves.toBe(true);
    expect(usePresetStore.getState().customPresets[0]?.name).toBe('My Knight');
  });

  it('refuses a blank name without touching storage', async () => {
    await usePresetStore.getState().saveCustomPreset('Kept', '');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await expect(usePresetStore.getState().updateCustomPresetDetails(saved.id, '   ', '')).resolves.toBe(
      false,
    );
    await expect(backend.listPresets()).resolves.toHaveLength(1);
    expect(usePresetStore.getState().customPresets[0]?.name).toBe('Kept');
  });

  it('refuses an id nothing holds rather than inventing a preset', async () => {
    await expect(usePresetStore.getState().updateCustomPresetDetails('never-existed', 'X', '')).resolves.toBe(
      false,
    );
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });

  it('reports a failed write and keeps showing the old name', async () => {
    await usePresetStore.getState().saveCustomPreset('Before', '');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    backend = createFailingBackend();
    await expect(usePresetStore.getState().updateCustomPresetDetails(saved.id, 'After', '')).resolves.toBe(
      false,
    );

    expect(usePresetStore.getState().customPresets[0]?.name).toBe('Before');
    expect(useUIStore.getState().toastMessage).toBe('Could not update that preset');
  });
});

/**
 * The same failures, produced by a real fallback rather than by a wholly-failing double.
 *
 * `createFailingBackend` proves the store handles a rejection; it cannot prove the localStorage
 * backend is capable of *raising* one, which is the half that was broken. Here the refusal comes
 * from storage itself, so the whole path is under test — an exhausted quota through to the toast.
 */
describe('on a fallback whose storage refuses writes', () => {
  beforeEach(() => {
    backend = new LocalStorageBackend(createRefusingStorage());
  });

  it('reports a preset it could not save', async () => {
    await expect(usePresetStore.getState().saveCustomPreset('Doomed', '')).resolves.toBe(false);

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not save that preset');
  });

  it('reports a preset it could not delete, and keeps showing it', async () => {
    usePresetStore.setState({ customPresets: [customPreset({ id: 'kept' })] });
    await usePresetStore.getState().deleteCustomPreset('kept');

    expect(usePresetStore.getState().customPresets).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not delete that preset');
  });

  it('reports a pack it could not import', async () => {
    await usePresetStore.getState().importPresetsJSON(packFile([customPreset()]));

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not import that preset pack');
    // The flag has to come back down, or both transfer controls stay disabled for the session.
    expect(usePresetStore.getState().isExporting).toBe(false);
  });
});

describe('deleteCustomPreset', () => {
  it('removes it from the store and from storage', async () => {
    await usePresetStore.getState().saveCustomPreset('Temporary', '');
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await usePresetStore.getState().deleteCustomPreset(saved.id);

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });
});

describe('exportPresetsJSON', () => {
  it('includes the built-ins alongside the custom presets', async () => {
    await usePresetStore.getState().saveCustomPreset('Mine', '');

    const parsed: unknown = JSON.parse(usePresetStore.getState().exportPresetsJSON());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(PRESETS.length + 1);
  });
});

describe('importPresetsJSON', () => {
  it('replaces the stored collection with the pack contents', async () => {
    await usePresetStore.getState().saveCustomPreset('Will be replaced', '');
    await usePresetStore.getState().importPresetsJSON(packFile([customPreset()]));

    const { customPresets, isExporting } = usePresetStore.getState();
    expect(customPresets.map((preset) => preset.name)).toEqual(['Imported Knight']);
    expect(isExporting).toBe(false);
    await expect(backend.listPresets()).resolves.toHaveLength(1);
  });

  it('skips built-ins, so re-importing an export does not duplicate them', async () => {
    await usePresetStore.getState().saveCustomPreset('Mine', '');
    const exported: unknown = JSON.parse(usePresetStore.getState().exportPresetsJSON());
    if (!Array.isArray(exported)) throw new Error('the export should be an array.');

    await usePresetStore.getState().importPresetsJSON(packFile(exported));

    const { customPresets } = usePresetStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0]?.name).toBe('Mine');
  });

  it('refuses a pack with no custom presets rather than deleting everything', async () => {
    await usePresetStore.getState().saveCustomPreset('Keep me', '');
    await usePresetStore.getState().importPresetsJSON(packFile(PRESETS));

    expect(usePresetStore.getState().customPresets.map((preset) => preset.name)).toEqual(['Keep me']);
    expect(useUIStore.getState().toastMessage).toBe('No custom presets found in that file');
  });

  it('rejects a file that is not JSON at all, and clears the busy flag', async () => {
    const notJson = new File(['<html>not a pack</html>'], 'page.html', { type: 'text/html' });
    await usePresetStore.getState().importPresetsJSON(notJson);

    expect(useUIStore.getState().toastMessage).toBe('That file is not a Sprite Gubbins preset pack');
    expect(usePresetStore.getState().isExporting).toBe(false);
  });

  it('drops entries it cannot vouch for and keeps the rest', async () => {
    const pack = [customPreset({ id: 'custom-good', name: 'Good' }), { id: 42 }, null];
    await usePresetStore.getState().importPresetsJSON(packFile(pack));

    expect(usePresetStore.getState().customPresets.map((preset) => preset.name)).toEqual(['Good']);
  });
});

describe('fetchCustomPresets', () => {
  it('loads what a previous session stored', async () => {
    await backend.savePreset(customPreset({ id: 'custom-from-last-time', name: 'Last Time' }));
    await usePresetStore.getState().fetchCustomPresets();

    expect(usePresetStore.getState().customPresets.map((preset) => preset.name)).toEqual(['Last Time']);
  });

  it('reports a failed read', async () => {
    backend = createFailingBackend();
    await usePresetStore.getState().fetchCustomPresets();

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not load your saved presets');
  });
});
