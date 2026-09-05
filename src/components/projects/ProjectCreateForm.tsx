import { useState } from 'react';
import { PROJECT_NAME_MAX_LENGTH } from '../../constants/projects.ts';
import { PROJECT_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { TextField } from '../common/TextField.tsx';

/**
 * Making a project.
 *
 * The only place one can be made, deliberately: every other control that mentions a project offers
 * the list as a dropdown, so a project's existence is decided here and nowhere else. That is what
 * keeps the list a set the reader curated rather than an accumulation of names typed into save
 * boxes, where one typo becomes a project of its own holding a single preset.
 *
 * It reads the store itself and returns nothing to its parent, so the tab around it is composition
 * and has no state to hold.
 */
export function ProjectCreateForm() {
  const createProject = useProjectStore((state) => state.createProject);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // The store's write is asynchronous and the button is otherwise disabled only on a blank name, so
  // without this a double-press asks for the same project twice — and the second would be refused
  // by the name it had just created, reporting a clash the reader did not make.
  const [isCreating, setIsCreating] = useState(false);

  const create = async () => {
    setIsCreating(true);
    try {
      // Cleared only when it was actually stored. A refused name — blank, or one another project
      // holds — is reported with a toast and resolves normally, so emptying the boxes would make
      // the reader retype a name they are about to correct.
      if (await createProject(name, description)) {
        setName('');
        setDescription('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-5 shadow-xl">
      <h2 className="heading-gradient animate-gradient-pan text-lg font-bold">Start a project</h2>
      <p className="mt-1 text-xs text-ink-muted">
        A project is where your saved studio presets and quantiser settings are filed. Everything you save
        goes into one, and the Default project is where it goes until you choose otherwise.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <TextField
            label="Project name"
            tooltip={PROJECT_ACTION_TOOLTIPS.newProjectName}
            value={name}
            placeholder="The game or job these sprites are for"
            maxLength={PROJECT_NAME_MAX_LENGTH}
            onChange={setName}
          />
        </div>

        <div className="min-w-48 flex-1">
          <TextField
            label="Describe it (optional)"
            tooltip={PROJECT_ACTION_TOOLTIPS.newProjectDescription}
            value={description}
            placeholder="What this project covers"
            onChange={setDescription}
          />
        </div>

        <ControlTooltip hint="Add project" text={PROJECT_ACTION_TOOLTIPS.createProject}>
          <button
            type="button"
            disabled={isCreating || name.trim() === ''}
            onClick={() => {
              void create();
            }}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isCreating ? 'Adding…' : 'Add project'}
          </button>
        </ControlTooltip>
      </div>
    </section>
  );
}
