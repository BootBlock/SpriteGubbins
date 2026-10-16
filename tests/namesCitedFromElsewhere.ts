/**
 * The code-shaped names comments cite on purpose that nothing `comment-name-citations.test.ts` reads
 * declares, each with the reason it is cited.
 *
 * An entry is a claim that the name is *meant* to resolve nowhere this repository can see, so it is
 * a name from outside the project — a file format, another program, a document — a name the code
 * retired and a comment records as history, a name a comment argues against creating, or notation
 * that merely looks like code. A name that should resolve and does not is stale, and belongs in a fix
 * rather than here. The suite fails for an entry nothing still needs, so this list cannot outlive
 * the citations it excuses.
 */
export const NAMES_CITED_FROM_ELSEWHERE: Readonly<Record<string, string>> = {
  // Fields and types of file formats and specifications.
  WORD: 'The Aseprite file format’s unsigned 16-bit field type.',
  DWORD: 'The Aseprite file format’s unsigned 32-bit field type.',
  LEN: 'A DEFLATE stored block’s length field, RFC 1951.',
  NLEN: 'A DEFLATE stored block’s complemented length field, RFC 1951.',
  ButtonFace: 'A CSS system colour keyword.',
  GrayText: 'A CSS system colour keyword.',
  LinkText: 'A CSS system colour keyword.',
  VisitedText: 'A CSS system colour keyword.',
  ActiveText: 'A CSS system colour keyword.',

  // Names in other programs' code, documentation and APIs.
  lit_bufsize: 'zlib’s internal literal buffer size.',
  oklab_to_linear_srgb: 'The function in Björn Ottosson’s published OKLab reference code.',
  outline_expansion: 'PixelOE’s function this pass reimplements.',
  image_generation: 'The tool the OpenAI Responses API draws images with.',
  revised_prompt: 'OpenAI’s response field for a prompt its image model rewrote.',
  denoise_cfg: 'A function in the FLUX.2 reference implementation.',
  Mistral3SmallEmbedder: 'The text encoder FLUX.2 [dev] loads.',
  Qwen3Embedder: 'The text encoder every FLUX.2 [klein] model loads.',
  messageSkipWaiting: 'workbox-window’s method, a transitive dependency.',
  emitFile: 'The bundler plugin API’s method, declared by a transitive dependency.',
  devEngines: 'npm’s newer `package.json` field, which the comment explains the project does not declare.',
  packageManager: 'A member of that `devEngines` field.',
  ACM: 'Git’s `--diff-filter` status letters, as the allow-list the scan used to keep.',
  Skeleton2D: 'A Godot node class.',
  Bone2D: 'A Godot node class.',
  CanvasModulate: 'A Godot node class.',
  Light2D: 'A Godot node class.',
  GEAR_SLOTS: 'Unsung Saviour’s constant, in the game’s own repository.',
  GOOGLE_IMAGEN: 'A section heading in `docs/todo/baseline-prompt-new.md`.',

  // Retired names a comment records as history.
  FULL_DIRECTIONAL_POSE_LIBRARY: 'The v1 sheet type deleted for asking for 111 components.',
  HIGH_RESOLUTION_PIXEL_ART: 'The v1 render-style identifier the prompt used to print raw.',
  EMIT_MANIFEST: 'A flag the baseline prompt document records renaming.',
  TILE_VOCABULARY: 'The test constant renamed when tiling stopped being the distinguishing property.',
  seriesComponentCount: 'The deleted count the component set used to keep.',
  ESTIMATED: 'The one kind the three estimated readings were pooled under before they were named apart.',
  FieldGroup: 'The deleted component whose legend the collapsible section replaced.',
  SCALE_EXAMPLE_TEXT: 'The per-category record a precache raise moved to the sheet plans.',
  scaleUnitFrame: 'A sheet plan field named in a precache raise’s record of what it measured.',
  drawsClothing: 'An inventory field named in a precache raise’s record of what it measured.',

  // Names a comment argues against creating.
  replaceProjects: 'The backend method the comment explains is not needed.',
  PROJECTION_CHOICES: 'The exported list the comment explains would be a second source of truth.',
  RIG_MODE_CHOICES: 'The exported list the comment explains would be a second source of truth.',
  supportsComponentMap: 'The predicate name the comment explains would mislead.',
  ASSEMBLY_DESCRIPTION: 'A token the test explains a looser lookup would wrongly accept.',
  POSING_DESCRIPTION: 'A token the test explains a looser lookup would wrongly accept.',
  TARGET_QUANTITY_DESCRIPTION: 'A token the test explains a looser lookup would wrongly accept.',

  // Notation that looks like code.
  FOO_TEXT: 'A placeholder for the family of per-token text maps.',
  FOO_DESCRIPTION: 'A placeholder for the family of description tokens.',
  HERB: 'An example word that takes “an”, in the explanation of the article rule.',
  snake_case: 'The name of a naming convention.',
  _italics_: 'The guidance markup’s italic syntax.',
  sqlite_: 'The prefix SQLite reserves for its own tables.',
  EXAMPLE_: 'A variable-name prefix the secret scan explains it treats as a placeholder.',
};
