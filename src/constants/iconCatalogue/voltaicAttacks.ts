import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The voltaic school’s attacks: a direct hit, an area blast, a lingering shock, a channelled arc, a
 * finisher, a conductivity mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is voltaic, so the
 * prompt leads each with electric blue and no look names another school’s hue. What keeps the seven
 * apart on an action bar is the shape each slot keeps on every attack shelf: a projectile for the hit,
 * a ring for the blast, dripping sparks for the shock, a continuous arc for the channel, a heavy weapon
 * for the finisher, a marked plate for the conductivity and the largest showpiece for the ultimate.
 */
export const VOLTAIC_ATTACKS: IconCatalogueGroup = {
  id: 'voltaic-attacks',
  label: 'Voltaic attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'voltaic-strike',
      role: 'Voltaic direct-hit attack',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a forked blue lightning bolt striking down from a small dark storm cloud',
        AGE_OF_STEAM: 'a brass galvanic pistol with a glass coil chamber firing a crackling blue spark',
        MODERN: 'a black taser pistol firing two barbed probes on crackling blue wires',
        CYBERPUNK:
          'a pair of chrome taser darts trailing coiled wire, crackling blue arcs leaping between their barbs',
        SPACE_OPERA: 'a white ion pistol firing a tight blue ion bolt',
      },
    },
    {
      id: 'voltaic-blast',
      role: 'Voltaic area blast',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a thunderclap ring of blue lightning bursting outward from a crackling storm orb',
        AGE_OF_STEAM: 'a brass-capped Leyden jar bursting in a ring of crackling blue arcs',
        MODERN: 'a sparking grey substation junction box blowing out in a ring of blue electric arcs',
        CYBERPUNK:
          'a black EMP grenade with chrome end caps detonating in a round blue pulse ring of crackling arcs',
        SPACE_OPERA: 'a white ion-storm generator releasing a round shockwave of crackling blue ions',
      },
    },
    {
      id: 'voltaic-over-time',
      role: 'Voltaic damage over time',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a small dark storm cloud dripping a slow rain of tiny blue sparks',
        AGE_OF_STEAM: 'a frayed brass-sheathed cable dripping crackling blue sparks',
        MODERN: 'a snapped black power line dangling and spitting blue sparks',
        CYBERPUNK:
          'an overloaded chrome power cell, swollen and leaking crackling blue arcs from a split seam',
        SPACE_OPERA: 'a white ion-charge limpet clamped to a hull plate, pulsing out blue ion crackles',
      },
    },
    {
      id: 'voltaic-channel',
      role: 'Voltaic channelled attack',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a storm-forged staff loosing a continuous chain of blue lightning',
        AGE_OF_STEAM:
          'a brass Tesla coil throwing a continuous crackling blue bolt straight out from its torus',
        MODERN: 'a black stun baton with a continuous blue arc dancing between its twin prongs',
        CYBERPUNK:
          'a chrome arc-thrower cannon with coiled capacitor rings, holding a continuous jagged blue arc on its target',
        SPACE_OPERA: 'a white ion-cannon emitter firing a steady straight beam of blue ions',
      },
    },
    {
      id: 'voltaic-finisher',
      role: 'Voltaic finisher',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a massive thunder hammer crashing down wreathed in a bolt of blue lightning',
        AGE_OF_STEAM: 'a heavy brass galvanic maul with a Leyden-jar core discharging in a blue flash',
        MODERN: 'a black high-voltage stun lance discharging one huge blue arc',
        CYBERPUNK:
          'a chrome shock-maul with stacked capacitor rings fully charged, discharging one massive blue arc on impact',
        SPACE_OPERA: 'a white ion pike bursting with a single overcharged blue discharge',
      },
    },
    {
      id: 'voltaic-vulnerability',
      role: 'Voltaic vulnerability debuff',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a dented steel breastplate with a glowing blue storm sigil crackling at its centre',
        AGE_OF_STEAM: 'a copper conductor plate wired to two brass terminals, a blue spark jumping across it',
        MODERN: 'a wet steel plate with a crackling blue arc spreading across its puddled coating',
        CYBERPUNK:
          'a chrome conductive-tagging dart stuck in black armour plating, a blue diode blinking and arcs skittering across the plate',
        SPACE_OPERA:
          'a white shield emitter flickering with blue ion burns, its energy dome breaking into crackling patches',
      },
    },
    {
      id: 'voltaic-ultimate',
      role: 'Voltaic ultimate',
      school: 'VOLTAIC',
      looks: {
        FANTASY: 'a swirling storm vortex crowned by a huge forked blue lightning bolt',
        AGE_OF_STEAM:
          'a colossal brass Tesla tower crowned with a copper torus, throwing out crackling blue arcs',
        MODERN: 'a steel transmission pylon wreathed in a crackling blue arc storm',
        CYBERPUNK:
          'a black EMP warhead with chrome stabiliser fins, detonating in a vast crackling blue pulse dome',
        SPACE_OPERA: 'a white capital-ship ion cannon unleashing a vast blue ion storm',
      },
    },
  ],
};
