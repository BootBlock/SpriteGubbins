import type { TargetSize } from '../types/output.ts';

/**
 * Reading the studio's `spriteTargetSize` as the component size it states.
 *
 * The field is free prose — the shipped presets hold *"48 × 96 px assembled (2 metres tall at 48 px
 * per metre)"* — and it names a **component** size, not a sheet scale. Two features read it and
 * neither owns it: `minFeatureSize` takes it as the scale the pixel-discipline section is written
 * against, and `targetSizeGrid` turns it into a candidate scale for a returned sheet.
 *
 * **The parse is kept apart from that second reading, and the separation is load-bearing.**
 * `targetSizeGrid` takes an `ImageData` and so belongs to a program with the DOM lib; this function
 * is reached from `src/constants/promptText/`, which the suites under `tests/` pull into
 * `tsconfig.node.json`'s program, and that one has no DOM. Putting the two in one file compiles
 * until something in the prompt constants reads a target size, and then fails in files that never
 * changed — `Cannot find name 'ImageData'`, reported against the quantiser's types.
 */

/**
 * The first `W × H` pair in the text, or `null` where there is none.
 *
 * A pair is required rather than a lone number, and that is what makes the parse safe on prose like
 * *"2 metres tall at 48 px per metre"* — three numbers, no size among them. `×`, `x` and `*` are all
 * accepted because all three are typed for the same thing, and the first match wins so a trailing
 * *"at 48 px per metre"* cannot overrule the size it follows.
 */
export function parseTargetSize(text: string): TargetSize | null {
  const match = /(\d{1,5})\s*[×x*]\s*(\d{1,5})/iu.exec(text);
  if (match === null) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  // A capture that matched is always a run of digits, so this rejects only the degenerate `0 × 0`.
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return null;
  return { width, height };
}
