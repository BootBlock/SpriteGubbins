import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Dialogue portraits and character busts — the head-and-shoulders art a conversation, a party roster
 * or a save slot is illustrated with.
 *
 * **It is not CHARACTER cropped.** A character sheet is a walking figure drawn at several yaws so an
 * engine can turn it; a portrait is one head drawn at one camera, and what it is asked for several
 * of is *expressions*. Those two deliverables share almost nothing: the character's axis is the yaw,
 * the portrait's is the face, and a sheet that confuses them returns five three-quarter walk frames
 * where a dialogue system wanted neutral, angry, hurt and pleased. The face sheet an RPG toolkit
 * loads and the layered visual-novel bust are the two shapes this category is written against, and
 * both are enumerations of feeling rather than of direction.
 *
 * **So it has one camera and one facing, and both absences are the answer.** The head's own turn —
 * a face angled three-quarters away, a profile — is the *subject's pose inside the frame*, stated in
 * `Head Turn & Pose` below, not a camera the sheet is generated at: a portrait is read at eye level,
 * straight on, whatever way the sitter is looking. `categoryProjections.ts` binds it to
 * `ORTHOGRAPHIC_FRONT` for that reason and `categoryDirectionSets.ts` to `SINGLE_FRONT`, which
 * together drop section 3's rotation, occlusion and landmark rules — forty lines about a rotation
 * this sheet does not have.
 *
 * **`Portrait Assembly Base` states how the set is meant to come apart, and it does not reshape the
 * inventory.** A flat portrait is redrawn whole per expression; a layered one draws one head once
 * and swaps the brows, eyes and mouth over it, which is how a visual novel gets sixty expressions
 * out of eight sprites. Both are cutting instructions the reader applies to the same twelve
 * drawings, so the field reaches section 1 verbatim and the plan stays a function of the category
 * and the mode alone, as every other plan in this app is. `sheetPlans/portrait.ts` argues that at
 * length, and `Extra Expressions` is where a reader asks for the feature pieces themselves.
 */
