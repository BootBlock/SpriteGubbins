import { NATIVE_GRID_HEADING } from '../../constants/promptTemplate.ts';
import { citeSection } from '../templateEngine.ts';
import type { SectionNumbers } from '../templateEngine.ts';

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
 * **The must-carry list is the whole of what this wrapper does, and it is known to work on the call
 * it names.** A
 * sheet generated on chatgpt.com was traced back to the arguments Sol actually passed to the image
 * tool, and they were Sol's own ~700-word composition rather than the ~40,000-character
 * specification it was given. The three things this wrapper names all arrived intact — the exact
 * component count, the key colour and the ban on text and shadows from section 0; all five object
 * yaws *with their degrees*, the fixed camera and the subject's-left rule from section 3; the
 * inventory in reading order with its named terminations from section 4. **What went missing was
 * section 2's native-grid block, which this wrapper did not name**, and the sheet came back with no
 * native pixel grid in it at all. That is as close to a controlled result as this can get: same run,
 * four blocks of the same specification, and the one omission is the one that failed.
 *
 * **Adding the block to the list was then confirmed to reach the image call, by asking Sol to compose
 * its hand-off without rendering.** Both sentences that had been lost came back — "each logical native
 * pixel must appear as one solid square block of identical delivered pixels" and "no feature, contour,
 * marking, material detail, or colour boundary may be finer than one native pixel" — along with the
 * self-audit's check that every colour boundary falls on that grid, and an unprompted clarification
 * that the stated size is not the delivered size of a severed component. So the mechanism is
 * established in both directions **at the hand-off**: what this list names survives the composition,
 * and what it does not name does not.
 *
 * **It is not established at the sheet, and three sheets say the naming did not reach one.** The
 * paragraph above used to end "the mechanism is established in both directions" with nothing scoping
 * it, which reads as a claim about what comes back — and it was a *composition* test, which read the
 * arguments Sol wrote rather than the image a GPT Image model drew from them. Three GPT-5.6 Sol runs
 * of a BUILDING scenario whose directive named this block by heading all miss the grid. Section 2
 * asked those runs for a 16 × 24 native grid delivered 5× or more by a whole number, so a component
 * 16 native pixels wide permits at most 15 interior colour transitions; counting strong transitions
 * along every row through the middle 60% of a representative panel gives a median of 69 and a maximum
 * of 116 on run A, 41 and 60 on run B, and 41 and 73 on run C. Resampling on the way out of a
 * generator removes transitions and never adds them, so each count is a floor on what the art
 * carried. **Three to five times the ceiling on the median, and up to eight times on the worst row.**
 * Issue #247 holds the figures.
 *
 * **Where those three sheets lost it is not known, and this file may not guess.** All three of that
 * scenario's interrogations failed — a false denial, a caption, and an `Edit Image A…` call for a
 * render that never happened — so no run returned a hand-off and none of the three losses can be
 * attributed to the composition or to the render. That is the pack's own rule for a scenario with no
 * readable first composition, and it is worth stating here because this file's whole subject is the
 * call. What the one hypothetical transcript does show is not encouraging: it carries neither the
 * grid nor the whole-number multiple, only "crisp enlarged pixels, no antialiasing" — the same
 * compression, in a run whose directive named the block by heading.
 *
 * **The entry stays, and nothing else here changes, because neither remaining lever has anything
 * behind it either.** Naming the block costs one line, is the whole of what this wrapper can do, and
 * the composition test that put it there is sound on its own terms — issue #247 says outright not to
 * remove it on this evidence. The block's own wording already carries both operative sentences. And
 * the self-audit's check that every colour boundary falls on the grid was in all three of those
 * prompts: that check is addressed to **Sol**, which is the model that reads this specification and
 * decides what to deliver, so it was read and the sheets went out anyway. Whether the renderer ever
 * saw it is the same unknown as everything else above. **What this file may not do is describe a
 * hand-off result as a sheet result**, which is the error the correction removes.
 *
 * **The same answer settles what the compression was.** That restatement is roughly twice the length
 * of the one the failing run produced, from the same specification, so Sol was not up against a limit
 * when it wrote the shorter one — it was choosing what to keep. That is the whole premise of naming
 * blocks rather than asking for less prose, and it is why a future pass should add to this list rather
 * than try to buy room for it.
 *
 * **Two things Sol reported are not built on, and the reason is the same for both.** It described the
 * hand-off differently on the two occasions — once as a prompt string passed to the tool, once as a
 * deprecated parameter that must be null, with the renderer reading conversation context instead — and
 * it named tool parameters no OpenAI page this file cites documents. Both accounts leave the operative
 * fact untouched, which is that Sol composes a restatement and the renderer works from that; the
 * wrapper is worded against that fact alone. A self-report that contradicts an earlier self-report is
 * not the vendor documentation this file's claims are held to, so nothing here describes a parameter,
 * a schema or a length.
 *
 * **What a paraphrase drops is the measurement, not the idea**, which is why the addition names the
 * block rather than trusting a general instruction to preserve meaning. Sol carried the native
 * grid's *concept* faithfully — "enlarged by a whole-number multiple (at least 7x)", "crisp
 * nearest-neighbour blocky pixels" — and dropped both sentences a finished sheet could be checked
 * against: that each native pixel becomes a solid square block of identical delivered pixels, and
 * that nothing on a component may be finer than one native pixel. A rule with the figure taken out
 * of it reads as satisfied by anything.
 *
 * **The palette is named on the same evidence and the hardware profile is not**, and the difference
 * is worth recording because it is the line between a measurement and an inference. The same run
 * compressed section 2's colour *budget* into "Use a restrained 32-64 colour palette total" — so a
 * shortened rendering of section 2's colour material is observed, and a pinned palette survives one
 * no better than the grid did. The target hardware block states figures too and would presumably go
 * the same way, but that sheet pinned no hardware profile, so nothing about it was measured. Naming
 * it here would be the symmetry this file is not allowed to argue from. A run that pins one and
 * loses its limits is what would earn it a place.
 *
 * **The palette entry names the block and not its contents, because a palette states its colours two
 * different ways.** `PaletteSpace` is a union: a `FIXED` palette emits a list of hex entries, and a
 * `CHANNEL_DEPTH` one emits a ladder instead — "red, green and blue each take one of 32 levels — 0,
 * 8, 16, … 255" — because the alternative is a prompt carrying 32,768 entries. Ten of the nineteen
 * pinned palettes are that second kind, so an entry reading *the palette's exact colours* would, on
 * more than half of them, point at a list section 2 does not carry. That is precisely the fault the
 * gating below exists to prevent, arrived at from the other direction: not naming a block that is
 * absent, but naming the wrong thing inside one that is present. Every figure in either form is
 * worth the same protection, so the entry protects the block's values rather than describing their
 * shape.
 *
 * **The sections are cited by name, never by numeral.** This wrapper runs on the rendered prompt,
 * after the `[SEC:…]` markers have been resolved away, so for a while it wrote all four of its
 * citations out by hand — `section 0`, `section 2`, `section 3` and `section 4`. The numbers were
 * right, and nothing held them there: a section inserted before the inventory re-points every
 * citation in the prompt body and leaves these four behind, in the wrapper whose whole job is naming
 * the blocks that may not be shortened. `sections` comes from `sectionNumbers`, the walk
 * `applySectionNumbers` numbers the headings by, so the two move together — see `citeSection` for
 * what that does and does not reach.
 *
 * **`nativeGrid` and `palette` are passed rather than worked out here**, for the reason every other
 * wrapper's arguments are: this file holds text and knows nothing about render styles, resolution
 * profiles or palettes. Both are the compiler's own gate answers — the same two values that decide
 * whether the blocks are in the prompt at all — so the directive cannot name a block that is not
 * there, which would read as an instruction and be a fault. They are positional booleans because
 * that is what this directory already does with a conditional flag; `wrapForMidjourney` takes
 * `frameIsAComponent` the same way.
 *
 * **Everything else this wrapper used to say is gone.** It previously opened "High reasoning effort"
 * and then pointed at section 0 as a done-condition and section 9 as a verification pass. Reasoning
 * effort is a request parameter rather than something prose sets, and the two pointers restate
 * headings the template already carries — section 0 is titled NON-NEGOTIABLE OUTPUT CONTRACT and
 * opens "Satisfy this section before any aesthetic consideration", and section 9 opens "Before
 * delivering, verify". OpenAI's own guidance for this model family is that such lines are not free:
 * it says to remove "repeated statements of the same rule" and "process instructions for behavior
 * the model already performs reliably", and warns that "GPT-5-class models follow prompt contracts
 * closely, so conflicting rules can create more instability than missing detail". A target-specific
 * wrapper that repeats the template is therefore a cost here, not a reinforcement. **Naming a block
 * is not repeating it** — the addition below quotes no rule, it says which rules may not be
 * shortened.
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
export function wrapForSol(
  prompt: string,
  nativeGrid: boolean,
  palette: boolean,
  sections: SectionNumbers,
): string {
  // A list rather than a clause, because the entries are conditional and their combined length is
  // not knowable here: spliced into a sentence they push one line to half again the width of every
  // other line in the directive, and the line breaks in this file are the breaks the model reads.
  const blocks = [
    nativeGrid ? `- the block headed “${NATIVE_GRID_HEADING}”` : '',
    palette ? '- every value in the palette block' : '',
  ].filter((block) => block !== '');

  // Nothing at all where neither block was emitted, rather than a sentence about section 2 that
  // names none of it — which is the studio's own opening configuration, whose `HIGH_RESOLUTION`
  // profile states its own scale and so has no native grid to enlarge.
  const sectionTwo =
    blocks.length === 0
      ? ''
      : `

Section ${citeSection(sections, 'STYLE')} states figures as well, and they are protected in the same way. Shorten nothing in:

${blocks.join('\n')}

A figure is what the delivered sheet can be held to. Restating one of these in your own words keeps
the idea and drops the figure, which leaves the image nothing to be measured against.`;

  return `[DIRECTIVE — HAND-OFF TO THE IMAGE TOOL]
You are not the model that draws this sheet: you will call an image tool, and a GPT Image model
renders whatever that call carries. So the call is where a sheet loses its component count, its
background or its per-component directions. Whatever you send must still carry section ${citeSection(sections, 'CONTRACT')}, the object
yaws in section ${citeSection(sections, 'CAMERA')} and the inventory in section ${citeSection(sections, 'INVENTORY')} as they are written here. If it has to be
shortened, shorten the prose elsewhere — never those three.${sectionTwo}

${prompt}`;
}
