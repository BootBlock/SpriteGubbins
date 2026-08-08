import { DEFAULT_SETTINGS, OPENING_VIEW_CHOICES, SETTINGS_TOOLTIPS } from '../../constants/settings.ts';
import { useSettingsStore } from '../../stores/useSettingsStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { Modal } from '../common/Modal.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { SettingsAccentField } from './SettingsAccentField.tsx';
import { SettingsMotionField } from './SettingsMotionField.tsx';

/**
 * The preferences that belong to the application rather than to a prompt.
 *
 * Everything here changes how the app *looks or behaves* and nothing changes what it produces: the
 * compiled prompt stays a pure function of the category, the subject and the output configuration,
 * which is what stops two people with the same studio state getting different text. That is the line
 * a control has to be on the right side of to belong in this dialog — an option that reached the
 * compiler would belong in the studio, where the user can see its effect on the prompt.
 *
 * Every change is applied and persisted as it is made, so there is no Save and nothing to cancel.
 * These are all things whose effect is visible the instant they are chosen — the page changes colour,
 * the wash goes out — so a dialog that collected them up and asked for confirmation would be putting
 * a step between the click and the thing the click already did.
 */
export function SettingsModal() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const toggleSettingsModal = useUIStore((state) => state.toggleSettingsModal);

  return (
    <Modal
      title="Settings"
      icon="⚙️"
      onClose={toggleSettingsModal}
      panelClassName="glass-panel max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-foundry-700 shadow-2xl"
    >
      <div className="space-y-5 p-6 text-xs">
        <SettingsAccentField />

        <SettingsMotionField />

        <CheckboxField
          label="Ambient backdrop"
          tooltip={SETTINGS_TOOLTIPS.ambientBackdrop}
          checked={settings.ambientBackdrop}
          disabledReason=""
          onChange={(ambientBackdrop) => {
            void updateSettings({ ambientBackdrop });
          }}
        />

        <SelectField
          label="Opening view"
          tooltip={SETTINGS_TOOLTIPS.openingView}
          value={settings.openingView}
          choices={OPENING_VIEW_CHOICES}
          onChange={(openingView) => {
            void updateSettings({ openingView });
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-foundry-700 px-6 py-4">
        <button
          type="button"
          onClick={() => {
            void updateSettings(DEFAULT_SETTINGS);
          }}
          className="flex-1 rounded-xl border border-foundry-600 bg-foundry-950 py-2.5 text-xs font-bold text-ink-muted shadow-md transition-colors duration-390 hover:bg-foundry-700 hover:text-ink"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={toggleSettingsModal}
          className="rounded-xl bg-accent-strong px-5 py-2.5 text-xs font-bold text-ink shadow-lg transition-colors duration-390 hover:bg-accent"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
