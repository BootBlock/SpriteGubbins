import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import { createRefusingStorage } from '../test/storageDoubles.ts';
import { DEFAULT_PROJECT_ID } from '../constants/projects.ts';
import type { CustomArchetype } from '../types/preset.ts';
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

function customPreset(overrides: Partial<CustomArchetype> = {}): CustomArchetype {
  return {
    id: 'custom-imported-1',
    projectId: DEFAULT_PROJECT_ID,
    name: 'Imported Knight',
    description: '',
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
    ...overrides,
  };
}

/** A second project, so the rules that are scoped to one can be told from the rules that are not. */
const HARBOUR = 'project-harbour';

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  usePresetStore.setState({ customPresets: [] });
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
    // any archetype: a reader who wants a component map wants one for the sheet they are about to
    // make, and browsing the library must not quietly switch that off — or on.
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, emitComponentMap: true, emitPromptFeedback: true },
    });

    usePresetStore.getState().loadPreset(marine);

    const { output } = useOutputStore.getState();
    expect(output.emitComponentMap).toBe(true);
    expect(output.emitPromptFeedback).toBe(true);
    // And the rest of the studio really did move, so this is not passing on a load that did nothing.
    expect(output.targetModel).toBe(marine.output.targetModel);
  });

  it('leaves them off when that is how they were left', () => {
    const marine = PRESETS[1];
    if (!marine) throw new Error('PRESETS must hold more than one archetype.');
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });

    usePresetStore.getState().loadPreset(marine);

    expect(useOutputStore.getState().output.emitComponentMap).toBe(false);
    expect(useOutputStore.getState().output.emitPromptFeedback).toBe(false);
  });
});

