import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * What a character rides: fast and armoured ground mounts, a walker, a flyer, a water mount, a
 * hovering skiff, a beast and a mount that carries a passenger.
 *
 * **Every mount is drawn alone, saddled or with its cockpit open but with nobody on it.** A rider
 * would put a figure in every icon, so each look names the mount and its tack and nothing more, and
 * the sheet’s figure exclusion holds the whole shelf.
 */
export const MOUNTS: IconCatalogueGroup = {
  id: 'mounts',
  label: 'Mounts',
  kind: 'COMPANION',
  entries: [
    {
      id: 'mount-fast-ground',
      role: 'Fast ground mount',
      looks: {
        FANTASY: 'a galloping white warhorse in a red caparison with a polished steel chanfron',
        AGE_OF_STEAM: 'a brass steam velocipede with a tall smokestack and spoked iron wheels',
        MODERN: 'a red sport motorcycle with a low fairing and twin chrome exhausts',
        CYBERPUNK:
          'a low brushed-steel hover-bike with twin thruster pods, a cracked windscreen and a neon-violet underglow',
        SPACE_OPERA: 'a sleek white speeder bike with swept fins and twin glowing blue drive nozzles',
      },
    },
    {
      id: 'mount-armoured',
      role: 'Armoured ground mount',
      looks: {
        FANTASY: 'a war rhinoceros barded in plated steel armour with a spiked horn guard',
        AGE_OF_STEAM: 'a riveted iron steam tractor with armoured side plating and a tall smoking funnel',
        MODERN: 'a sand-coloured eight-wheeled armoured personnel carrier with a small roof turret',
        CYBERPUNK:
          'a six-wheeled matte-black troop carrier with hazard-striped bull bars and a glowing red sensor strip across its slit windscreen',
        SPACE_OPERA: 'a white hover tank with a smooth domed hull and a glowing blue repulsor skirt',
      },
    },
    {
      id: 'mount-walker',
      role: 'Walking war mount',
      looks: {
        FANTASY: 'a shaggy war mammoth in a studded leather harness with iron-capped tusks',
        AGE_OF_STEAM: 'a two-legged brass steam strider with a riveted boiler body and hissing piston legs',
        MODERN: 'a yellow walking excavator on four hydraulic legs with its cab perched on top',
        CYBERPUNK:
          'a two-legged gunmetal mech walker with reverse-jointed legs, an open pilot cockpit and a single glowing red sensor eye',
        SPACE_OPERA: 'a tall white bipedal walker with a rounded cockpit pod and glowing blue knee joints',
      },
    },
    {
      id: 'mount-flying',
      role: 'Flying mount',
      looks: {
        FANTASY: 'a gryphon with spread eagle wings, a tawny lion body and a leather saddle',
        AGE_OF_STEAM: 'a brass ornithopter with ribbed canvas wings and a small steam boiler',
        MODERN: 'a yellow open-cockpit gyrocopter with a long overhead rotor',
        CYBERPUNK:
          'a tilt-rotor aerodyne with a black steel hull, two ducted fans angled upward and neon-cyan running lights',
        SPACE_OPERA: 'a sleek white starfighter with swept wings and twin glowing blue engines',
      },
    },
    {
      id: 'mount-aquatic',
      role: 'Water mount',
      looks: {
        FANTASY: 'a giant sea turtle with a barnacled shell and a leather saddle',
        AGE_OF_STEAM: 'a riveted brass submersible with round portholes and a spinning propeller',
        MODERN: 'a red jet ski kicking up a burst of white spray',
        CYBERPUNK:
          'a black jet ski on brushed-steel hydrofoil struts with neon-cyan hull strips and a glowing turbine intake',
        SPACE_OPERA: 'a white teardrop hydro-skimmer pod trailing a glowing blue wake',
      },
    },
    {
      id: 'mount-skiff',
      role: 'Hovering skiff mount',
      looks: {
        FANTASY: 'a flying carpet with a tasselled fringe and woven gold patterns',
        AGE_OF_STEAM: 'a brass-hulled sky skiff hung beneath a small canvas gasbag with a rear propeller',
        MODERN: 'a grey hovercraft with an inflated black skirt and a caged rear fan',
        CYBERPUNK:
          'an open grav-skiff of scuffed steel deck plating with a low rail and amber grav emitters glowing underneath',
        SPACE_OPERA:
          'a white antigravity platform with a curved rail and a ring of soft blue repulsor lights',
      },
    },
    {
      id: 'mount-beast',
      role: 'Beast mount',
      looks: {
        FANTASY: 'a snarling dire wolf in a leather saddle and an iron-studded collar',
        AGE_OF_STEAM: 'a clockwork brass lion with exposed gears and a riveted copper mane',
        MODERN: 'a mud-splattered all-terrain quad bike with knobbly tyres',
        CYBERPUNK:
          'a sleek robotic panther of matte-black armour plates with exposed brushed-steel joints and glowing red eyes',
        SPACE_OPERA: 'a white six-legged alien beast with a smooth plated hide and glowing blue seams',
      },
    },
    {
      id: 'mount-two-seat',
      role: 'Two-seat passenger mount',
      looks: {
        FANTASY: 'a great elk with broad antlers and a tandem leather saddle',
        AGE_OF_STEAM: 'a brass steam carriage with a tandem leather bench and a tall funnel',
        MODERN: 'a white two-seat golf buggy with a canvas canopy',
        CYBERPUNK:
          'a matte-black sidecar motorbike with neon-cyan wheel rims and a brushed-steel bullet-shaped sidecar',
        SPACE_OPERA: 'a white two-seat hover car with a bubble canopy and a glowing blue drive ring',
      },
    },
  ],
};
