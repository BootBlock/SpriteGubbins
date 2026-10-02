import type { Project } from '../types/project.ts';

/**
 * The project a control's choice names, where it still names one, and the first project otherwise —
 * empty only before the projects have loaded.
 *
 * **Derived rather than corrected**, wherever a project is chosen: the choice is kept as it was made,
 * and it can stop naming a project when that project is deleted or an import replaces the list. Read
 * during render, so no frame is painted against a project that is not there and then corrected by an
 * effect. The first project is the most recently made or renamed, which is where every save dropdown
 * and the icon library open, so the four agree until the reader chooses otherwise.
 */
export function chosenProjectId(projects: readonly Project[], chosen: string): string {
  return projects.some((project) => project.id === chosen) ? chosen : (projects[0]?.id ?? '');
}
