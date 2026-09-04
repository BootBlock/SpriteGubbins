import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { HEX_CODE_PINS_THE_HUE } from '../guidanceSentences.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Interface and HUD art — buttons, panels, frames, bars, cursors and icon plates.
 *
 * A texture atlas is literally this category's deliverable, and the app already ships a calculator
 * for laying one out, so it was the conspicuous gap: a nine-slice frame is not a prop, a loot item
 * or a building module, and none of the other six reaches it.
 *
 * **It has no yaw and no elevation of its own** — PORTRAIT, ICON and BACKGROUND joined it in that
 * later, each for its own reason — which is why the two sheet modes it supports both cover a single
 * facing. Section 3's rules about views *disagreeing*
 * are gated on `[IF:MULTI_DIRECTION]` and drop out entirely there, so a flat widget never reads
 * forty lines about a rotation it does not have — see `sheetPlans/interface.ts`, which declines the
 * two directional modes for that reason rather than by omission. Lighting is not in that list: a
 * bevel has a very definite light direction, it is simply a drawing convention rather than a light
 * standing somewhere in a scene.
 *
 * **The axis that earns a sheet here is interaction state**, not facing: normal, hover, pressed,
 * disabled, focused. That is what makes a widget set worth generating in one pass rather than five,
 * and it maps onto the "a separate component for each state a part has" shape the OBJECT and ITEM
 * part libraries already use.
 */
