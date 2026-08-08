import { ARCHITECTURE_SECTIONS } from '../../constants/architecture.ts';
import { Badge } from '../common/Badge.tsx';
import { AboutSection } from './AboutSection.tsx';
import { StorageStatus } from './StorageStatus.tsx';

/**
 * How the application is built, for anyone deciding whether to trust it with their work.
 *
 * Reads as documentation rather than marketing, and the two things worth knowing before using it —
 * that nothing is sent anywhere, and where the data is actually kept — are the first and fourth
 * sections rather than a footnote.
 *
 * The header pairs the general claim with the specific one: the sections below describe the two
 * storage backends, and `StorageStatus` says which of them this browser is on.
 */
export function SpecTab() {
  return (
    <article className="animate-fade-in glass-panel mx-auto max-w-4xl space-y-8 rounded-2xl border border-foundry-700 p-6 shadow-2xl md:p-8">
      <header className="space-y-3 border-b border-foundry-700 pb-6">
        <Badge tone="accent">Technical architecture</Badge>
        <h2 className="heading-gradient animate-gradient-pan text-2xl font-bold">How Sprite Gubbins works</h2>
        <p className="text-sm text-ink-muted">
          An offline-capable progressive web application that composes model-targeted sprite-sheet prompts,
          and keeps your work in a database inside your own browser.
        </p>
        <StorageStatus />
      </header>

      {ARCHITECTURE_SECTIONS.map((section) => (
        <section
          key={section.heading}
          className="group space-y-2 border-l-2 border-accent/25 pl-4 transition-all duration-300 hover:translate-x-1 hover:border-accent"
        >
          <h3 className="text-base font-bold text-accent-soft transition-colors duration-300 group-hover:text-ink">
            {section.heading}
          </h3>
          <p className="text-xs leading-relaxed text-ink-muted">{section.body}</p>
        </section>
      ))}

      <AboutSection />
    </article>
  );
}
