import type { CategoryDefinition } from '../../types/subject.ts';

/** Monsters and beasts — non-humanoid limb layouts, biological rather than worn detail. */
export const CREATURE: CategoryDefinition = {
  label: 'Creature / Monster',
  fields: [
    {
      key: 'species',
      label: 'Creature Class',
      tooltip:
        'The monster classification, which fixes the limb layout everything else hangs off: a quadruped, an insectoid and a void entity break down into completely different component sets. Set this before the anatomy base, which it constrains.',
      options: [
        'Beast / Quadruped',
        'Mechanical Automaton',
        'Chitinous Insectoid',
        'Void Abomination',
        'Elemental Golem',
        'Draconic Drake',
        'Hydra Multi-Head',
        'Slime / Ooze Form',
        'Fungal Spore Monster',
        'Arachnid Swarmer',
      ],
    },
    {
      key: 'gender',
      label: 'Form Variant',
      tooltip:
        'Where this specimen sits in its own hierarchy. Rank reads as scale and ornament — a hive queen carries more mass, more silhouette and more distinguishing marks than a drone of the same species without becoming a different creature.',
      options: [
        'Apex Alpha',
        'Drone / Minion',
        'Queen / Hive Mother',
        'Elder Ancient',
        'Lesser Stalker',
        'Prime Matriarch',
        'Mutated Specimen',
        'Overlord Colossus',
      ],
    },
    {
      key: 'age',
      label: 'Vitality State',
      tooltip:
        'The creature’s condition — battle wear, corruption, or how hard its elemental core is running. It shifts surface damage and emissive intensity across every component at once, which is what makes freshly-spawned and ancient variants of one design read as a set.',
      options: [
        'Prime Ferocity',
        'Ancient Weathered',
        'Freshly Spawned',
        'Corrupted Corpse',
        'Enraged Overclocked',
        'Slumbering Dormant',
        'Mutated Hyper-Growth',
      ],
    },
    {
      key: 'role',
      label: 'Combat Behaviour',
      tooltip:
        'What the creature does in a fight. It informs the rest stance the components are drawn in — mandibles open or closed, weight forward or coiled — and therefore how much of the pose is already baked into the pieces before you animate them.',
      options: [
        'Ambusher Pouncer',
        'Frontline Tank Swarmer',
        'Ranged Spitter',
        'Flying Harasser',
        'Burrowing Surprise Attacker',
        'Support Aura Emitter',
        'Area Denier',
        'Apex Predator',
      ],
    },
    {
      key: 'setting',
      label: 'Habitat / Theme',
      tooltip:
        'Where the creature lives. Habitat drives camouflage colouring and shell texture more strongly than any single colour field does, because it tells the generator what the animal evolved against.',
      options: [
        'Alien Hive Core',
        'Volcanic Caverns',
        'Deep Space Derelict',
        'Fungal Swamplands',
        'Glacial Ice Trench',
        'Subterranean Ruins',
        'Radioactive Wasteland',
        'Toxic Sewers',
      ],
    },
    {
      key: 'build',
      label: 'Mass & Frame',
      tooltip:
        'The frame the mass is carried on: carapace thickness, spine arrangement, weight distribution. It sets each component’s footprint, and a low-slung quadruped packs into an atlas very differently from a towering winged fiend.',
      options: [
        'Low-Slung Quadruped',
        'Huge Heavy Carapace',
        'Slender Serpent-like',
        'Multi-Legged Walker',
        'Massive Winged Fiend',
        'Amorphous Blob Frame',
        'Skeletal Centipede',
      ],
    },
    {
      key: 'silhouette',
      label: 'Spines & Silhouette',
      tooltip:
        'The outward profile — spikes, shell plates, membranes. This is the read at gameplay distance, and on a creature it is usually the only cue separating a dangerous variant from a harmless one before it attacks.',
      options: [
        'Jagged Dorsal Spines',
        'Segmented Shell Plates',
        'Tentacled Mass',
        'Crystalline Outcrops',
        'Spike-Covered Back',
        'Humped Carapace',
        'Webbed Wing Membrane',
      ],
    },
    {
      key: 'face_head',
      label: 'Mandibles & Sensory',
      tooltip:
        'Eyes, fangs, mouth parts and sensory organs. On a monster the head carries the threat signal, so it pays to be specific — compound insect eyes and eyeless sensing slits produce entirely different silhouettes at the same size.',
      options: [
        'Triple Jaw Mandibles',
        'Compound Insect Eyes',
        'Single Glowing Monocular Sensor',
        'Fanged Maw',
        'Eyeless Sensing Slits',
        'Multi-Horned Skull',
        'Acid Siphon Maw',
      ],
    },
    {
      key: 'anatomy',
      label: 'Anatomy Base',
      tooltip:
        'The body plan the component breakdown follows. It decides how many legs, segments or tentacles get their own sprite slots, so match it to the creature class above — a mismatched plan fights the design and produces parts that cannot be assembled.',
      options: [
        'QUADRUPED BEAST',
        'HEXAPOD INSECT',
        'SERPENTINE TAILLESS',
        'BIPEDAL BEAST',
        'OCTOPUS TENTACLED',
        'CENTIPEDE MULTI-SEGMENT',
      ],
    },
    {
      key: 'clothing',
      label: 'Harness / Augments',
      tooltip:
        'Mounted weaponry, restraint chains, saddles or cybernetics fitted to the creature. Everything offered here reads as imposed on the animal rather than grown by it, so choose NONE for a purely biological beast.',
      options: [
        'NONE',
        'Mounted Energy Cannons',
        'Reinforced Restraint Chains',
        'Saddle & Armor Harness',
        'Control Mind Spike',
        'Cybernetic Leg Armor',
      ],
    },
    {
      key: 'worn_details',
      label: 'Biological Marks',
      tooltip:
        'Bioluminescence, acid drips, scarring, shell cracks — the marks the creature carries. They are what sell the surface as living tissue rather than a painted shell, and also the first details to be lost once the sprite is scaled down.',
      options: [
        'Bioluminescent Veins',
        'Battle Scars & Missing Scales',
        'Acidic Drip Droplets',
        'Chitin Cracks',
        'Glow Spore Clusters',
        'Molten Core Cracks',
        'Frost Crystal Coating',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The base hide, shell or carapace colours carried across the whole creature. Two colours with a clear value gap survive downscaling; a single flat hide colour tends to collapse into a silhouette once the sprite is small.',
      options: [
        'Obsidian Black & Deep Purple',
        'Toxic Hive Yellow #EAB308 & Brown',
        'Albino White & Pale Pink',
        'Rusty Iron & Moss',
        'Crimson Red & Charcoal',
        'Deep Sea Cyan #06B6D4 & Navy',
        'Bio-Green #10B981 & Slate',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The bioluminescent or warning colours — the parts meant to be seen and understood instantly. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Acidic Lime Green #84CC16',
        'Magma Orange Glow #F97316',
        'Plasma Cyan #22D3EE',
        'Bio-Violet #8B5CF6',
        'Electric Yellow #EAB308',
        'Infrared Pink #F43F5E',
        'Stasis Blue #3B82F6',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Shell',
      tooltip:
        'The hide texture and how light behaves on it: wet chitin catches a hard highlight, rocky scale scatters it, translucent jelly needs light passing through. This is often the only thing separating two creatures that share a silhouette.',
      options: [
        'Hard Chitin Shell & Wet Membranes',
        'Molten Rock & Obsidian',
        'Rusting Scrap & Wiring',
        'Leathery Hide',
        'Scaly Dragon Hide',
        'Transparent Jelly Shell',
        'Frozen Ice Plating',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping human features, gear and scene dressing off a monster sheet. Riders and floor shadows are worth excluding by name — each attaches something to the creature that cannot be cut away once it is drawn.',
      options: [
        'No human clothing, no weapons',
        'No wings, no extra eyes',
        'No saddles, no mechanical parts',
        'No rider, no floor shadows',
        'No background text',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Appendages',
      tooltip:
        'Extra appendages — a sting tail, blade arms, a second wing pair — requested as their own sprite slots so they can be animated independently of the body. Leave this as NONE unless the part has motion of its own.',
      options: [
        'NONE',
        'Scorpion Sting Tail',
        'Chitinous Blade Arms',
        'Double Pair Wings',
        'Prehensile Tentacle Pair',
        'Spike Tail Club',
      ],
    },
  ],
};
