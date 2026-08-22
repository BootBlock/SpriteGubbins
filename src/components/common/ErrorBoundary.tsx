import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { CHROME_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { ControlTooltip } from './ControlTooltip.tsx';

interface ErrorBoundaryProps {
  /** What the reader was waiting for, so the notice can say which part of the app failed. */
  readonly what: string;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

/**
 * The floor under a view or an overlay that cannot start.
 *
 * The app is split into a chunk per view and per overlay, which buys a first paint that parses a
 * fraction of the code — and brings one failure the single bundle could not have: a fetch that
 * happens *while the reader is working*, and can fail on its own. `React.lazy` caches the rejection
 * on its payload, so a chunk that failed once is rethrown on every later render of that component:
 * pressing the tab again does nothing, and with no boundary above it React unmounts the whole root
 * and leaves a white page. Fetching the app again is the only thing that clears it, so that is what
 * this offers.
 *
 * A class, because `componentDidCatch` has no hook equivalent — this is the one place in the app
 * where React still requires one, and the alternative is not catching the error at all.
 *
 * It is deliberately not a silent fallback. A tab that answers a press with nothing, or with an
 * empty panel, is the same white page with a border round it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // The console is the only place this can go: the app has no server to report to, and a toast
    // is rendered by the tree that has just come down.
    console.error(`Sprite Gubbins could not load ${this.props.what}.`, error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="glass-panel animate-fade-in rounded-2xl border border-rose/40 p-6">
        <h2 className="text-base font-bold text-rose">Could not load {this.props.what}</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Its code is fetched separately from the rest of the app, and that fetch did not arrive. The failure
          is remembered for the rest of this session, so fetching the app again is what clears it. Nothing you
          have saved is affected.
        </p>
        <ControlTooltip
          hint="Reload the app"
          text={CHROME_TOOLTIPS.reloadApp}
          className="relative mt-4 inline-flex"
        >
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="rounded-xl bg-accent-strong px-5 py-2.5 text-xs font-bold text-ink shadow-lg transition-colors hover:bg-accent"
          >
            Reload the app
          </button>
        </ControlTooltip>
      </div>
    );
  }
}
