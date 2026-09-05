import { useMemo, useState } from 'react';
import { ProjectCreateForm } from '../projects/ProjectCreateForm.tsx';
import { ProjectList } from '../projects/ProjectList.tsx';
import { ProjectPanel } from '../projects/ProjectPanel.tsx';
import { ProjectTransferControls } from '../projects/ProjectTransferControls.tsx';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';

/**
 * The projects view: making one above, choosing one in the middle, and its contents below.
 *
 * **One column, and that is a correctness decision rather than a layout preference.** Every saved
 * preset here carries a dropdown that re-files it, and a native `<select>` truncates an option its
 * container cannot fit — so a project list down the left-hand side would have paid for itself by
 * clipping every project name in the control that has to tell them apart. A wrapping row of project
 * buttons costs a strip of vertical space and gives the rows the whole page width.
 *
 * **Which project is shown is derived rather than corrected.** The reader's choice is kept as it
 * was made, and the project actually shown is that choice where it still names a project and the
 * first one otherwise — which is what happens when the open project is deleted, or when an import
 * replaces the whole list. Deriving it during render keeps that out of an effect, which would paint
 * one frame against a project that is not there and then correct itself.
 */
export function ProjectsTab() {
  const projects = useProjectStore((state) => state.projects);
  const customPresets = usePresetStore((state) => state.customPresets);
  const quantisePresets = useQuantisePresetStore((state) => state.presets);

  const [chosen, setChosen] = useState('');

  const active = projects.find((project) => project.id === chosen) ?? projects[0];

  /** How many saves each project holds, both kinds counted together — what the buttons show. */
  const counts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const { projectId } of [...customPresets, ...quantisePresets]) {
      totals.set(projectId, (totals.get(projectId) ?? 0) + 1);
    }
    return totals;
  }, [customPresets, quantisePresets]);

  const presetsHere = useMemo(
    () => customPresets.filter((preset) => preset.projectId === active?.id),
    [customPresets, active],
  );
  const dialsHere = useMemo(
    () => quantisePresets.filter((preset) => preset.projectId === active?.id),
    [quantisePresets, active],
  );

  return (
    <div className="animate-view-fade-in space-y-6">
      <section className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-foundry-700 p-5 shadow-xl">
        <div>
          <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Your projects</h2>
          <p className="text-xs text-ink-muted">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}, holding{' '}
            {customPresets.length + quantisePresets.length} saved{' '}
            {customPresets.length + quantisePresets.length === 1 ? 'item' : 'items'} between them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectTransferControls />
        </div>
      </section>

      <ProjectCreateForm />

      {/*
        Both the chooser and the panel are absent until the projects have loaded. That is a moment
        rather than a state: `App` fetches them on boot and writes the Default one where an install
        has none, so an empty list means the read has not landed yet — and a panel drawn for no
        project would be a heading with nothing under it.
      */}
      {active !== undefined && (
        <>
          <ProjectList projects={projects} counts={counts} active={active.id} onSelect={setChosen} />
          <ProjectPanel project={active} presets={presetsHere} quantisePresets={dialsHere} />
        </>
      )}
    </div>
  );
}
