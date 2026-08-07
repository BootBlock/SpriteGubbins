import {
  APP_VERSION,
  AUTHOR_NAME,
  AUTHOR_URL,
  LICENCE_NAME,
  LICENCE_URL,
  REPOSITORY_URL,
} from '../../constants/about.ts';
import { Badge } from '../common/Badge.tsx';
import { ExternalLink } from '../common/ExternalLink.tsx';

/**
 * Who made this, which build you are looking at, and where to read the source.
 *
 * Sits at the end of the architecture tab rather than in a tab of its own: everything above it is
 * the case for trusting the application, and provenance is the last part of that case — who stands
 * behind it, and whether you can go and check. The version is the specific claim, which is why it
 * is a chip beside the heading rather than a line of prose: it is what a bug report needs, and the
 * deploy tags each release `v<version>`, so what is shown here names the published build exactly.
 */
export function AboutSection() {
  return (
    <section className="space-y-3 border-t border-foundry-700 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-bold text-accent-soft">About</h3>
        <Badge tone="accent">v{APP_VERSION}</Badge>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        Sprite Gubbins is made by <ExternalLink href={AUTHOR_URL}>{AUTHOR_NAME}</ExternalLink>. It is free and
        open source under the <ExternalLink href={LICENCE_URL}>{LICENCE_NAME} licence</ExternalLink>, and the
        whole of it — this page included — is on <ExternalLink href={REPOSITORY_URL}>GitHub</ExternalLink>.
      </p>

      <p className="text-xs leading-relaxed text-ink-faint">
        These are the only links in the application, and following one is the only time it reaches another
        site. Nothing you type here is sent anywhere.
      </p>
    </section>
  );
}
