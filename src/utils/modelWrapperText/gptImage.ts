/**
 * GPT Image's directive prefix — the one DALL·E 3 carried, kept because the behaviour that
 * justified it is still documented on the path this app's users are on. OpenAI's Images API does not
 * describe a rewrite for `gpt-image-2`, but image generation through the Responses API does: "the
 * mainline model … will automatically revise your prompt for improved performance", surfaced back as
 * `revised_prompt`. Pasting into ChatGPT is that path, so terse absolute phrasing still has
 * something to survive — which is also part of why section 0 sits at the top of the template.
 */
export function wrapForGptImage(prompt: string): string {
  return `[DIRECTIVE: Reproduce the specification below exactly. Do not restyle, simplify or reinterpret it.]\n\n${prompt}`;
}
