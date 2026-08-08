/**
 * Guidance shown against each control, keyed to the control it explains.
 *
 * Each entry says three things in order: what the setting *is*, what it changes about the compiled
 * prompt, and how to choose — naming real options rather than describing them in the abstract. The
 * identifiers quoted here are the ones `constants/output/choices.ts` offers, so a reader can match
 * the advice to the list in front of them.
 */
export const OUTPUT_TOOLTIPS = {
  category:
    'The kind of thing being described. It swaps the entire field vocabulary and the option pools behind it — the first field is “Species / Archetype” for a character and “Structure Type” for a building — so switching resets the subject to that category’s defaults. Choose it before filling anything else in.',

  sheetIndex:
    'Which sheet of this deliverable the prompt below is for. Some sheet contents ask for more components than one generation returns, so they arrive as a short series: a character’s five directional views of head, torso and pelvis are one sheet, and its thirty-four limb variants are another. Generate them in order, and set the identity lock from the first one you accept so the rest depict the same individual. “Split into sheets” works through the whole series in one place.',
  directionalMode:
    'What the sheet has to deliver, and therefore how many components the prompt asks for. The list holds only what this category can actually produce, so it changes with the category above: CORE_DIRECTIONAL_VARIANTS is the recommended default where it is offered, while a terrain is laid flat and has no facing to turn, so it offers a tile field instead. CUTOUT_RIG_SINGLE_DIRECTION covers one facing per sheet, so eight directions means eight runs rather than a single sheet holding all of them, which no generator returns in one pass. The count beside each option is what that pairing asks for, across its own sheets where it takes more than one. Where the mode covers one facing per sheet, the chosen direction set multiplies that again — “Split into sheets” states what the whole batch comes to. Each sheet’s own figure is the one its prompt contracts for.',
  surfaceDetail:
    'How much internal seam, panel and fold complexity to draw on each component, while still respecting the palette limit. MINIMAL keeps base colours and essential joints, which is what a small sprite needs before detail turns to noise; CLEAN_PRODUCTION is the usual choice; TEXTURED is for large pieces that will be seen close up.',
  resolutionProfile:
    'The scale a full figure is drawn at, given as a share of the sheet height rather than in pixels, so it holds whatever canvas the generator returns. Independent of render style — a painted sheet and a pixel sheet can share a resolution. Pick CUSTOM when you have an exact component size in mind, and state it in Sprite Target Size.',
  paletteLimit:
    'The total colour budget across the whole sheet, which is what keeps every component looking like it came from one set. STRICT_32_COLOR and RESTRAINED_64_COLOR suit pixel work; painted, cel-shaded and 3D styles usually want UNRESTRICTED, because a hard colour count fights the blending they depend on.',
  outlineStyle:
    'How a component’s boundary is drawn where it meets the background. DARK_LOCAL_CONTOUR — a 1px darker shade of each local colour — keeps parts separable without flattening them; PURE_BLACK_OUTLINE gives the harder retro read; OUTLINE_LESS_ALBEDO leans on value and hue contrast alone, which needs a busy scene to sit against.',
  lightingModel:
    'The key light angle and shadow treatment baked into the sprite. FLAT_NEUTRAL_ALBEDO is what a game engine wants, because the engine lights the sprite itself and a baked highlight would fight its own. Choose a fixed key only when the scene lighting is fixed too, as it is in a locked isometric view.',
  aspectRatio:
    'The shape of the sheet canvas, passed to the generator so it lays the component grid out inside the frame instead of cropping it. WIDE_16_9 fits the usual wide grid; TALL_9_16 suits one tall figure with its variants stacked; SQUARE_1_1 is the safest choice on targets that quietly re-frame anything else.',
  componentBudget:
    'The most components you want one generation asked for. Around forty is what current models deliver before they start merging or dropping pieces. Exceeding it is reported in the studio and never changes the prompt — the sheet is not trimmed behind your back. Set 0 for no cap.',
  targetModel:
    'Which generator the prompt is written for. This changes the shape of the output, not just its wording: a reasoning contract, command-line flags, a separate negative-prompt block or a directive prefix are added or dropped to match what the target actually reads. Set it before copying — the same configuration compiles differently for each one.',

  hardwareProfile:
    'The machine the sheet is drawn for. Choosing one is a template: it sets the render style, surface detail, component size, outline, lighting and palette to what artwork for that machine actually looked like, and every one of them stays yours to change afterwards. What the prompt then carries is the machine’s geometry — its display, its tile grid, its sprite sizes and how many it could show — because naming a real machine steers a generator further than any of those figures does alone. Colour is the Palette field’s, not this one’s, which is why the two can be set independently. NONE writes nothing else and leaves your settings alone.',
  palette:
    'The exact colours the sheet may use. This is stronger than the colour budget and supersedes it: a budget can say “32 to 64 colours”, and only a palette can say “these four shades of green” or “each channel is one of eight levels”. Where the list is short it is written into the prompt in full, and the Quantise tab maps a returned sheet onto it rather than choosing colours of its own. FREE leaves colour to the budget below, which is what most sheets want — and pinning anything else withdraws that control, because the prompt stops carrying it.',

  renderStyle:
    'The drawing technique the whole sheet is executed in. The pixel-discipline rules — deliberate clusters, no anti-aliasing, no microtexture — are emitted only for PIXEL_ART and RETRO_PIXEL_ART; every other style gets surface-consistency rules instead. CLAY_RENDER and SILHOUETTE_ONLY are validation passes: run one to check volume or readability before committing to a finished style.',
  projection:
    'How the camera projects the subject. Exactly one named projection is emitted, because asking for “3/4 top-down dimetric/isometric” names three mutually exclusive things and a model resolves the ambiguity differently every run. Match the engine: TRUE_ISOMETRIC for a 2:1 diamond grid, ORTHOGRAPHIC_SIDE for a platformer, THREE_QUARTER_TOPDOWN for the usual action-RPG read.',
  cameraElevation:
    'Degrees above the horizon, from 0 at eye level to 90 directly overhead. It defaults to whatever the chosen projection implies, so override it only when the game has a specific ground read to match — raising it shows more of the floor plane and foreshortens the figure’s height.',
  directions:
    'Which facings the sheet covers, where Sheet Contents leaves the choice open — a cut-out rig and a tileset read this as the run list rather than the sheet contents, so generate one sheet per direction and tie them together with an identity lock. THREE_CLASSIC buys the most facings three drawings can, because each of its views flips at runtime into a different one — but every view in it is a turned pose, so it reaches no facing towards the camera and none directly away, and flipping cannot produce either. FIVE_CLASSIC adds exactly those two and reaches all eight; FOUR_CARDINAL and EIGHT_COMPASS carry them in compass terms instead.',
  primaryDirection:
    'Which facing of that run list this sheet is for. It sets the assembly direction and the depth order — which of the subject’s sides renders in front of its body changes with the way it turns. Split the sheet to work through every facing in one pass.',
  backgroundKey:
    'What the components sit on, so they can be cut out afterwards. Magenta is the default because white bleeds into light-coloured edges and leaves alpha keying ambiguous — white armour on a white field has no recoverable boundary. Pick TRANSPARENT only if the target genuinely returns alpha; most return a flat matte whatever you ask for.',
  spriteTargetSize:
    'An explicit pixel target for a single component, e.g. “48 × 96 px”. The resolution profile only says roughly how large a figure is; this says exactly, and is what the CUSTOM profile expects to find. Leave it empty and the line is omitted from the prompt entirely rather than sent blank.',

  rigMode:
    'What the components are for once they leave the sheet. CUTOUT_RIG adds rest-orientation, pivot-registration, overlap and depth-order rules, because those pieces get bound to bones and rotated at runtime; POSE_LIBRARY assumes you assemble poses by hand and needs none of them; NONE suits tilesets and props that never articulate. Only the categories whose components have joints offer a choice here — a tile, a widget and a frame of an effect all turn about nothing.',
  jointCapStyle:
    'The shape drawn at each joint end — and therefore where the pivot is, since the pivot is the centre of that cap. ROUNDED rotates cleanly through any angle; SQUARED reads better on mechanical parts but shows its corners past roughly 30°; TAPERED suits organic limbs that narrow towards the joint.',
  overlapMargin:
    'How far each piece extends past its pivot centre into its neighbour. Pieces that butt together exactly show a gap the instant the joint rotates, so HALF_CAP is the safe default; FULL_CAP hides deeper rotation at the cost of a visibly thicker joint.',
  sockets:
    'Regions to keep clear of fine detail so equipment can be overlaid later, e.g. “head, chest, back, hand_left, hand_right”. The prompt asks for those areas to stay flat and unbusy — it does not ask for anything to be drawn there. Leave empty for none.',

  identityLock:
    'A short digest of an already-accepted sheet, carried into the next one so it depicts the same individual. Concrete countable attributes reproduce — “three amber lights in a vertical row” survives a regeneration, “high-tech detailing” does not. This is what holds a per-direction run series together.',
  emitManifest:
    'Ask for a JSON manifest of grid positions, part names and pivots alongside the image, so the sheet can be sliced without measuring it by hand. Only the conversational targets can return text and an image together; on the rest the option is unavailable and says so.',
  emitPromptFeedback:
    'Ask the generator, once it has delivered the sheet, to compare what it actually drew against the prompt that asked for it and say for each check whether it holds. Where something is missed it then writes a copy-ready markdown block addressed to whoever maintains Sprite Gubbins, naming the instruction that was too loose to prevent the miss — feedback on the wording, never a request to redraw. Hand that block to a developer or a coding agent working on this app, and the next prompt it composes asks better. Needs a target that both reasons over the prompt and returns text; the rest say which half they are missing. Turn it on when a sheet comes back wrong and you would rather fix the prompt than repeat the run.',
} as const;