describe('saveCustomPreset', () => {
  it('persists the studio state under the given name', async () => {
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('  My Archetype  ', '', DEFAULT_PROJECT_ID);

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
      output: { ...DEFAULT_OUTPUT_CONFIG, emitComponentMap: true, emitPromptFeedback: true },
    });

    await usePresetStore.getState().saveCustomPreset('My Archetype', '', DEFAULT_PROJECT_ID);

    const [saved] = await backend.listPresets();
    expect(Object.keys(saved?.output ?? {})).not.toContain('emitComponentMap');
    expect(Object.keys(saved?.output ?? {})).not.toContain('emitPromptFeedback');
  });

  it('stores the description beside the name, trimmed', async () => {
    await usePresetStore
      .getState()
      .saveCustomPreset('Described', '  A knight for the town scenes  ', DEFAULT_PROJECT_ID);

    const [saved] = await backend.listPresets();
    expect(saved?.description).toBe('A knight for the town scenes');
  });

  it('lets a preset be saved with no description at all', async () => {
    // Optional means optional: the card names the subject and setting instead, and the pack format
    // carries the empty string rather than dropping the field.
    await usePresetStore.getState().saveCustomPreset('Bare', '   ', DEFAULT_PROJECT_ID);

    const [saved] = await backend.listPresets();
    expect(saved?.description).toBe('');
  });

  it('writes the description it was given when it updates an existing preset', async () => {
    await usePresetStore.getState().saveCustomPreset('My Archetype', 'First wording', DEFAULT_PROJECT_ID);
    await usePresetStore.getState().saveCustomPreset('My Archetype', 'Second wording', DEFAULT_PROJECT_ID);

    const stored = await backend.listPresets();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.description).toBe('Second wording');
  });

  it('ignores a blank name without touching storage', async () => {
    await usePresetStore.getState().saveCustomPreset('   ', '', DEFAULT_PROJECT_ID);
    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });

  it('reports a failed write instead of showing a preset that was never saved', async () => {
    backend = createFailingBackend();
    await usePresetStore.getState().saveCustomPreset('Doomed', '', DEFAULT_PROJECT_ID);

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
    await usePresetStore.getState().saveCustomPreset('My Archetype', '', DEFAULT_PROJECT_ID);
    const [first] = usePresetStore.getState().customPresets;
    if (!first) throw new Error('the preset should have been saved.');

    useSubjectStore.getState().setField('role', 'Bellfounder');
    await usePresetStore.getState().saveCustomPreset('My Archetype', '', DEFAULT_PROJECT_ID);

    const { customPresets } = usePresetStore.getState();
    expect(customPresets).toHaveLength(1);
    // Same preset, new contents — not a replacement that happens to look similar.
    expect(customPresets[0]?.id).toBe(first.id);
    expect(customPresets[0]?.subject.role).toBe('Bellfounder');
    // And in storage, not merely in the store.
    await expect(backend.listPresets()).resolves.toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Updated custom preset “My Archetype”');
  });

  it('says it saved when the name is new, and updated when it is not', async () => {
    await usePresetStore.getState().saveCustomPreset('Fresh', '', DEFAULT_PROJECT_ID);
    expect(useUIStore.getState().toastMessage).toBe('Saved custom preset “Fresh”');

    await usePresetStore.getState().saveCustomPreset('Fresh', '', DEFAULT_PROJECT_ID);
    expect(useUIStore.getState().toastMessage).toBe('Updated custom preset “Fresh”');
  });

  it('treats a differently-cased name as the same one, and adopts the new spelling', async () => {
    await usePresetStore.getState().saveCustomPreset('my knight', '', DEFAULT_PROJECT_ID);
    await usePresetStore.getState().saveCustomPreset('My Knight', '', DEFAULT_PROJECT_ID);

    const { customPresets } = usePresetStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0]?.name).toBe('My Knight');
  });

  it('still creates a new preset under a name nothing holds', async () => {
    await usePresetStore.getState().saveCustomPreset('First', '', DEFAULT_PROJECT_ID);
    await usePresetStore.getState().saveCustomPreset('Second', '', DEFAULT_PROJECT_ID);

    expect(
      usePresetStore
        .getState()
        .customPresets.map((preset) => preset.name)
        .sort(),
    ).toEqual(['First', 'Second']);
  });

  it('files the preset under the project it was given', async () => {
    await usePresetStore.getState().saveCustomPreset('Mine', '', HARBOUR);

    const [saved] = await backend.listPresets();
    expect(saved?.projectId).toBe(HARBOUR);
  });

  it('adds a second preset for a name another project already holds', async () => {
    // The rule projects changed. A name identifies a preset *inside a project*, so two games are
    // each free to have their own “Hero” — and a save into one may never overwrite the other's.
    await usePresetStore.getState().saveCustomPreset('Hero', 'The first', DEFAULT_PROJECT_ID);
    await usePresetStore.getState().saveCustomPreset('Hero', 'The second', HARBOUR);

    const stored = await backend.listPresets();
    expect(stored).toHaveLength(2);
    expect(stored.map((preset) => preset.projectId).sort()).toEqual([DEFAULT_PROJECT_ID, HARBOUR].sort());
    expect(useUIStore.getState().toastMessage).toBe('Saved custom preset “Hero”');
  });

  it('does not write over a built-in, which is not stored and cannot be overwritten', async () => {
    const builtIn = PRESETS[0];
    if (!builtIn) throw new Error('PRESETS must not be empty.');

    await usePresetStore.getState().saveCustomPreset(builtIn.name, '', DEFAULT_PROJECT_ID);

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
    await usePresetStore.getState().saveCustomPreset('Before', 'Was this', DEFAULT_PROJECT_ID);
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
    expect(useUIStore.getState().toastMessage).toBe('Updated “After”');
  });

  it('changes the description alone, which nothing else in the app can do', async () => {
    // Saving over a preset by name writes the studio as it stands, so it is no use to somebody who
    // wants to fix a sentence and change nothing else. This is the path that exists for that.
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('Kept', 'First wording', DEFAULT_PROJECT_ID);
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

  it('leaves a name alone that only another project holds', async () => {
    // The collision rule follows the save rule: names are unique inside a project, so renaming to
    // one that another project uses is not a collision and may not be refused.
    await usePresetStore.getState().saveCustomPreset('Taken', '', HARBOUR);
    await usePresetStore.getState().saveCustomPreset('Mine', '', DEFAULT_PROJECT_ID);
    const mine = usePresetStore.getState().customPresets.find((preset) => preset.name === 'Mine');
    if (!mine) throw new Error('the preset should have been saved.');

    await expect(usePresetStore.getState().updateCustomPresetDetails(mine.id, 'Taken', '')).resolves.toBe(
      true,
    );
    expect(
      usePresetStore
        .getState()
        .customPresets.map((preset) => preset.name)
        .sort(),
    ).toEqual(['Taken', 'Taken']);
  });

  it('refuses a name another preset in the same project already holds, and changes nothing', async () => {
    await usePresetStore.getState().saveCustomPreset('Taken', '', DEFAULT_PROJECT_ID);
    await usePresetStore.getState().saveCustomPreset('Mine', '', DEFAULT_PROJECT_ID);
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
    expect(useUIStore.getState().toastMessage).toBe('A preset named “Taken” already exists here');
  });

  it('refuses a collision that differs only in case', async () => {
    await usePresetStore.getState().saveCustomPreset('Taken', '', DEFAULT_PROJECT_ID);
    await usePresetStore.getState().saveCustomPreset('Mine', '', DEFAULT_PROJECT_ID);
    const mine = usePresetStore.getState().customPresets.find((preset) => preset.name === 'Mine');
    if (!mine) throw new Error('the preset should have been saved.');

    await expect(usePresetStore.getState().updateCustomPresetDetails(mine.id, 'TAKEN', '')).resolves.toBe(
      false,
    );
    expect(usePresetStore.getState().customPresets).toHaveLength(2);
  });

  it('lets a preset be recapitalised, because it is not a collision with itself', async () => {
    await usePresetStore.getState().saveCustomPreset('my knight', '', DEFAULT_PROJECT_ID);
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await expect(
      usePresetStore.getState().updateCustomPresetDetails(saved.id, 'My Knight', ''),
    ).resolves.toBe(true);
    expect(usePresetStore.getState().customPresets[0]?.name).toBe('My Knight');
  });

  it('refuses a blank name without touching storage', async () => {
    await usePresetStore.getState().saveCustomPreset('Kept', '', DEFAULT_PROJECT_ID);
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
    await usePresetStore.getState().saveCustomPreset('Before', '', DEFAULT_PROJECT_ID);
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
    await expect(usePresetStore.getState().saveCustomPreset('Doomed', '', DEFAULT_PROJECT_ID)).resolves.toBe(
      false,
    );

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not save that preset');
  });

  it('reports a preset it could not delete, and keeps showing it', async () => {
    usePresetStore.setState({ customPresets: [customPreset({ id: 'kept' })] });
    await usePresetStore.getState().deleteCustomPreset('kept');

    expect(usePresetStore.getState().customPresets).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not delete that preset');
  });

  it('reports a preset it could not re-file, and leaves it where it was', async () => {
    usePresetStore.setState({ customPresets: [customPreset({ id: 'kept' })] });
    await usePresetStore.getState().moveCustomPreset('kept', HARBOUR);

    expect(usePresetStore.getState().customPresets[0]?.projectId).toBe(DEFAULT_PROJECT_ID);
    expect(useUIStore.getState().toastMessage).toBe('Could not move that preset');
  });
});

