import { NONE_LEAVES_SETTINGS_ALONE } from '../guidanceSentences.ts';
import { shareRange } from '../promptText/renderStyle.ts';
import { PALETTE_COLOR_COUNTS } from '../quantiser.ts';

/**
 * Guidance shown against each control, keyed to the control it explains.
 *
 * Each entry says three things in order: what the setting *is*, what it changes about the compiled
 * prompt, and how to choose — naming real options rather than describing them in the abstract. The
 * identifiers quoted here are the ones `constants/output/choices.ts` offers, so a reader can match
 * the advice to the list in front of them. Each card is card markup (`GuidanceMarkup`), so an option
 * identifier sits in backticks.
 */
export const OUTPUT_TOOLTIPS = {
  category:
    'The kind of thing being described. It swaps the whole field vocabulary and the option pools behind it: the first field is “Species / Archetype” for a character and “Structure Type” for a building.\n\n' +
    'Switching resets the subject to that category’s defaults and re-resolves any setting the new category cannot honour. The switch is recorded in the history above the panel, so it is one Undo away from being put back. Choose it before filling anything else in.',

  sheetIndex:
    'Which part of this deliverable’s inventory the prompt below draws. Some sheet contents ask for more components than one generation returns, so the inventory splits: a standard character’s trunk views are one part (two on `EIGHT_COMPASS`) and its limbs another, and a winged, four-armed or taur body’s limbs take two.\n\n' +
    'This list counts parts, not generations, so it is often shorter than the “Sheet N of M” beside the prompt: a part drawn one facing at a time is generated once per direction you asked for.\n\n' +
    'Work through them in the order the preview steps, and set the identity lock from the first sheet you accept so the rest depict the same individual. “Split into sheets” lays the whole batch out in one place.',
  // The option accounts are in `directionalModeTooltips.ts`, read out under the control for the mode
  // actually chosen: what a *setting* is reads the same whatever is selected, and what an *option*
  // is does not, so the two belong on different surfaces.
  directionalMode:
    'What the sheet has to deliver, and so how many components the prompt asks for. The list holds only what the category and its assembly base can produce, and the account of the option you choose is read out under the control.\n\n' +
    'The figures beside each option are the whole job over the chosen directions: every component, and every generation it takes to draw them, the same batch “Split into sheets” lays out. Each sheet’s own prompt asks for the smaller figure.',
  surfaceDetail:
    'How much internal seam, panel and fold detail the prompt asks for on each component, within the palette limit.\n\n' +
    '- `MINIMAL` keeps base colours and essential joints, which a small sprite needs before detail turns to noise.\n' +
    '- `CLEAN_PRODUCTION` is the usual choice.\n' +
    '- `TEXTURED` is for large pieces that will be seen close up.',
  resolutionProfile:
    'The scale the sheet is drawn at, given as a share of the sheet’s own component grid rather than in pixels, so it holds whatever canvas the generator returns. It is independent of render style.\n\n' +
    `The largest component fills ${shareRange('HIGH_RESOLUTION')} of its cell height at high resolution and ${shareRange('MID_RESOLUTION')} at mid, and every other component is drawn to that scale, so a hand stays smaller than its torso. Each sheet fills its own grid, so a sheet of twelve components draws them larger than a sheet of thirty-four.\n\n` +
    '- `RETRO_16_BIT` states a height in pixels instead.\n' +
    '- `CUSTOM` is for an exact component size, or for pieces on different sheets that must come out at one size. State the size in Target Component Size.',
  // The figures are the quantiser's, not the prompt's: the prompt states a range, value bands or no
  // budget at all, and the tab reduces to one fixed count per budget, so they are read from the table
  // that tab reads rather than typed out.
  paletteLimit:
    'The total colour budget across the whole sheet, which keeps every component looking like one set. The prompt states it, but **do not expect the returned sheet to be inside it**: a generated image usually arrives carrying tens or hundreds of thousands of colours.\n\n' +
    `The Quantise tab is where the budget comes true. It reduces a returned sheet to ${String(PALETTE_COLOR_COUNTS.STRICT_32_COLOR)} colours chosen from that sheet under \`STRICT_32_COLOR\`, ${String(PALETTE_COLOR_COUNTS.RESTRAINED_64_COLOR)} under \`RESTRAINED_64_COLOR\` and ${String(PALETTE_COLOR_COUNTS.EXPANDED_ALBEDO)} under \`EXPANDED_ALBEDO\`, and leaves an \`UNRESTRICTED\` sheet’s colours as they arrived.\n\n` +
    '`STRICT_32_COLOR` and `RESTRAINED_64_COLOR` suit pixel work. Painted, cel-shaded and 3D styles usually want `UNRESTRICTED`, because a hard colour count fights the blending they depend on.',
  outlineStyle:
    'How a component’s boundary is drawn where it meets the background.\n\n' +
    '- `DARK_LOCAL_CONTOUR`, a 1px darker shade of each local colour, keeps parts separable without flattening them.\n' +
    '- `PURE_BLACK_OUTLINE` gives the harder retro read.\n' +
    '- `OUTLINE_LESS_ALBEDO` relies on value and hue contrast alone, which needs a busy scene to sit against.\n\n' +
    'Below about 32 px a 1px contour takes a serious share of the pixels, so the darker local shade or no outline usually reads better than pure black. On a `PURE_BLACK` background the black outline is asked for as a very dark grey, so it is not keyed out with the field.',
  lightingModel:
    'The key light angle and shadow treatment baked into the sprite. `FLAT_NEUTRAL_ALBEDO` is what a game engine wants, because the engine lights the sprite itself and a baked highlight would fight its own.\n\n' +
    'Choose a fixed key only when the scene lighting is fixed too, as it is in a locked isometric view.',
  aspectRatio:
    'The shape of the sheet canvas, passed to the generator so it lays the component grid out inside the frame instead of cropping it.\n\n' +
    '- `WIDE_16_9` fits the usual wide grid.\n' +
    '- `TALL_9_16` suits one tall figure with its variants stacked.\n' +
    '- `SQUARE_1_1` is the safest choice on targets that quietly re-frame anything else.',
  componentBudget:
    'The most components you want one generation asked for. Around forty is what current models deliver before they start merging or dropping pieces. Set `0` for no cap.\n\n' +
    'Going over it is reported against this sheet, and on each row of the split drawer where a batch’s sheets differ in weight. It never changes the prompt: the sheet is not trimmed behind your back.',
  targetModel:
    'Which generator the prompt is written for. It changes the shape of the output as well as its wording: a reasoning contract, command-line flags, a separate negative-prompt block or a directive prefix are added or dropped to match what the target reads.\n\n' +
    'Set it before copying, because the same configuration compiles differently for each target.',

  hardwareProfile:
    'The machine the sheet is drawn for. Choosing one is a template: it sets the render style, surface detail, component size, outline, lighting and palette to what that machine’s artwork looked like, and each stays yours to change afterwards.\n\n' +
    'The prompt then carries the machine’s geometry — its display, tile grid, sprite sizes and how many it could show — because naming a real machine steers a generator further than those figures alone. Colour belongs to the Palette field, so the two can be set independently.\n\n' +
    NONE_LEAVES_SETTINGS_ALONE,
  palette:
    'The exact colours the sheet may use. It is more specific than the colour budget and supersedes it: a budget can say “32 to 64 colours”, and only a palette can say “these four shades of green”.\n\n' +
    'A short list is written into the prompt, less any entry the background key would take with it. A generator keeps to it no better than to a budget, so the Quantise tab is what makes it true, mapping a returned sheet onto the pinned colours or the machine’s levels per channel.\n\n' +
    '- `FREE` leaves colour to the budget, which is what most sheets want. Any other choice withdraws the budget control, because the prompt stops carrying it.\n' +
    '- `CUSTOM` holds your project’s own colours, loaded from a swatch picture, a `.gpl` file or a pasted list.',

  customPaletteName:
    'What your palette is called. The prompt names it where it states the colours — “every pixel is one of the 24 colours of Dusk Harbour” — so a generator treats the set as a decision rather than a coincidence.\n\n' +
    'A `.gpl` file’s header supplies a name, a picture is named after its file, and a pasted list names nothing. An unnamed palette reads as “Custom” wherever the app has to call it something.',

  customPalettePaste:
    'Colours pasted rather than loaded from a file, one per line or separated however you have them. Six hex digits is a colour, with or without the `#` in front, so a list copied off a palette site pastes in as it stands.\n\n' +
    'The box reads as you paste, and any line it cannot make a colour of is listed underneath rather than dropped. Use it when the palette is written down somewhere but is not a file.',

  styleReference:
    'A published game whose art direction this sheet is drawn to match. Choosing one is a template: it sets the render style, surface detail, component size, outline, lighting, projection, camera elevation, target machine and colour together, and each stays yours to change afterwards.\n\n' +
    'The prompt then carries what those controls have no room for: the tile grid the art sat on, the resolution it was authored at, and how its figures and colours were built. It leaves Directions Covered alone. The game’s own name is a separate switch below.\n\n' +
    'A look is offered only where your subject can be drawn under the camera it was rendered under, so an interface widget is shown only the flat front-on references.\n\n' +
    NONE_LEAVES_SETTINGS_ALONE,
  nameStyleReference:
    'Whether the compiled prompt names the reference game. Left off, the prompt still carries the whole look, because the measurements are what a generator acts on, and several targets refuse or quietly degrade a prompt naming a commercial property.\n\n' +
    'Turn it on for a target that does not, and compare the two runs: if naming the game is what makes the sheet right, the reference is under-specified and worth reporting. Available once a reference is chosen above.',

  renderStyle:
    'The drawing technique the whole sheet is executed in. `PIXEL_ART` and `RETRO_PIXEL_ART` get the pixel-discipline rules (deliberate clusters, no anti-aliasing, no microtexture); every other style gets surface-consistency rules instead.\n\n' +
    '`CLAY_RENDER` and `SILHOUETTE_ONLY` are validation passes: run one to check volume or readability before committing to a finished style.\n\n' +
    'Each states its own surface, so it withdraws Surface Detail Intensity, Palette Limit and Outline System, and `SILHOUETTE_ONLY` withdraws Lighting & Shading Model too. Nothing you set there is lost: it comes back with the next finished style.',
  projection:
    'How the camera projects the subject. The prompt names exactly one projection, because a mixed request such as “3/4 top-down dimetric/isometric” is resolved differently every run. Match the engine.\n\n' +
    '- `DIMETRIC_2_1` for a 2:1 diamond grid, which is what most engines and artists mean by “isometric”.\n' +
    '- `ORTHOGRAPHIC_SIDE` for a platformer.\n' +
    '- `THREE_QUARTER_TOPDOWN` for the usual action-RPG read.\n' +
    '- `TRUE_ISOMETRIC` measures every axis alike, laying a square of ground out at 1.73:1, so its tiles will not tessellate on a 2:1 grid.\n\n' +
    'An interface widget offers `ORTHOGRAPHIC_FRONT` alone, because it is composited onto the screen and has no depth axis for another camera to show.',
  cameraElevation:
    'Degrees above the horizon, from 0 at eye level to 90 directly overhead. The projection above sets it, and for every projection but `THREE_QUARTER_TOPDOWN` it is the only elevation that projection can be drawn at.\n\n' +
    'Under `THREE_QUARTER_TOPDOWN` it is yours to set: raising it shows more of the floor plane and foreshortens the figure’s height. At 90° the prompt also changes what it asks of each facing, because a turn seen from directly overhead hides nothing.',
  directions:
    'Which facings the deliverable covers. A directional core draws exactly these views; a cut-out rig, a pose library and the limb articulation sheet read it as a run list, one sheet per facing tied together with an identity lock.\n\n' +
    '- `EIGHT_COMPASS` draws all eight views outright over a cardinal and a diagonal sheet, which an asymmetric subject needs.\n' +
    '- `FIVE_CLASSIC` draws five and reaches all eight only if your engine flips the three turned views, swapping left for right.\n' +
    '- `THREE_CLASSIC` flips further and can never face the camera.\n\n' +
    'An interface widget and a ground tile offer `SINGLE_FRONT` alone: neither has a front to turn away from.',
  primaryDirection:
    'Which facing of the run list the selected sheet is for. It appears only when that sheet covers one facing per generation, as a rig, a pose library or the limb articulation sheet does.\n\n' +
    'It sets the assembly direction and the depth order, since which side renders in front of the body changes with the way the subject turns. Split the sheet to work through every facing in one pass.',
  backgroundKey:
    'What the components sit on, so they can be cut out afterwards. Magenta is the default because white bleeds into light-coloured edges: white armour on a white field has no recoverable boundary.\n\n' +
    'Pick `TRANSPARENT` only if the target really returns alpha; most return a flat matte whatever you ask for. On that choice the prompt asks for the file’s own alpha channel and rules out a drawn checkerboard, a grid of grey squares and that flat matte.\n\n' +
    'Any other choice is reserved for the background: the prompt keeps that colour, and any shade near enough to be keyed out with it, off every component and out of a pinned palette’s colours.',
  spriteTargetSize:
    'Sets an exact pixel size for one component, such as “48 × 96 px”. Leave it empty and the prompt omits the line.\n\n' +
    'On a sheet of parts that assemble into one subject — a cut-out rig, a pose library, an articulation sheet, an item’s part library — the label reads Target Assembled Size, the size describes the whole assembled subject, and the per-component readings below do not apply.\n\n' +
    'Under the `CUSTOM` profile it sets the smallest feature allowed, and 32 px or under on the shorter edge adds sprite-scale rules. On a pixel-art sheet under that profile it is read as the native grid, and the prompt asks for hard pixel edges at a whole-number scale above 1:1.\n\n' +
    'A loaded rig contract overrides this field on the sheet it describes, and what you type here returns when you remove it.',

  rigMode:
    'What the components are for once they leave the sheet. Only the categories whose components have joints offer a choice.\n\n' +
    '- `CUTOUT_RIG` adds rest-orientation, pivot-registration, overlap and depth-order rules, because the pieces are bound to bones and rotated at runtime.\n' +
    '- `POSE_LIBRARY` assumes you assemble poses by hand and needs none of them.\n' +
    '- `NONE` suits tilesets and props that never articulate.\n\n' +
    'The sheet contents can settle it. `CUTOUT_RIG_SINGLE_DIRECTION` fixes it at `CUTOUT_RIG`, and contents that draw each moving part once per position — a pose library, an articulation sheet, a part library — do not offer `CUTOUT_RIG`. That is judged over every sheet the contents deliver, because they assemble together.',
  jointCapStyle:
    'The shape drawn at each joint end, which also places the pivot, since the pivot is the centre of that cap.\n\n' +
    '- `ROUNDED` rotates cleanly through any angle.\n' +
    '- `SQUARED` reads better on mechanical parts but shows its corners past roughly 30°.\n' +
    '- `TAPERED` suits organic limbs that narrow towards the joint.',
  overlapMargin:
    'How far each piece extends past its pivot centre into its neighbour. Pieces that butt together exactly show a gap the instant the joint rotates, so `HALF_CAP` is the safe default; `FULL_CAP` hides deeper rotation at the cost of a visibly thicker joint.',
  sockets:
    'Regions to keep clear of fine detail so equipment can be overlaid later, such as `head, chest, back, hand_left, hand_right`. The prompt asks for those areas to stay flat and unbusy; it does not ask for anything to be drawn there. Leave it empty for none.',

  identityLock:
    'A short digest of an already-accepted sheet, carried into the next one so it depicts the same individual. Concrete countable attributes reproduce: “three amber lights in a vertical row” survives a regeneration, “high-tech detailing” does not.\n\n' +
    'This is what holds a per-direction run series together.',
  emitComponentMap:
    'Adds a section asking the target to return a JSON component map beside the picture: the sheet’s grid, and for each component its place in reading order, its inventory name, what it attaches to and where it pivots in its cell.\n\n' +
    'Only the conversational targets can return text and an image together; on the rest the option is unavailable and says so. Ticking it lengthens the prompt and changes nothing about the image.\n\n' +
    'Read the map as the model’s claim rather than a measurement. It is not the manifest the Quantise tab downloads, but both number components from one in the same reading order, so the two line up sprite by sprite.',
  emitPromptFeedback:
    'Asks the generator, once it has delivered the sheet, to check that sheet against the prompt and say whether each check holds. For each miss it writes a copy-ready Markdown block for whoever maintains Sprite Gubbins, naming the instruction that was too loose: feedback on the wording, never a request to redraw.\n\n' +
    'Hand that block to a developer or a coding agent working on this app. It needs a target that both reasons over the prompt and returns text; the rest say which half they are missing. Turn it on when a sheet comes back wrong and you would rather fix the prompt than repeat the run.',
} as const;
