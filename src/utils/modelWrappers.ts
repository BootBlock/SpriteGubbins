import type { AspectRatio, TargetModelId } from '../types/output.ts';

/**
 * Per-generator wrapping of the compiled prompt.
 *
 * Every model in `TARGET_MODELS` has a branch here. They differ in kind, not just wording: Sol
 * gets a reasoning contract wrapped *around* the prompt, Midjourney gets CLI flags appended,
 * Stable Diffusion a negative-prompt block, Imagen and DALL-E a directive prefix, and Generic
 * gets the prompt untouched.
 */

/** Midjourney's aspect flag for each sheet format. */
const ASPECT_FLAGS: Readonly<Record<AspectRatio, string>> = {
  WIDE_16_9: '--ar 16:9',
  TALL_9_16: '--ar 9:16',
  ULTRAWIDE_21_9: '--ar 21:9',
  SQUARE_1_1: '--ar 1:1',
};

export function aspectFlag(aspectRatio: AspectRatio): string {
  return ASPECT_FLAGS[aspectRatio];
}

/**
 * ChatGPT 5.6 Sol: a task-execution contract before the prompt and a verification checklist
 * after it. The component count appears in both halves deliberately — once as the done-condition
 * and once as something the model is asked to check before delivering.
 */
function wrapForSol(prompt: string, componentCount: string): string {
  return `[SYSTEM DIRECTIVE: CHATGPT 5.6 SOL REASONING & STRUCTURED SPECIFICATION ENFORCEMENT]
Task Execution Contract:
1. High Reasoning Effort: Process multi-component bounding box alignment across isolated component grid slots.
2. Strict Done-Condition: Generate EXACTLY ${componentCount}. Do not combine limbs or substitute pre-assembled character sprites.
3. Output Integrity: Solid pure-white background (#FFFFFF) with zero floor shadows, drop shadows, background tiles, or text labels.
4. Scale & Density Contract: 100% native pixel density across all sprite components. No smooth vector anti-aliasing.

---

${prompt}

---
[VERIFICATION CONTRACT FOR CHATGPT 5.6 SOL]
Verify before delivery:
- Are all ${componentCount} parts rendered in clean grid layout?
- Is background pure #FFFFFF with zero shadows or text?
- Are limb segments drawn as separate rigid pieces around shared pivots?`;
}

/**
 * Apply the target model's wrapper to a compiled prompt.
 *
 * `GENERIC` deliberately has no branch — it returns the prompt unchanged, which is what makes it
 * usable with any model the app doesn't know about.
 */
export function wrapForModel(
  prompt: string,
  target: TargetModelId,
  options: { readonly componentCount: string; readonly aspectRatio: AspectRatio },
): string {
  switch (target) {
    case 'CHATGPT_5_6_SOL':
      return wrapForSol(prompt, options.componentCount);

    case 'MIDJOURNEY':
      return `${prompt}\n\n${aspectFlag(options.aspectRatio)} --v 6.1 --style raw --sw 250 --no background shadows text labels grid frame`;

    case 'STABLE_DIFFUSION':
      return `${prompt}\n\nNegative Prompt: (deformed hands, merged limbs, blurred pixels, background texture, floor shadow, smooth vector art, 3d render, text, watermark, signature:1.4)`;

    case 'GOOGLE_IMAGEN_3':
      return `[IMAGEN 3 DESCRIPTIVE VISUAL SPECIFICATION - STRICT SPRITE SHEET LAYOUT]\nClear orthographic 3/4 top-down view, pixel art modular sprite components exploded sheet layout. Solid white background, zero floor shadow. High visual contrast, clean pixel edges.\n\n${prompt}`;

    case 'DALLE_3':
      return `[DALL-E 3 DIRECTIVE: STRICT PIXEL ART SPRITE SHEET - ZERO SMOOTHING OR VECTOR BLEND]\n\n${prompt}`;

    case 'GENERIC':
      return prompt;
  }
}
