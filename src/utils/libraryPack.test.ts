import { describe, expect, it } from 'vitest';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME, PROJECT_NAME_MAX_LENGTH } from '../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { libraryPackSize, parseLibraryPack, serialiseLibraryPack } from './libraryPack.ts';

/**
 * The file the whole library travels in, in both directions.
 *
 * The two halves have to agree about the built-ins — an export carries them so the file reads on
 * its own, and an import skips them so re-importing your own export does not store a second copy of
 * each — and about the one guarantee everything downstream rests on: **a preset that comes out of
 * this names a project that came out of it too**.
 */

const NOW = 1_700_000_000_000;

const HARBOUR: Project = {
  id: 'harbour',
  name: 'Harbour',
  description: 'The town scenes.',
  createdAt: 1,
  updatedAt: 2,
};

function preset(projectId: string, id = 'custom-1'): CustomArchetype {
  return { ...DEFAULT_PRESET, id, projectId, name: id, isCustom: true };
}

function dials(projectId: string, id = 'quantise-1'): QuantisePreset {
  return { id, projectId, name: id, description: '', dials: QUANTISE_DEFAULT_DIALS };
}

function parse(pack: unknown) {
  return parseLibraryPack(JSON.stringify(pack), NOW);
}

describe('serialiseLibraryPack', () => {
  it('carries the built-in archetypes alongside the reader’s own', () => {
    const text = serialiseLibraryPack({
      projects: [HARBOUR],
      presets: [preset(HARBOUR.id)],
      quantisePresets: [dials(HARBOUR.id)],
    });

    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('the pack should be an object.');
    const pack = parsed as Record<string, unknown[]>;

    expect(pack['presets']).toHaveLength(PRESETS.length + 1);
    expect(pack['projects']).toHaveLength(1);
    expect(pack['quantisePresets']).toHaveLength(1);
  });

  it('round-trips its own output, skipping the built-ins on the way back', () => {
    const before = {
      projects: [HARBOUR],
      presets: [preset(HARBOUR.id)],
      quantisePresets: [dials(HARBOUR.id)],
    };

    const after = parseLibraryPack(serialiseLibraryPack(before), NOW);

    expect(after?.projects).toEqual(before.projects);
    expect(after?.presets.map((entry) => entry.id)).toEqual(['custom-1']);
    expect(after?.quantisePresets.map((entry) => entry.id)).toEqual(['quantise-1']);
  });
});

describe('parseLibraryPack', () => {
  it('refuses text that is not a pack at all', () => {
    expect(parseLibraryPack('<html>not a pack</html>', NOW)).toBeNull();
    // An array is what the two retired packs were, so it is the shape a stale file arrives in.
    expect(parse([preset(HARBOUR.id)])).toBeNull();
    expect(parse({ somethingElse: [] })).toBeNull();
  });

  it('reads a pack that holds nothing as empty rather than refusing it', () => {
    // Two different answers, and the caller reports them differently: an install that has saved
    // nothing exports this, and refusing it would say something untrue about the file.
    const pack = parse({ projects: [] });
    expect(pack).not.toBeNull();
    expect(libraryPackSize(pack ?? { projects: [], presets: [], quantisePresets: [] })).toBe(0);
  });

  it('drops entries it cannot vouch for and keeps the rest', () => {
    const pack = parse({
      projects: [HARBOUR, { id: 42 }, null],
      presets: [preset(HARBOUR.id, 'good'), { id: 'no-category', name: 'Nameless' }],
      quantisePresets: [dials(HARBOUR.id, 'good-dials'), { id: 'no-dials', name: 'Dial-less' }],
    });

    expect(pack?.projects.map((project) => project.id)).toEqual(['harbour']);
    expect(pack?.presets.map((entry) => entry.id)).toEqual(['good']);
    expect(pack?.quantisePresets.map((entry) => entry.id)).toEqual(['good-dials']);
  });

  it('keeps the first entry under a repeated id, in all three collections', () => {
    const pack = parse({
      projects: [HARBOUR, { ...HARBOUR, name: 'Second' }],
      presets: [preset(HARBOUR.id), { ...preset(HARBOUR.id), name: 'Second' }],
      quantisePresets: [dials(HARBOUR.id), { ...dials(HARBOUR.id), name: 'Second' }],
    });

    expect(pack?.projects.map((project) => project.name)).toEqual(['Harbour']);
    expect(pack?.presets).toHaveLength(1);
    expect(pack?.quantisePresets).toHaveLength(1);
  });

  it('re-files a preset naming a project the file does not carry', () => {
    // The guarantee everything downstream rests on. A preset left naming a missing project would be
    // invisible after the import, since the Projects view draws presets under the project they
    // belong to — so it goes to Default, and Default is added because something now needs it.
    const pack = parse({ presets: [preset('never-exported')], quantisePresets: [dials('never-exported')] });

    expect(pack?.presets[0]?.projectId).toBe(DEFAULT_PROJECT_ID);
    expect(pack?.quantisePresets[0]?.projectId).toBe(DEFAULT_PROJECT_ID);
    expect(pack?.projects.map((project) => project.id)).toEqual([DEFAULT_PROJECT_ID]);
    expect(pack?.projects[0]?.name).toBe(DEFAULT_PROJECT_NAME);
  });

  it('adds no Default project when nothing needs one', () => {
    // Importing a pack of two named projects must not arrive with a third the reader never made.
    const pack = parse({ projects: [HARBOUR], presets: [preset(HARBOUR.id)] });

    expect(pack?.projects.map((project) => project.id)).toEqual(['harbour']);
  });

  it('keeps the Default project the file carried rather than replacing it', () => {
    const renamed: Project = { ...HARBOUR, id: DEFAULT_PROJECT_ID, name: 'My Game' };
    const pack = parse({ projects: [renamed], presets: [preset(DEFAULT_PROJECT_ID)] });

    expect(pack?.projects).toEqual([renamed]);
  });

  it('repairs a preset with no project at all, which a hand-written pack may have', () => {
    const { projectId: _ignored, ...withoutProject } = preset(HARBOUR.id);
    const pack = parse({ projects: [HARBOUR], presets: [withoutProject] });

    expect(pack?.presets[0]?.projectId).toBe(DEFAULT_PROJECT_ID);
    // And the Default project arrives with it, because the preset now needs one.
    expect(pack?.projects.map((project) => project.id).sort()).toEqual([DEFAULT_PROJECT_ID, 'harbour']);
  });

  it('stamps the given instant on a project whose timestamps the file omits', () => {
    const pack = parse({ projects: [{ id: 'harbour', name: 'Harbour' }] });

    expect(pack?.projects[0]?.createdAt).toBe(NOW);
    expect(pack?.projects[0]?.updatedAt).toBe(NOW);
  });

  it('clamps a project name too long for the dropdown every save goes through', () => {
    const pack = parse({ projects: [{ ...HARBOUR, name: 'x'.repeat(PROJECT_NAME_MAX_LENGTH + 40) }] });

    expect(pack?.projects[0]?.name).toHaveLength(PROJECT_NAME_MAX_LENGTH);
  });
});
