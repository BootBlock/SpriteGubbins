import type { CSSProperties } from 'react';
import { spectrumStopAt } from '../../constants/spectrum.ts';
import type { CustomArchetype } from '../../types/preset.ts';
import type { Project } from '../../types/project.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import type { SavedCustomIcon } from '../../types/savedCustomIcon.ts';
import { projectStopIndex } from '../../utils/projectStopIndex.ts';
import { QuantisePresetRow } from '../quantise/QuantisePresetRow.tsx';
import { ProjectPanelHeader } from './ProjectPanelHeader.tsx';
import { ProjectPresetRow } from './ProjectPresetRow.tsx';

interface ProjectPanelProps {
  readonly project: Project;
  /** The studio archetypes filed under it. */
  readonly presets: readonly CustomArchetype[];
  /** The saved sets of quantiser dials filed under it. */
  readonly quantisePresets: readonly QuantisePreset[];
  /** Its library of icons of the reader's own. */
  readonly customIcons: readonly SavedCustomIcon[];
}

/**
 * One project, and everything filed under it.
 *
 * The collections are listed apart rather than interleaved, because they are used at different
 * points in the same job: an archetype describes a subject to generate, a set of dials describes
 * how to read the sheet that came back, and the icon library holds the reader's own icons for the
 * project's icon sets. A single list would need every row to say which kind it was, which is a worse
 * answer than headings.
 *
 * **The icon library is listed by name alone**, because it is ticked, edited and deleted where it is
 * used — the icon catalogue, whose rows show each look under the set's world. Here it is counted and
 * named so a reader deleting the project can see what goes with it.
 *
 * The panel takes the project's own stop on the hue wheel, so the rows inside it and the chip that
 * opened it are painted in one colour — see `projectStopIndex`, which derives that stop from the id
 * rather than from a position, so a rename cannot move it.
 *
 * **The `key` on each row is the save's id**, which is what makes re-filing a diff: moving one
 * preset out of this project leaves every other row holding the DOM node it already had, so none of
 * them replays its entrance or drops an open editor.
 */
export function ProjectPanel({ project, presets, quantisePresets, customIcons }: ProjectPanelProps) {
  return (
    <section
      aria-label={project.name}
      // Cast because `CSSProperties` enumerates the known CSS properties and a custom one is not
      // among them. It widens nothing: the value is a `var()` reference the allocator produced.
      style={{ '--color-tab': spectrumStopAt(projectStopIndex(project.id)) } as CSSProperties}
      className="animate-view-fade-in glass-panel space-y-5 rounded-2xl border border-tab/35 p-5 shadow-xl"
    >
      <ProjectPanelHeader
        project={project}
        savedCount={presets.length + quantisePresets.length + customIcons.length}
      />

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold text-ink">Studio presets</h4>
          <span className="font-mono text-2xs text-ink-faint">{presets.length} saved</span>
        </div>

        {presets.length === 0 ? (
          <p className="rounded-xl border border-foundry-700 bg-foundry-950 p-4 text-xs text-ink-muted">
            Nothing saved here yet. Set the studio up how you want it, then name it and save it into this
            project from the panel at the bottom of the Studio tab.
          </p>
        ) : (
          <ul className="space-y-3">
            {presets.map((preset) => (
              <ProjectPresetRow key={preset.id} preset={preset} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold text-ink">Quantiser settings</h4>
          <span className="font-mono text-2xs text-ink-faint">{quantisePresets.length} saved</span>
        </div>

        {quantisePresets.length === 0 ? (
          <p className="rounded-xl border border-foundry-700 bg-foundry-950 p-4 text-xs text-ink-muted">
            No dial positions saved here yet. Tune a sheet on the Quantise tab, then save the settings into
            this project from the panel beside the dials.
          </p>
        ) : (
          <ul className="space-y-2">
            {quantisePresets.map((preset) => (
              <QuantisePresetRow key={preset.id} preset={preset} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-semibold text-ink">Icon library</h4>
          <span className="font-mono text-2xs text-ink-faint">{customIcons.length} saved</span>
        </div>

        {customIcons.length === 0 ? (
          <p className="rounded-xl border border-foundry-700 bg-foundry-950 p-4 text-xs text-ink-muted">
            No icons of your own saved here yet. Write one in an icon set’s catalogue with this project chosen
            as its library, and every later set can tick it.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {customIcons.map((icon) => (
              <li
                key={icon.id}
                className="rounded-lg border border-foundry-700 bg-foundry-950 px-2.5 py-1 text-xs text-ink"
              >
                {icon.entry.role} <span className="font-mono text-2xs text-ink-faint">{icon.entry.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
