/** Guidance shown against each control, keyed to the control it explains. */
export const OUTPUT_TOOLTIPS = {
  category:
    'The kind of thing being described. Changes the whole field vocabulary and the option pools behind it, so switching resets the subject.',

  directionalMode:
    'What the sheet delivers, and therefore how many components it asks for. A cut-out rig is one direction per sheet — eight directions is 120 pieces, far past what any model produces in one generation.',
  surfaceDetail:
    'How much internal seam and fold complexity to draw, while still respecting the palette limit.',
  resolutionProfile:
    'The scale a full figure is drawn at. Independent of render style — a painted sheet and a pixel sheet can share a resolution.',
  paletteLimit:
    'The total colour budget across the whole sheet. Painted and rendered styles usually want no budget at all.',
  outlineStyle: 'How component boundaries are drawn: a darker local contour, crisp black, or no outline.',
  lightingModel:
    'Key light angle and shadow treatment. Flat neutral albedo is what a game engine wants, because it lights the sprite itself.',
  aspectRatio: 'The sheet canvas shape, passed to the generator so it does not crop the layout.',
  targetModel:
    'Which generator the prompt is written for. This changes the shape of the output, not just its wording — a reasoning contract, command flags, a negative-prompt block, or a directive prefix.',

  renderStyle:
    'The drawing technique. The pixel-discipline rules — deliberate clusters, no anti-aliasing, no microtexture — apply only to the two pixel styles; everything else gets surface-consistency rules instead.',
  projection:
    'How the camera projects the subject. One named projection, because asking for "3/4 top-down dimetric/isometric" names three mutually exclusive things and a model resolves the ambiguity differently every run.',
  cameraElevation:
    'Degrees above the horizon. Defaults to what the projection implies; override it when the game has a specific ground read.',
  directions:
    'Which facings the sheet covers. For a cut-out rig this is the run list — generate one sheet per direction and tie them together with an identity lock.',
  backgroundKey:
    'What the components sit on. Magenta is the default because white bleeds into light-coloured edges and leaves alpha keying ambiguous — white armour on a white field has no recoverable boundary.',
  spriteTargetSize:
    'An explicit pixel target, e.g. "48 × 96 px". The resolution profile only says roughly; this says exactly. Leave empty to omit the line.',

  rigMode:
    'What the components are for. A cut-out rig adds rest-orientation, pivot-registration, overlap and depth-order rules that a hand-assembled pose library does not need.',
  jointCapStyle:
    'The shape of the cap at each joint end — and therefore where the pivot is, since the pivot is the centre of that cap.',
  overlapMargin:
    'How far each piece extends past its pivot centre. Pieces that butt together exactly show a gap the instant the joint rotates.',
  sockets:
    'Regions to keep clear of fine detail so equipment can be overlaid later, e.g. "head, chest, back, hand_left, hand_right". Leave empty for none.',

  identityLock:
    'A short digest of an accepted sheet, carried into the next one so it depicts the same individual. Concrete countable attributes reproduce — "three amber lights in a vertical row" survives, "high-tech detailing" does not.',
  emitManifest:
    'Ask for a JSON manifest of grid positions, part names and pivots alongside the image. Only the conversational targets can return text with an image, so it is unavailable for the rest.',
} as const;