describe('moveCustomPreset', () => {
  it('re-files a preset without touching anything else about it', async () => {
    useSubjectStore.getState().setField('role', 'Lamplighter');
    await usePresetStore.getState().saveCustomPreset('Mine', 'Kept wording', DEFAULT_PROJECT_ID);
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await usePresetStore.getState().moveCustomPreset(saved.id, HARBOUR);

    const stored = await backend.listPresets();
    expect(stored).toHaveLength(1);
    // The id is what everything refers to, so a move may not mint a new one.
    expect(stored[0]?.id).toBe(saved.id);
    expect(stored[0]?.projectId).toBe(HARBOUR);
    expect(stored[0]?.name).toBe('Mine');
    expect(stored[0]?.description).toBe('Kept wording');
    expect(stored[0]?.subject.role).toBe('Lamplighter');
    expect(useUIStore.getState().toastMessage).toBe('Moved “Mine”');
  });

  it('lets a preset land beside one of the same name, rather than folding the two together', async () => {
    // The opposite of what saving does, and deliberately: a name decides an update when it is being
    // *typed*, and a move is not a save. Folding them would destroy whichever the reader did not
    // have in mind, and neither of them asked for it.
    await usePresetStore.getState().saveCustomPreset('Hero', 'Theirs', HARBOUR);
    await usePresetStore.getState().saveCustomPreset('Hero', 'Mine', DEFAULT_PROJECT_ID);
    const mine = usePresetStore
      .getState()
      .customPresets.find((preset) => preset.projectId === DEFAULT_PROJECT_ID);
    if (!mine) throw new Error('the preset should have been saved.');

    await usePresetStore.getState().moveCustomPreset(mine.id, HARBOUR);

    const stored = await backend.listPresets();
    expect(stored).toHaveLength(2);
    expect(stored.every((preset) => preset.projectId === HARBOUR)).toBe(true);
  });

  it('says nothing and writes nothing when the preset is already there', async () => {
    // The dropdown shows a preset's current project as its selected value, so choosing it again is
    // the reader confirming what they see rather than asking for anything.
    await usePresetStore.getState().saveCustomPreset('Mine', '', DEFAULT_PROJECT_ID);
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');
    useUIStore.getState().dismissToast();

    await usePresetStore.getState().moveCustomPreset(saved.id, DEFAULT_PROJECT_ID);

    expect(useUIStore.getState().toastMessage).toBeNull();
  });

  it('refuses an id nothing holds rather than inventing a preset', async () => {
    await usePresetStore.getState().moveCustomPreset('never-existed', HARBOUR);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
  });
});

describe('deleteCustomPreset', () => {
  it('removes it from the store and from storage', async () => {
    await usePresetStore.getState().saveCustomPreset('Temporary', '', DEFAULT_PROJECT_ID);
    const [saved] = usePresetStore.getState().customPresets;
    if (!saved) throw new Error('the preset should have been saved.');

    await usePresetStore.getState().deleteCustomPreset(saved.id);

    expect(usePresetStore.getState().customPresets).toHaveLength(0);
    await expect(backend.listPresets()).resolves.toHaveLength(0);
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
