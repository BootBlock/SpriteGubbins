import type { ReactNode } from 'react';

/**
 * What a badge is saying, not what colour it is.
 *
 * `live` is cyan and the rest are not, deliberately: cyan marks something recomputing as the user
 * works (the prompt's auto-sync indicator) and indigo is the ordinary accent. Reaching for `live`
 * to make a static chip stand out destroys the one distinction the palette is carrying.
 *
 * `view` is the one tone with no fixed colour: it takes `--color-tab`, so it belongs to whatever
 * set it in scope — the active view, or an individual preset card that re-pointed the property to
 * its own stop on the wheel. Use it for a chip labelling the thing it sits inside; use `accent`
 * when the chip means the same wherever it appears.
 */
export type BadgeTone = 'accent' | 'view' | 'live' | 'attention' | 'valid' | 'neutral';

const TONE_CLASSES: Readonly<Record<BadgeTone, string>> = {
  accent: 'border-accent/30 bg-accent/15 text-accent-soft',
  view: 'border-tab/40 bg-tab/15 text-tab',
  // The only tone that pulses. `live` marks something recomputing, so the chip keeps moving for
  // as long as that is true — the others are statements of fact and hold still.
  live: 'animate-pulse-glow border-neon/40 bg-neon/10 text-neon',
  attention: 'border-gold/30 bg-gold/10 text-gold',
  valid: 'border-emerald/30 bg-emerald/10 text-emerald',
  neutral: 'border-foundry-600 bg-foundry-700/70 text-ink-faint',
};

interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}

/** A small status or tag chip. Monospace, because most of what it carries is an identifier. */
export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap backdrop-blur-sm ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
