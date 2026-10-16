/**
 * The words Midjourney's `--no` negates as `frame, border`, in every form an entry can use them.
 *
 * `--no` reads an entry word by word (`wrapForMidjourney`), so a sheet whose own entries name a frame or
 * a border in any of these forms is a sheet that term would strip of something it asks for.
 */
const FRAME_WORD = /\b(?:frames?|framed|framing|borders?|bordered)\b/i;

/**
 * Whether this text names a frame or a border — which makes it a component of the sheet that draws it
 * rather than the decorative surround `FRAME_IS_A_COMPONENT` and `SheetPlan.frames` let a wrapper negate.
 */
export function namesAFrame(text: string): boolean {
  return FRAME_WORD.test(text);
}
