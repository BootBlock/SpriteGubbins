import { ARCHITECTURE_SECTIONS } from '../../constants/architecture.ts';
import { Badge } from '../common/Badge.tsx';

/**
 * How the application is built, for anyone deciding whether to trust it with their work.
 *
 * Reads as documentation rather than marketing, and the two things worth knowing before using it —
 * that nothing is sent anywhere, and where the data is actually kept — are the first and fourth
 * sections rather than a footnote.
 */
export function SpecTab() {
  return (
    <article className="animate-fade-in mx-auto max-w-4xl space-y-8 rounded-2xl border border-foundry-700 bg-foundry-800/90 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <header className="space-y-3 border-b border-foundry-700 pb-6">
        <Badge tone="accent">Technical architecture</Badge>
        <h2 className="text-2xl font-bold text-ink">How Sprite Gubbins works</h2>
        <p className="text-sm text-ink-muted">
          An offline-capable progressive web application that composes model-targeted sprite-sheet prompts,
          and keeps your work in a database inside your own browser.
        </p>
      </header>

      {ARCHITECTURE_SECTIONS.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="text-base font-bold text-accent-soft">{section.heading}</h3>
          <p className="text-xs leading-relaxed text-ink-muted">{section.body}</p>
        </section>
      ))}
    </article>
  );
}
