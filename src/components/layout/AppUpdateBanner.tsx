import { CHROME_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { applyAppUpdate } from '../../workers/applyAppUpdate.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { Button } from '../common/Button.tsx';

/** What the notice says, and what its primary action does, for each state that shows it. */
const NOTICES = {
  waiting: {
    message: 'A new version of Sprite Gubbins is ready. It starts when you reload this tab.',
    tooltip: CHROME_TOOLTIPS.startUpdate,
    act: applyAppUpdate,
  },
  elsewhere: {
    message:
      'Another tab started a new version of Sprite Gubbins. This tab keeps working on the old one until you reload it.',
    tooltip: CHROME_TOOLTIPS.reloadOntoUpdate,
    act: () => {
      window.location.reload();
    },
  },
} as const;

/** The bar the notice sits in, the install offer's own. */
const BAR = 'animate-fade-in border-b border-accent/30 bg-accent/10 px-6 py-3 backdrop-blur-md';

/**
 * The offer to start a newer build, in place of the reload `autoUpdate` used to force (issue #369).
 *
 * A reload clears what is only on screen, so the reader decides when it happens. The status region
 * stays mounted while the notice comes and goes, because a live region announces a change to its
 * content, not its own arrival.
 */
export function AppUpdateBanner() {
  const update = useUIStore((state) => state.appUpdate);
  const setAppUpdate = useUIStore((state) => state.setAppUpdate);

  return (
    <div role="status">
      {update === 'starting' && (
        <p className={`${BAR} text-xs text-ink-muted`}>
          Starting the new version of Sprite Gubbins. This tab reloads as soon as it is ready.
        </p>
      )}
      {(update === 'waiting' || update === 'elsewhere') && (
        <div className={`${BAR} flex flex-wrap items-center justify-between gap-3`}>
          <p className="text-xs text-ink-muted">{NOTICES[update].message}</p>

          <div className="flex items-center gap-2">
            <ControlTooltip hint="Reload" text={NOTICES[update].tooltip}>
              <Button variant="primary" size="md" onClick={() => void NOTICES[update].act()}>
                Reload
              </Button>
            </ControlTooltip>
            <ControlTooltip hint="Not now" text={CHROME_TOOLTIPS.dismissUpdate}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setAppUpdate('current');
                }}
              >
                Not now
              </Button>
            </ControlTooltip>
          </div>
        </div>
      )}
    </div>
  );
}
