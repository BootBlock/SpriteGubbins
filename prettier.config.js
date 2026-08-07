// Prettier config, kept byte-identical to the sibling Gubbins project so a contributor
// moving between the two never re-learns the house style: single-quote, semi, 2-space,
// ~110-col lines. Prettier never adds or removes braces, so the braceless-if house style
// is enforced by ESLint's `curly` rule, not here.
/** @type {import('prettier').Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 110,
  tabWidth: 2,
  arrowParens: 'always',
};
