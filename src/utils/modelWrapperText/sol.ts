/**
 * ChatGPT 5.6 Sol, which is the one target here that **cannot draw**.
 *
 * Its model page lists `text` as its only output modality and `image_generation` among its *tools*,
 * and OpenAI's tool guide names what is on the far side of that boundary: "The model used for the
 * image generation process is always a GPT Image model, including `gpt-image-2`, `gpt-image-1.5`,
 * `gpt-image-1`, and `gpt-image-1-mini`", with "the tool handles GPT Image model selection". So the
 * specification this app composes is never what gets rendered on this target. Something else is,
 * carried there by a call Sol makes — and that hand-off is the obvious candidate for adherence that
 * varies run to run on a prompt nothing else about the target explains.
 *
 * **What travels across that hand-off is documented for the API and not for chatgpt.com, and this
 * wrapper is worded to be true either way.** The Responses API states outright that "the mainline
 * model … will automatically revise your prompt for improved performance", handed back as
 * `revised_prompt`. No OpenAI page states whether ChatGPT's own image surface does the same — which
 * matters, because pasting into ChatGPT is the path this app's users are actually on. An earlier
 * draft of this wrapper asserted the rewrite to them as fact; that was the API's documented
 * behaviour attributed to a surface it was not documented for, which is the error the Seedream entry
 * already records in the other direction. The instruction now names only the hand-off itself,
 * which is certain on both paths, and says what any call must still carry.
 *
 * **That is the whole wrapper, and everything else it used to say is now gone.** It previously
 * opened "High reasoning effort" and then pointed at section 0 as a done-condition and section 9 as
 * a verification pass. Reasoning effort is a request parameter rather than something prose sets, and
 * the two pointers restate headings the template already carries — section 0 is titled NON-NEGOTIABLE
 * OUTPUT CONTRACT and opens "Satisfy this section before any aesthetic consideration", and section 9
 * opens "Before delivering, verify". OpenAI's own guidance for this model family is that such lines
 * are not free: it says to remove "repeated statements of the same rule" and "process instructions
 * for behavior the model already performs reliably", and warns that "GPT-5-class models follow
 * prompt contracts closely, so conflicting rules can create more instability than missing detail".
 * A target-specific wrapper that repeats the template is therefore a cost here, not a reinforcement.
 *
 * **The measurement behind that is quoted with its scope, because the scope is load-bearing.** The
 * sentence is "*In a sample of internal coding-agent eval runs*, configurations with leaner system
 * prompts improved evaluation scores by roughly 10–15% while reducing total tokens by 41–66% and
 * cost by 33–67%" — coding agents, not image briefs. Dropping the qualifier would turn a bounded
 * finding into a licence.
 *
 * **And the licence it would have granted is one OpenAI's *image* guidance withholds outright.** For
 * an image prompt they say "**Repeat any requirement that must stay fixed**" — the exact opposite
 * instruction, for the exact repetition it was tempting to cut. There is no contradiction, because
 * the two are addressed to two different readers: the lean guidance to the model *reading this
 * specification*, and the repetition guidance to the model *rendering from it*. That is what settles
 * the question this file was left holding open — the exclusions restate section 0's on
 * purpose, and they stay. A future pass that cuts them citing the GPT-5.6 guidance would be applying
 * a text model's rules to the image model's half of the hand-off.
 *
 * The same guidance is why the self-audit stays: "Render the artifact before finalizing. Inspect
 * layout, clipping, spacing, missing content, and visual consistency" is what that section asks for,
 * and a verification pass is not a repeated statement of a rule.
 *
 * Sources: [model page](https://developers.openai.com/api/docs/models/gpt-5.6-sol),
 * [image generation tool](https://developers.openai.com/api/docs/guides/tools-image-generation),
 * [image generation guide](https://developers.openai.com/api/docs/guides/image-generation),
 * [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6),
 * [ChatGPT image prompting](https://learn.chatgpt.com/docs/image-generation).
 */
export function wrapForSol(prompt: string): string {
  return `[DIRECTIVE — HAND-OFF TO THE IMAGE TOOL]
You are not the model that draws this sheet: you will call an image tool, and a GPT Image model
renders whatever that call carries. So the call is where a sheet loses its component count, its
background or its per-component directions. Whatever you send must still carry section 0, the object
yaws in section 3 and the inventory in section 4 as they are written here. If it has to be
shortened, shorten the prose elsewhere — never those three.

${prompt}`;
}
