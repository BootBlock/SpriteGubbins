import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The body-system slots an implant screen holds, as the equipment slots hold a character’s gear: the
 * frontal cortex, the operating system, the eyes’ optics, the circulation, the nerves, the skin, the
 * skeleton, the grip, the upper and lower limbs and the immune system.
 *
 * **Each slot is the implant that fills it, never the body it fills.** A look names one object — a
 * co-processor wafer, a bio-pump, a knuckle-plate — and no limb or feature of a person, so the slots
 * are told apart by eleven different outlines. A fantasy world draws the enchantment or charm worn for
 * that system, and the age of steam a brass device.
 */
export const CYBERWARE_SLOTS: IconCatalogueGroup = {
  id: 'cyberware-slots',
  label: 'Cyberware slots',
  kind: 'ITEM',
  entries: [
    {
      id: 'cyberware-frontal-cortex',
      role: 'Frontal cortex implant slot',
      looks: {
        FANTASY: 'an enchanted amethyst circlet with a single glowing thought gem',
        AGE_OF_STEAM: 'a brass thinking-cap of meshing cogs and copper coils',
        MODERN: 'a small black neural implant chip with a gold contact grid',
        CYBERPUNK: 'a gunmetal cortex co-processor wafer with glowing cyan neural traces',
        SPACE_OPERA: 'a white crystalline cognition node ringed with soft blue light',
      },
    },
    {
      id: 'cyberware-operating-system',
      role: 'Operating system implant slot',
      looks: {
        FANTASY: 'a closed leather grimoire with iron corner clasps',
        AGE_OF_STEAM: 'a walnut-cased analytical engine with a brass punch-card feed',
        MODERN: 'a black ruggedised laptop folded shut',
        CYBERPUNK:
          'a matte black carbon cyberdeck with glowing cyan circuit seams and a coiled interface cable',
        SPACE_OPERA: 'a white alloy data core cylinder pulsing with soft blue light',
      },
    },
    {
      id: 'cyberware-ocular',
      role: 'Ocular system implant slot',
      looks: {
        FANTASY: 'a pair of enchanted crystal seeing-lenses in gold wire rims',
        AGE_OF_STEAM: 'a brass monocle with stacked magnifying lenses on a hinge',
        MODERN: 'a pair of black night-vision goggles with a green lens',
        CYBERPUNK: 'a gunmetal cyber-optic sphere with a segmented aperture and a glowing red iris ring',
        SPACE_OPERA: 'a white ocular sensor pod with a soft blue lens glow',
      },
    },
    {
      id: 'cyberware-circulatory',
      role: 'Circulatory system implant slot',
      looks: {
        FANTASY: 'a ruby heartstone pulsing in a gilded wire cage',
        AGE_OF_STEAM: 'a brass clockwork heart-pump with copper pipes',
        MODERN: 'a small titanium pacemaker with twin lead wires',
        CYBERPUNK: 'a gunmetal bio-pump with glowing red coolant lines and twin valve ports',
        SPACE_OPERA: 'a white plasma-circulation regulator capsule with soft blue flow rings',
      },
    },
    {
      id: 'cyberware-nervous',
      role: 'Nervous system implant slot',
      looks: {
        FANTASY: 'a silver spider-silk charm with quickening threads of light woven through it',
        AGE_OF_STEAM: 'a galvanic spinal coil of copper wire on a brass rod',
        MODERN: 'a black reflex-booster nerve stimulator with fine electrode leads',
        CYBERPUNK: 'a gunmetal synaptic accelerator module with glowing yellow nerve-lace filaments',
        SPACE_OPERA: 'a white neural lattice web pulsing with soft blue nodes',
      },
    },
    {
      id: 'cyberware-integumentary',
      role: 'Integumentary system implant slot',
      looks: {
        FANTASY: 'an enchanted stoneskin talisman of polished granite on a leather thong',
        AGE_OF_STEAM: 'a roll of riveted brass-scale mail',
        MODERN: 'a folded black ballistic-weave fabric patch',
        CYBERPUNK: 'a curled swatch of graphite subdermal armour mesh with glowing cyan hexagon cells',
        SPACE_OPERA: 'a white personal deflector disc casting a soft blue skin-tight energy film',
      },
    },
    {
      id: 'cyberware-skeleton',
      role: 'Skeleton implant slot',
      looks: {
        FANTASY: 'a carved bone totem with iron bands bound round it',
        AGE_OF_STEAM: 'a brass and steel spinal brace with riveted joints',
        MODERN: 'a titanium bone-plate with surgical screws',
        CYBERPUNK:
          'a jointed graphite endoskeleton spine of interlocking carbon vertebrae with glowing amber joint rings',
        SPACE_OPERA: 'a white alloy bone-lattice strut with soft blue nodes',
      },
    },
    {
      id: 'cyberware-grip',
      role: 'Grip implant slot',
      looks: {
        FANTASY: 'an iron knuckle-ring of strength set with a garnet',
        AGE_OF_STEAM: 'a brass knuckle-plate with tiny pistons',
        MODERN: 'a black grip-strength servo with a padded strap',
        CYBERPUNK: 'a gunmetal knuckle-plate with retractable blades and glowing crimson actuator joints',
        SPACE_OPERA: 'a white grip-amplifier band with soft blue force pads',
      },
    },
    {
      id: 'cyberware-upper-limb',
      role: 'Upper limb implant slot',
      looks: {
        FANTASY: 'a steel vambrace of giant strength set with a glowing topaz',
        AGE_OF_STEAM: 'a brass pneumatic ram with copper hoses and a pressure valve',
        MODERN: 'a black powered exoskeleton sleeve with steel actuators',
        CYBERPUNK: 'a pair of gunmetal monoblades folded along carbon housings with glowing crimson edges',
        SPACE_OPERA: 'a white hard-light blade emitter bracer with a soft blue edge',
      },
    },
    {
      id: 'cyberware-lower-limb',
      role: 'Lower limb implant slot',
      looks: {
        FANTASY: 'a pair of winged greaves of swiftness',
        AGE_OF_STEAM: 'a pair of brass spring-heeled greaves with coiled pistons',
        MODERN: 'a black carbon-fibre running-blade prosthetic',
        CYBERPUNK:
          'a gunmetal reverse-jointed jump servo with twin hydraulic pistons and glowing cyan thrust vents',
        SPACE_OPERA: 'a white anti-grav boot thruster with a soft blue lift ring',
      },
    },
    {
      id: 'cyberware-immune',
      role: 'Immune system implant slot',
      looks: {
        FANTASY: 'a sprig of blessed rue tied with a green thread',
        AGE_OF_STEAM: 'a brass vaporiser canister of carbolic with a glass sight window',
        MODERN: 'a small grey antitoxin auto-injector with a capped needle',
        CYBERPUNK: 'a graphite toxin-filter cartridge with glowing green filter vents',
        SPACE_OPERA: 'a white nanite-swarm vial with a soft blue glow',
      },
    },
  ],
};
