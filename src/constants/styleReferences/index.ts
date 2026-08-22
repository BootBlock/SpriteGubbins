/**
 * The style-reference library's public surface.
 *
 * Three files rather than one, and the split is what keeps the graph acyclic: `library.ts` holds the
 * map and the lookup, `styleReferenceChoices.ts` holds the labels and the category scoping, and this
 * barrel is what the app imports. The choices module needs the map, and the module that decides
 * which references a category can be drawn to match needs the lookup — so neither may reach them
 * through a barrel that also re-exports it.
 */
export { STYLE_REFERENCES, styleReferenceFor } from './library.ts';
// The dropdown's options are scoped to the category, because which references a subject can be drawn
// to match depends on the camera each one was rendered under — see `categoryStyleReferences.ts`.
export { styleReferenceChoices } from './styleReferenceChoices.ts';