export const INTERFACE: CategoryDefinition = {
  label: 'Interface / HUD Element',
  article: 'an',
  fields: [
    {
      key: 'species',
      label: 'Element Type',
      tooltip:
        'Which widget this is. It decides the component split before any styling does, because what a widget has to *do* fixes how it comes apart — a button has states, a panel has stretching edges, and a bar has a track its fill slides inside.',
      options: [
        'Button & Key Cap',
        'Panel & Window Frame',
        'Progress & Resource Bar',
        'Inventory Slot & Icon Plate',
        'Cursor & Pointer Set',
        'Toggle, Checkbox & Radio',
        'Slider & Stepper',
        'Tab & Menu Header',
        'Dialogue & Speech Box',
        'Minimap & Compass Bezel',
        'Tooltip & Callout Bubble',
        'Scroll Bar & Track',
        'Loading & Progress Spinner',
        'Skill Tree Node & Link',
      ],
    },
    {
      key: 'gender',
      label: 'Emphasis Tier',
      tooltip:
        'How loudly the widget speaks in the hierarchy. Tier is what a player reads before they read anything else on the screen, and stating it separately from the colours is what keeps a quiet secondary button from arriving as bright as the confirm beside it.',
      options: [
        'Primary Call To Action',
        'Secondary / Supporting',
        'Tertiary / Quiet',
        'Destructive / Warning',
        'Disabled & Unavailable',
        'Locked / Premium',
        'Neutral Informational',
        'Success & Confirmation',
      ],
    },
    {
      key: 'age',
      label: 'Finish & Condition',
      tooltip:
        'How much of a life the interface is meant to have had. A parchment menu and a field terminal are both worn, and they wear differently — so this is stated apart from the theme, which otherwise pulls every widget towards factory-new whatever world it sits in.',
      options: [
        'Crisp Factory-New',
        'Softly Worn Edges',
        'Scuffed & Scratched Metal',
        'Cracked & Sun-Bleached',
        'Tarnished Antique Gilt',
        'Glitching & Signal-Degraded',
        'Hand-Inked & Uneven',
        'Freshly Painted & Vivid',
        'Water-Stained & Warped',
        'Dusty & Long Unused',
      ],
    },
    {
      key: 'role',
      label: 'Interface Role',
      tooltip:
        'What pressing it does, or what it reports. Role governs the focal mark and the accent more than the frame does — a confirm and a cancel are usually the same body in two colours with two different glyphs, which is the cheapest way to get a whole set out of one design.',
      options: [
        'Confirm & Accept',
        'Cancel & Dismiss',
        'Navigate & Page',
        'Display Only / Readout',
        'Equip & Inventory',
        'Settings & System',
        'Alert & Notification',
        'Currency & Reward',
        'Quest & Objective Log',
        'Map & Navigation',
        'Chat & Social',
        'Save & Load',
        'Tutorial & Hint',
      ],
    },
    {
      key: 'setting',
      label: 'Interface Theme',
      tooltip:
        'The design language the whole interface is drawn in. It aligns corner treatment, trim and material across every widget at once — carved stone and flat modern rarely share a screen without looking like two games bolted together.',
      options: [
        'Parchment & Ink Fantasy',
        'Carved Stone & Rune',
        'Cyberpunk Neon HUD',
        'Military Field Terminal',
        'Minimalist Flat Modern',
        'Steampunk Brass Gauge',
        'Cosy Storybook Papercraft',
        'Retro 16-Bit Console Menu',
        'Cosmic Horror Occult',
        'Art Deco Chrome & Enamel',
        'Hand-Painted Folk Art',
        'Clinical Laboratory Readout',
        'Woodland Bark & Leaf',
      ],
    },
    {
      key: 'build',
      label: 'Footprint & Density',
      tooltip:
        'How much room the widget takes and how tightly its contents pack into it. Stating it explicitly is what stops a compact HUD counter and a full-screen dialogue box arriving at the same proportions — the failure that makes a generated kit look like one widget at six sizes.',
      options: [
        'Compact & Tightly Packed',
        'Standard Touch Target',
        'Generous & Airy',
        'Wide Banner Proportions',
        'Tall Column Proportions',
        'Chunky Oversized Console',
        'Narrow Sidebar Proportions',
        'Small Corner Badge',
        'Full-Width Overlay Panel',
      ],
    },
    {
      key: 'silhouette',
      label: 'Frame Profile & Corners',
      tooltip:
        'The outline the widget is recognised by, and how much relief its edge carries. At interface scale the corner treatment and the raised-or-recessed read are the whole identity — they survive at 16 px where trim and surface motifs are long gone.',
      options: [
        'Square Corners, Hard Edge',
        'Softly Rounded Corners',
        'Fully Pill-Rounded',
        'Chamfered Sci-Fi Corners',
        'Scrollwork Ornate Corners',
        'Torn & Irregular Edge',
        'Bevelled Raised Relief',
        'Inset Recessed Well',
        'Notched Tab & Key Cut',
        'Arched Gothic Head',
        'Hexagonal Cell Edge',
      ],
    },
    {
      key: 'face_head',
      label: 'Focal Glyph',
      tooltip:
        'The mark at the widget’s centre — where the eye lands first, and the only thing distinguishing two widgets that share a body. A drawn glyph, never a letter or a numeral: section 0 forbids text anywhere on the sheet, because a label is applied by the engine at runtime rather than baked into the atlas.',
      options: [
        'No Glyph — Blank Face',
        'Chevron & Directional Wedge',
        'Cross & Tick Marks',
        'Gear & Cog',
        'Heart & Shield Sigil',
        'Coin & Gem Facet',
        'Skull & Hazard Mark',
        'Rune & Sigil Carving',
        'Abstract Geometric Emblem',
        'Map Pin & Waypoint Mark',
        'Speech Tail & Bubble Point',
        'Star & Burst',
        'Disk & Bookmark Mark',
      ],
    },
    {
      key: 'anatomy',
      label: 'Slice Assembly Base',
      tooltip:
        'How the widget is cut so the engine can resize it. Choose by which way it has to stretch — a nine-slice keeps four fixed corners while its edges and centre repeat, a three-slice stretches on one axis only, and a fixed piece never resizes at all.',
      options: [
        'Single Fixed-Size Piece',
        'Three-Slice Horizontal Stretch',
        'Three-Slice Vertical Stretch',
        'Nine-Slice Stretching Frame',
        'Nine-Slice With Tiling Fill',
        'Stacked Header, Body & Footer',
        'Radial Clock-Sweep Fill',
        'Nine-Slice With Fixed Corner Ornament',
        'Repeating Track With Two Caps',
        'Base Plate With Overlay States',
      ],
    },
    {
      key: 'clothing',
      label: 'Ornament & Trim',
      tooltip:
        'What is applied along the widget’s edge — rivets, scrollwork, piping, binding. Trim is drawn as its own geometry over the frame beneath it, so it is also the cheapest way to give one panel a rare and a common variant.',
      options: [
        'Plain Untrimmed Edge',
        'Beaded Metal Rivets',
        'Filigree Corner Scrollwork',
        'Stitched Leather Binding',
        'Etched Circuit Tracery',
        'Rope & Cord Edging',
        'Glowing Energy Piping',
        'Carved Stone Moulding',
        'Painted Enamel Inlay',
        'Woven Braid Edging',
        'Bare Machined Chamfer',
      ],
    },
    {
      key: 'worn_details',
      label: 'Surface Motifs',
      tooltip:
        'What the flat interior fields carry, if anything. Interface art is read at a glance over moving gameplay, so a quiet field is usually the right answer — and every motif costs palette budget that the glyph and the accent need more.',
      options: [
        'Clean Untextured Fields',
        'Woven Fabric Weave',
        'Hammered Metal Dimpling',
        'Parchment Fibre & Foxing',
        'Hairline Scan Lines',
        'Wood Grain & Knots',
        'Frosted Glass Speckle',
        'Brushed Metal Grain',
        'Halftone Dot Field',
        'Leather Pebble Grain',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant frame and field colours — what the interface is identified by, and what gameplay has to stay legible against. Two colours with a clear value gap keep a panel readable over any scene it is drawn on top of.',
      options: [
        'Aged Parchment & Sepia Ink',
        'Slate #1E293B & Cool Grey',
        'Deep Oxblood #7F1D1D & Gold',
        'Matte Black & Bone White',
        'Midnight Navy #0F172A & Steel',
        'Warm Umber & Cream',
        'Bright Paper White & Charcoal',
        'Forest Green & Antique Brass',
        'Cool Ice Blue & White',
        'Terracotta & Cream',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The state and emphasis colour — the hue a hover, a fill or an alert is carried in. ' +
        HEX_CODE_PINS_THE_HUE,
      options: [
        'Interface Cyan #22D3EE',
        'Confirm Green #10B981',
        'Warning Amber #F59E0B',
        'Danger Red #EF4444',
        'Arcane Violet #8B5CF6',
        'Polished Gold #D4AF37',
        'Muted Disabled Grey #64748B',
        'Focus Ring Blue #3B82F6',
        'Reward Magenta #E879F9',
        'Experience Lime #84CC16',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the interface is notionally made of, and how light reads off it: brushed steel takes a broad soft sheen, parchment none at all, backlit acrylic emits rather than reflects. It is what separates the frame from its fill under flat neutral lighting.',
      options: [
        'Aged Parchment & Wax Seal',
        'Brushed Steel & Smoked Glass',
        'Carved Oak & Wrought Iron',
        'Matte Plastic & Rubber Grip',
        'Cut Stone & Inlaid Gold',
        'Backlit Acrylic & Anodised Alloy',
        'Painted Card & Cotton Thread',
        'Enamelled Tin & Printed Card',
        'Frosted Glass & Soft Light',
        'Woven Linen & Wooden Bead',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping the engine’s job off the atlas. Lettering is the one that matters most: a label, a count or a key name is drawn at runtime in the player’s own language, so a widget with one baked into it can only ever be used for that one string.',
      options: [
        'No lettering, numerals or captions',
        'No drop shadow behind any piece',
        'No mouse pointer or hand touching it',
        'No screenshot chrome or device bezel',
        'No gameplay art inside the frames',
        'No glow spilling past a piece’s edge',
        'No sample icon inside a slot',
        'No colour swatch strip or key',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra States',
      tooltip:
        'Further states or overlays beyond the ones the sheet already lists, each isolated into its own sprite slot so the engine can draw it over a widget that never changes. Comma-separated, with ×N for how many of each: “Focus Ring ×1, Cooldown Sweep ×2” adds three components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Focus Ring ×1, Selected Fill ×1',
        'Cooldown Sweep ×2',
        'Loading Spinner Frame ×4',
        'Notification Badge ×1',
        'Locked Overlay ×1, Equipped Mark ×1',
        'Scroll Cap ×2',
      ],
    },
  ],
};
