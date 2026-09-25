/**
 * A run of text inside one block of a guidance card.
 *
 * `code` is literal: nothing inside it is read as markup, which is what lets a card name an option
 * such as `HIGH_RESOLUTION` without its underscores being taken for emphasis.
 */
export type GuidanceInline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly children: readonly GuidanceInline[] }
  | { readonly kind: 'emphasis'; readonly children: readonly GuidanceInline[] };

/** One block of a guidance card: a paragraph, or a bulleted list whose items are each one run. */
export type GuidanceBlock =
  | { readonly kind: 'paragraph'; readonly children: readonly GuidanceInline[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly GuidanceInline[])[] };
