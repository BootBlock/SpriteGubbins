import type { TargetModel } from '../types/output.ts';

/**
 * The generators a prompt can be written for, in selector order.
 *
 * Each entry pairs with a branch in `utils/promptCompiler.ts` that actually wraps the prompt —
 * a reasoning contract, CLI flags, a negative-prompt block or a directive prefix. Adding a
 * model here without adding its branch there offers the user a model whose output is silently
 * unwrapped, which is the half-applied edit this pairing is most prone to.
 */
export const TARGET_MODELS: readonly TargetModel[] = [
  {
    id: 'GENERIC',
    name: 'Generic / Baseline Prompt',
    tooltip:
      'Standard un-wrapped prompt suitable for ChatGPT, Claude 3.5 Sonnet, DeepSeek, or general LLM text-to-image workflows.',
  },
  {
    id: 'CHATGPT_5_6_SOL',
    name: 'ChatGPT 5.6 Sol (OpenAI)',
    tooltip:
      'Optimized specifically for OpenAI ChatGPT 5.6 Sol. Enforces high-reasoning context parameters, explicit done-conditions, structured output contracts, and zero-hallucination non-ambiguous visual rules.',
  },
  {
    id: 'MIDJOURNEY',
    name: 'Midjourney v6.1',
    tooltip:
      'Appends Midjourney flags (--ar, --v 6.1, --style raw, --sw 250, --no background text labels shadows) to enforce crisp pixel separation.',
  },
  {
    id: 'STABLE_DIFFUSION',
    name: 'Stable Diffusion / Flux',
    tooltip:
      'Formats output with clean positive directives and appends a detailed Negative Prompt block targeting deformities, floor shadows, and soft gradients.',
  },
  {
    id: 'GOOGLE_IMAGEN_3',
    name: 'Google Imagen 3',
    tooltip:
      'Tailors output into a clean natural language visual style description with explicit camera perspective and crisp subject priority.',
  },
  {
    id: 'DALLE_3',
    name: 'DALL-E 3 (OpenAI)',
    tooltip:
      'Adds a high-priority system directive prefix demanding strict pixel-art fidelity and zero vector smoothing.',
  },
];
