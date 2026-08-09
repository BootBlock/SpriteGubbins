import { resolveMode } from '../../constants/sheetPlans/index.ts';
import type { ImageOutputConfig } from '../../types/output.ts';
import type { SubjectCategory } from '../../types/subject.ts';

interface PresetCardSpecsProps {
  /** What the preset is of, which is what decides whether it can have the sheet mode it stored. */
  readonly category: SubjectCategory;
  readonly output: ImageOutputConfig;
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
 *
 * **The sheet mode goes through `resolveMode`, and it is the only one of the three that has to.** A
 * render style and a projection are free of the category, while the modes are scoped to it — so a
 * stored `CUTOUT_RIG_SINGLE_DIRECTION` on an INTERFACE preset is a pairing that does not exist, and
 * loading it puts that category's default in the studio instead. No shipped preset carries one —
 * `presetCoverage.test.ts` asserts the pairing for every built-in, and has to, precisely because
 * resolving here leaves a mismatched one with no visible symptom. An imported preset is the case
 * that reaches this line: `parseImportedPreset` validates against the flat `DIRECTIONAL_MODES` union
 * with no category in scope, so a hand-written pack can pair the two freely. Resolving makes the
 * card a promise about what loading gives you rather than a transcript of a file — the same rule the
 * compiler, the studio digest and the sheet control follow, and the reason none of them can disagree
 * with this line.
 */
export function PresetCardSpecs({ category, output }: PresetCardSpecsProps) {
  return (
    <p className="font-mono text-2xs break-words text-ink-faint">
      {output.renderStyle} · {output.projection} · {resolveMode(category, output.directionalMode)}
    </p>
  );
}
