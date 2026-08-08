import { useSyncExternalStore } from 'react';
import { SETTINGS_TOOLTIPS } from '../../constants/settings.ts';
import { useSettingsStore } from '../../stores/useSettingsStore.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';

/** The query `index.css`'s catch-all is written against, so the control cannot describe a different one. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Subscribing to the system's motion preference.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`, which is the derived-state shape the
 * structural laws ban and would also render one frame with the wrong answer. `matchMedia` is exactly
 * the external store this hook is for: subscribe, read, done.
 *
 * Written inline rather than filed under `src/hooks/`, because it has one call site — a hook wrapping
 * a single subscription for one consumer is the abstraction soup that directory's rule warns about.
 * It moves there the moment something else needs it.
 */
function subscribe(onChange: () => void): () => void {
  // `matchMedia` is absent in a plain test environment, and a media query nobody can evaluate is
  // indistinguishable from one that does not match.
  const query = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  query?.addEventListener('change', onChange);
  return () => {
    query?.removeEventListener('change', onChange);
  };
}

function readSystemPreference(): boolean {
  return globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

/**
 * The in-app reduced-motion switch, and the one place the app admits it is not the only thing with an
 * opinion about motion.
 *
 * The setting can only ever *subtract*: a system already asking for reduced motion is honoured
 * whatever this says, so when it does, the control is shown unavailable with that as its reason
 * rather than offering a choice that would change nothing. `CheckboxField` takes the reason as a
 * string precisely so the explanation can be given instead of the control simply greying out, and it
 * uses `aria-disabled` rather than `disabled`, so a keyboard user can still reach the control and
 * hear why it is not theirs to set right now.
 */
export function SettingsMotionField() {
  const motion = useSettingsStore((state) => state.settings.motion);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  // The server snapshot is the same function: there is no server, and a PWA's shell is prerendered
  // by nothing — but `useSyncExternalStore` requires the argument, and returning a *different* answer
  // there would be inventing a hydration mismatch.
  const systemAsksForLess = useSyncExternalStore(subscribe, readSystemPreference, readSystemPreference);

  return (
    <CheckboxField
      label="Reduce motion"
      tooltip={SETTINGS_TOOLTIPS.motion}
      checked={systemAsksForLess || motion === 'reduced'}
      disabledReason={
        systemAsksForLess
          ? 'Your system already asks for reduced motion, so the app is quiet either way.'
          : ''
      }
      onChange={(checked) => {
        void updateSettings({ motion: checked ? 'reduced' : 'system' });
      }}
    />
  );
}