export const PORTRAIT: CategoryDefinition = {
  label: 'Portrait / Character Bust',
  article: 'a',
  fields: [
    {
      key: 'species',
      label: 'Portrait Subject',
      tooltip:
        'Who the portrait is of. It fixes the head shape, the skin or hide, and how far the face may depart from a human one before the expressions stop reading — a beak and a muzzle carry a smile very differently from a mouth, and a sheet that is not told which it is drawing tends to split the difference.',
      options: [
        'Human',
        'Elf & Fae Kin',
        'Dwarf & Stout Folk',
        'Orc & Ogre Kin',
        'Beast-Kin & Anthropomorph',
        'Undead & Revenant',
        'Construct, Android & Automaton',
        'Demon & Infernal',
        'Celestial & Divine',
        'Aquatic & Amphibian Kin',
        'Insectoid & Arachnid Kin',
        'Masked & Faceless Figure',
      ],
    },
    {
      key: 'gender',
      label: 'Gender Presentation',
      tooltip:
        'How the subject presents, which the generator reads for jaw, brow and neck as much as for anything else. Leave it androgynous where the design should not settle it — that reads as a deliberate choice, where an unstated one is silently answered for you.',
      options: [
        'Male',
        'Female',
        'Androgynous',
        'Non-Binary Presentation',
        'Ambiguous & Concealed',
        'Not Applicable',
      ],
    },
    {
      key: 'age',
      label: 'Apparent Age',
      tooltip:
        'How old the face looks. A portrait is read closer than any other art this app composes for, so age is carried by detail a sprite never shows — the set of the eyes, the slackness of the jaw, the lines that deepen when the expression changes.',
      options: [
        'Child',
        'Adolescent',
        'Young Adult',
        'Prime Adult',
        'Middle-Aged',
        'Elderly & Weathered',
        'Ancient & Preserved',
        'Ageless & Unreadable',
      ],
    },
    {
      key: 'role',
      label: 'Narrative Role',
      tooltip:
        'What this person is to the player. Role is what decides where the eyes go and how the shoulders sit — a merchant meets the player’s gaze and an antagonist looks down at it — and stating it is cheaper than describing the same thing pose by pose.',
      options: [
        'Player Avatar',
        'Party Member & Ally',
        'Quest Giver & Elder',
        'Merchant & Innkeeper',
        'Rival & Foil',
        'Antagonist & Villain',
        'Narrator & Guide',
        'Bystander & Townsfolk',
        'Captive & Victim',
        'Herald & Messenger',
      ],
    },
    {
      key: 'setting',
      label: 'World & Era',
      tooltip:
        'The world this face belongs to. It settles the clothing at the shoulders, the grooming and the jewellery all at once, which is most of what separates two portraits that share a bone structure.',
      options: [
        'High Fantasy',
        'Grim Dark Fantasy',
        'Medieval Historical',
        'Age Of Sail',
        'Victorian Gaslamp',
        'Wild West Frontier',
        'Modern Day',
        'Near-Future Cyberpunk',
        'Far-Future Space Opera',
        'Post-Apocalyptic Wasteland',
        'Mythic Antiquity',
        'Feudal East Asia',
      ],
    },
    {
      key: 'build',
      label: 'Framing & Crop',
      tooltip:
        'How much of the person the frame holds, measured from the top of the head down. This is the single most important field on the sheet: a dialogue box wants a head and shoulders, a party roster wants a bust, and a title screen wants a half body — and a set drawn to two different crops cannot be swapped one for another at runtime.',
      options: [
        'Head Only',
        'Head And Shoulders',
        'Bust To Upper Chest',
        'Half Body To Waist',
        'Three-Quarter Body To Thigh',
        'Full Body Standing',
      ],
    },
    {
      key: 'silhouette',
      label: 'Head Turn & Pose',
      tooltip:
        'Which way the head and shoulders are turned inside the frame, and how they are held. This is the subject’s own pose, not the camera — the sheet is drawn straight on whatever this says — and it has to hold across every expression, because a head that turns between two expressions cannot be cut to the same box.',
      options: [
        'Facing The Viewer, Level',
        'Slight Three-Quarter Turn',
        'Strong Three-Quarter Turn',
        'Full Profile',
        'Chin Lifted, Looking Down',
        'Chin Lowered, Looking Up',
        'Head Tilted To One Side',
        'Turned Away, Glancing Back',
      ],
    },
    {
      key: 'face_head',
      label: 'Facial Features & Hair',
      tooltip:
        'The face itself and what frames it — the eyes, the nose, the mouth, the hair and whatever grows on the jaw. On a portrait these are the subject rather than a detail of it, so it is worth being specific: this is the field the likeness actually lives in.',
      options: [
        'Sharp Angular Features, Short Hair',
        'Soft Rounded Features, Long Hair',
        'Broad Heavy Features, Full Beard',
        'Fine Delicate Features, Braided Hair',
        'Gaunt Hollow Features, Lank Hair',
        'Scarred Asymmetric Features, Shaven Head',
        'Wide Expressive Eyes, Loose Curls',
        'Narrow Hooded Eyes, Slicked Hair',
        'Non-Human Muzzle & Mane',
        'Faceplate & Optic Lenses',
        'Concealed Behind A Mask',
      ],
    },
    {
      key: 'anatomy',
      label: 'Portrait Assembly Base',
      tooltip:
        'How the set is cut so the engine can build an expression. A flat portrait redraws the whole head for each one; a layered set draws the head once and swaps the features over it, which is how a dialogue system gets dozens of expressions out of a handful of sprites. Choose by how many expressions the game needs, not by how the art looks.',
      options: [
        'Single Flat Portrait Per Expression',
        'Shared Head With Swappable Mouths',
        'Shared Head With Swappable Eyes And Mouths',
        'Shared Head With Swappable Brows, Eyes And Mouths',
        'Shared Body With Swappable Heads',
        'Layered Base, Features And Overlay',
      ],
    },
    {
      key: 'clothing',
      label: 'Garments At The Shoulders',
      tooltip:
        'What the crop actually shows of what the subject is wearing — a collar, a gorget, a pauldron, a hood. Only the part inside the frame matters here, and describing a whole outfit is wasted budget on a sheet cropped at the chest.',
      options: [
        'Bare Shoulders',
        'Simple Linen Collar',
        'Padded Gambeson & Cowl',
        'Plate Gorget & Pauldrons',
        'Hooded Cloak & Clasp',
        'Tailored Coat & Cravat',
        'Layered Silk Robes',
        'Utility Harness & Webbing',
        'Sealed Suit Collar Ring',
        'Ceremonial Stole & Chain Of Office',
      ],
    },
    {
      key: 'worn_details',
      label: 'Marks & Adornment',
      tooltip:
        'What the skin and hair carry — scars, tattoos, paint, piercings, circuitry. On a portrait these are the details a player remembers a character by, and they have to be drawn identically in every expression or the set reads as several different people.',
      options: [
        'Unmarked Skin',
        'Battle Scars Across The Face',
        'Ritual Tattoos & Woad',
        'War Paint & Ash Streaks',
        'Piercings & Ear Cuffs',
        'Subdermal Circuit Tracery',
        'Freckles & Sun Damage',
        'Frost Rime & Pallor',
        'Gilded Facial Jewellery',
        'Bandages Over One Eye',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the portrait — skin, hair and the largest garment. These are what the character is recognised by at roster size, where the face itself is only a few pixels across.',
      options: [
        'Warm Tan Skin & Chestnut Hair',
        'Fair Skin & Ash Blonde Hair',
        'Deep Brown Skin & Black Coils',
        'Olive Skin & Dark Auburn Hair',
        'Grey Undead Pallor & White Hair',
        'Green Hide & Coarse Black Mane',
        'Burnished Bronze Plating',
        'Cold Blue Skin & Silver Hair',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The one or two colours carried by the eyes, the jewellery and the trim — the smallest areas on the portrait and the ones the eye goes to first. A hex code pins it far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Amber Eyes #F59E0B',
        'Emerald Eyes #10B981',
        'Ice Blue Eyes #7DD3FC',
        'Blood Red Eyes #DC2626',
        'Arcane Violet Glow #8B5CF6',
        'Polished Gold Trim #D4AF37',
        'Tarnished Silver #94A3B8',
        'Unlit Black Sclera',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the surfaces are and how light reads off them: skin scatters and stays soft, plate takes a hard specular edge, and wet eyes carry the only true highlight on most faces. It is what keeps a portrait from reading as one flat painted mass.',
      options: [
        'Soft Skin, Matte Cloth & Wet Eyes',
        'Weathered Hide & Coarse Wool',
        'Polished Plate & Oiled Leather',
        'Chitin Shell & Fine Silk',
        'Dry Bone & Grave Linen',
        'Brushed Alloy & Backlit Lens',
        'Fur, Horn & Braided Cord',
        'Scale, Pearl & Damp Weed',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping the dialogue system’s job off the sheet. The name plate is the one that matters most: a portrait with a name painted beside it serves one character in one language, and the box the engine draws would then sit over the top of it.',
      options: [
        'No name plate, caption or speech bubble',
        'No background scene behind the head',
        'No second person or over-the-shoulder figure',
        'No frame, vignette or decorative border',
        'No drop shadow cast onto anything behind',
        'No held prop or weapon entering the crop',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Expressions',
      tooltip:
        'Further expressions or overlays beyond the ones the sheet already lists, each isolated into its own sprite slot. Comma-separated, with ×N for how many of each: “Blush Overlay ×1, Tear Streaks ×2” adds three components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Blush Overlay ×1, Sweat Drop ×1',
        'Tear Streaks ×2',
        'Blood Spatter ×1, Bruising ×1',
        'Closed Eyes For Blinking ×1',
        'Speaking Mouth Shapes ×4',
      ],
    },
  ],
};
