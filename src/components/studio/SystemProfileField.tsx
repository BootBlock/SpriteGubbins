import { HARDWARE_PROFILE_CHOICES, hardwareProfileFor } from '../../constants/hardware/index.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { SelectField } from '../common/SelectField.tsx';

/**
 * The machine this sheet targets, and the one control in the panel that writes other controls.
 *
 * It sits **above** the six groups rather than inside one, because that is what it does to them:
 * choosing a machine writes the render style, surface detail, resolution, component size, outline,
 * lighting and palette in one act, which is settings from two different groups. A control that
 * rewrites its neighbours cannot be filed as one of them.
 *
 * **Choosing `NONE` writes only this field.** Reverting the seven settings a previous machine
 * applied would discard whatever the user has since done to them, which is the opposite of what
 * "no target machine" asks for — it says the sheet is no longer *for* a machine, not that the last
 * ten minutes of work should be undone.
 *
 * The description under the control is the profile's own constraint list, joined. It is the same
 * text the compiled prompt carries, from the same array, so what the studio says the machine is
 * cannot drift from what the generator is told.
 */
export function SystemProfileField() {
  const hardwareProfile = useOutputStore((state) => state.output.hardwareProfile);
  const applyOutputPatch = useOutputStore((state) => state.applyOutputPatch);

  const profile = hardwareProfileFor(hardwareProfile);

  return (
    <SelectField
      label="System Profile"
      tooltip={OUTPUT_TOOLTIPS.hardwareProfile}
      value={hardwareProfile}
      choices={HARDWARE_PROFILE_CHOICES}
      description={profile === null ? '' : profile.constraints.join(' ')}
      onChange={(value) => {
        const chosen = hardwareProfileFor(value);
        applyOutputPatch(
          chosen === null ? { hardwareProfile: value } : { hardwareProfile: value, ...chosen.settings },
        );
      }}
    />
  );
}
