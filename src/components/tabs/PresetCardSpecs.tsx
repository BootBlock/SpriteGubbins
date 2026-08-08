import type { OutputConfig } from '../../types/output.ts';

interface PresetCardSpecsProps {
  readonly output: OutputConfig;
}

/**
 * The three settings that decide what a preset's sheet actually *is*: how it is drawn, where the camera
 * stands, and what kind of component set comes back.
 *
 * On the card because the library is the app's documentation of itself. A preset named for its subject
 * — "Ooze Hydra Brood" — says nothing about being a bone rig, so without this the only way to find out
 * is to load it and read the studio.
 *
 * Three and not more. The search reaches every string in the configuration, so a query can be answered
 * by a setting this line does not show — "isometric" also finds the two presets whose *lighting* is
 * `ISOMETRIC_TOP_LEFT` — and no line short enough to sit on a card could close that gap. These three
 * are here because they are what decides what the sheet *is*, not because they are what the search saw.
 *
 * The identifiers rather than the friendly labels, deliberately. These are the terms the compiled prompt
 * is written against and the terms the studio's own selects show, so a user comparing two generations
 * is reading the same words in all three places. Monospace and faint, because it is reference rather
 * than heading — and allowed to wrap, since truncating would drop the sheet mode, which is the one of
 * the three least guessable from the preset's name.
 */
export function PresetCardSpecs({ output }: PresetCardSpecsProps) {
  return (
    <p className="font-mono text-2xs break-words text-ink-faint">
      {output.renderStyle} · {output.projection} · {output.directionalMode}
    </p>
  );
}
