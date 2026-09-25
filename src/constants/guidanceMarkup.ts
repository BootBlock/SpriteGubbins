/**
 * What separates two paragraphs of a guidance card: a blank line, as in Markdown.
 *
 * A card composed at a call site from a control’s own guidance and a note about its present state
 * joins the two with this, so the note reads as a paragraph of its own rather than as a run-on.
 */
export const GUIDANCE_PARAGRAPH_BREAK = '\n\n';

/** What opens each line of a bulleted list in a guidance card. */
export const GUIDANCE_LIST_MARKER = '- ';
