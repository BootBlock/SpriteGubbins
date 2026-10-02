import { describe, expect, it } from 'vitest';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { HARBOUR } from '../test/iconLibraryStudio.ts';
import { chosenProjectId } from './chosenProjectId.ts';

describe('chosenProjectId', () => {
  const projects = [HARBOUR, createDefaultProject(1)];

  it('keeps a choice that still names a project', () => {
    expect(chosenProjectId(projects, DEFAULT_PROJECT_ID)).toBe(DEFAULT_PROJECT_ID);
  });

  it('falls back to the first project where the choice names none, or none was made', () => {
    expect(chosenProjectId(projects, 'deleted')).toBe(HARBOUR.id);
    expect(chosenProjectId(projects, '')).toBe(HARBOUR.id);
  });

  it('is empty before any project has loaded', () => {
    expect(chosenProjectId([], DEFAULT_PROJECT_ID)).toBe('');
  });
});
