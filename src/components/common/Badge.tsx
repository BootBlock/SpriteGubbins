import type { ReactNode } from 'react';

/**
 * What a badge is saying, not what colour it is.
 *
 * `live` is cyan and the rest are not, deliberately: cyan marks something recomputing as the user
 * works (the prompt's auto-sync indicator) and indigo is the ordinary accent. Reaching for `live`
 * to make a static chip stand out destroys the one distinction the palette is carrying.
 */
export type BadgeTone = 'accent' | 'live' | 'attention' | 'valid' | 'neutral';

const TONE_CLASSES: Readonly<Record<BadgeTone, string>> = {
  accent: 'border-accent/30 bg-accent/15 text-accent-soft',
  live: 'border-neon/30 bg-neon/10 text-neon',
  attention: 'border-gold/30 bg-gold/10 text-gold',
  valid: 'border-emerald/30 bg-emerald/10 text-emerald',
  neutral: 'border-foundry-600 bg-foundry-700 text-ink-faint',
};

interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}

/** A small status or tag chip. Monospace, because most of what it carries is an identifier. */
export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
