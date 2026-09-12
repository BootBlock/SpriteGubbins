/**
 * The twelve feelings a portrait deliverable carries, which is the one fact both PORTRAIT sheets
 * state.
 *
 * **Written down once because two plans read it** (issue #292). The expression library draws one
 * whole portrait per feeling and counts them in its own contract; the feature cut draws the pieces
 * instead and its outro names the faces those pieces have to reach. The list lived in
 * `sheetPlans/portrait.ts` while that was the only sheet, and the second sheet is what makes it a
 * fact two places state — so it moved here in the same change rather than being typed out again. A
 * feeling added to the library and not to the cut would leave the two sheets of one deliverable
 * disagreeing about what a dialogue system gets, in the sentence each tells a reader to check its
 * delivery against.
 *
 * **Three fields rather than one, because the two sheets need the feeling in two registers.** The
 * library needs an inventory line and a sprite-pack name; the cut needs the feeling as a noun phrase
 * inside a sentence. Deriving either from the other would put it at the mercy of a wording —
 * `Pleased or smiling ×1` does not yield `a pleased one` by any rule, and `resting-portrait` is a
 * file name rather than a word for a face.
 */
export interface PortraitFeeling {
  /** What the expression library's component is called outside the prompt — see `ComponentEntry.label`. */
  readonly label: string;
  /** The expression library's inventory line, which draws this feeling as a whole portrait. */
  readonly text: string;
  /** The feeling as a face, for the sentence the feature cut's outro names them all in. */
  readonly face: string;
}

export const PORTRAIT_FEELINGS: readonly PortraitFeeling[] = [
  {
    label: 'resting-portrait',
    text: 'Resting portrait ×1 — neutral, level gaze, the reference for every expression below',
    face: 'a resting face',
  },
  { label: 'pleased', text: 'Pleased or smiling ×1', face: 'a pleased one' },
  { label: 'laughing', text: 'Laughing or delighted ×1', face: 'a laughing one' },
  { label: 'angry', text: 'Angry ×1', face: 'an angry one' },
  { label: 'sad', text: 'Sad or downcast ×1', face: 'a sad one' },
  { label: 'surprised', text: 'Surprised ×1', face: 'a surprised one' },
  { label: 'afraid', text: 'Afraid ×1', face: 'an afraid one' },
  { label: 'disgusted', text: 'Disgusted ×1', face: 'a disgusted one' },
  { label: 'thoughtful', text: 'Thoughtful or uncertain ×1', face: 'a thoughtful one' },
  { label: 'determined', text: 'Determined or resolved ×1', face: 'a determined one' },
  { label: 'hurt', text: 'Hurt or exhausted ×1', face: 'a hurt one' },
  { label: 'suspicious', text: 'Suspicious or narrowed ×1', face: 'a suspicious one' },
];
