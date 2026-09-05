import type { CSSProperties } from 'react';
import { spectrumStopAt } from '../../constants/spectrum.ts';
import { PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { Project } from '../../types/project.ts';
import { projectStopIndex } from '../../utils/projectStopIndex.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface ProjectListProps {
  readonly projects: readonly Project[];
  /** How many saves each project holds, both kinds counted together. */
  readonly counts: ReadonlyMap<string, number>;
  readonly active: string;
  readonly onSelect: (projectId: string) => void;
}

/**
 * Which project the panel below is showing.
 *
 * A wrapping row of buttons rather than a sidebar, which is what lets the panel below have the whole
 * page width — and it needs it: a saved preset's row carries a project dropdown, and a native
 * `<select>` truncates an option its container cannot fit. A column would have put every project
 * name at the mercy of that.
 *
 * A `<nav>` of buttons marked with `aria-current`, not an ARIA tablist — the same choice the
 * header's view switcher and the preset library's collection list both make, and for the same
 * reason: these replace the panel's contents rather than revealing one of several panels that all
 * exist at once.
 *
 * **Each button carries its project's own stop on the hue wheel**, from the project's id rather
 * than from its place in this list — see `projectStopIndex`, which says why a rename may not change
 * a colour. The selected one is painted in it, and the rest wear it as an edge, so the set reads as
 * an allocation at a glance and the panel below can be painted in the same stop.
 */
export function ProjectList({ projects, counts, active, onSelect }: ProjectListProps) {
  return (
    <nav aria-label="Projects">
      <ul className="flex flex-wrap gap-2">
        {projects.map((project) => {
          const isActive = project.id === active;
          const count = counts.get(project.id) ?? 0;

          return (
            <li
              key={project.id}
              // Cast because `CSSProperties` enumerates the known CSS properties and a custom one is
              // not among them. It widens nothing: the value is a `var()` reference the allocator
              // produced, not a colour written here.
              style={{ '--color-tab': spectrumStopAt(projectStopIndex(project.id)) } as CSSProperties}
            >
              <ControlTooltip hint={project.name} text={PROJECT_ACTION_TOOLTIPS.selectProject}>
                <button
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => {
                    onSelect(project.id);
                  }}
                  className={`flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? // Near-black on the project's own stop. Every stop on the wheel is a *light*
                        // colour — they share one lightness precisely so they are interchangeable —
                        // so ink on one would be two light tones a shade apart.
                        'border-tab bg-tab text-foundry-950'
                      : 'border-tab/35 text-ink-muted hover:border-tab/70 hover:text-ink'
                  }`}
                >
                  <span className="truncate">{project.name}</span>
                  <span
                    className={`font-mono text-2xs ${isActive ? 'text-foundry-950/70' : 'text-ink-faint'}`}
                  >
                    {count}
                  </span>
                </button>
              </ControlTooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
