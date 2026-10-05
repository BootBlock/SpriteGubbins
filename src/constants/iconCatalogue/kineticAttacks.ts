import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The kinetic school’s attacks: a direct hit, an area blast, a bleed, a channelled barrage, a
 * finisher, a sunder and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is kinetic, so the
 * prompt leads each with steel grey and no look names another school’s hue. What keeps the seven apart
 * on an action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a ring
 * for the blast, a lingering wound for the bleed, a straight line for the barrage, a heavy weapon for
 * the finisher, a cracked plate for the sunder and the largest weapon for the ultimate.
 */
export const KINETIC_ATTACKS: IconCatalogueGroup = {
  id: 'kinetic-attacks',
  label: 'Kinetic attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'kinetic-strike',
      role: 'Kinetic direct-hit attack',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a steel-tipped arrow in mid-flight with a white streak of air behind its fletching',
        AGE_OF_STEAM: 'a brass-cased rifle bullet leaving a steel muzzle in a ring of white smoke',
        MODERN: 'a copper-jacketed pistol round punching through a dented steel plate',
        CYBERPUNK:
          'a brushed-steel smart-round with flared seeker fins curving mid-flight towards a grey target-lock ring',
        SPACE_OPERA: 'a dense white mass-driver slug ringed by a rippling grey gravity wake',
      },
    },
    {
      id: 'kinetic-blast',
      role: 'Kinetic area blast',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a whirlwind of three steel swords spinning in a ring round a grey burst of dust',
        AGE_OF_STEAM: 'a cast-iron shrapnel shell bursting into a ring of jagged iron fragments',
        MODERN: 'a black breaching charge bursting outward in a ring of grey concrete chunks',
        CYBERPUNK:
          'a brushed-steel seismic charge bursting in a flat ring of shockwave and jagged steel shrapnel',
        SPACE_OPERA: 'a white gravitic nova orb flinging a ring of grey hull fragments outward',
      },
    },
    {
      id: 'kinetic-over-time',
      role: 'Kinetic damage over time',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a serrated steel dagger with three dark drops falling from its tip',
        AGE_OF_STEAM:
          'a coil of barbed iron wire wrapped tight round a brass rod, dark drops beading on its barbs',
        MODERN: 'a jagged steel shrapnel fragment lodged in torn kevlar, dark drops seeping from the tear',
        CYBERPUNK:
          'a loop of glinting monowire cinched round a sliced brushed-steel servo, dark hydraulic fluid dripping from the cut',
        SPACE_OPERA:
          'a white micro-singularity bead lodged in a cracked hull plate, grey flakes spiralling into it',
      },
    },
    {
      id: 'kinetic-channel',
      role: 'Kinetic channelled attack',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a drawn longbow loosing a tight straight volley of five steel-tipped arrows',
        AGE_OF_STEAM:
          'a brass Gatling gun with a spinning barrel cluster spitting a straight stream of white flashes',
        MODERN: 'a black belt-fed machine gun firing a straight line of brass tracer rounds',
        CYBERPUNK:
          'a black-and-steel smart-gun on a gyro stabiliser holding a tight steel-grey line of tracking rounds on a sparking brushed-steel target',
        SPACE_OPERA: 'a white tractor-beam emitter holding a straight rippling grey gravity column',
      },
    },
    {
      id: 'kinetic-finisher',
      role: 'Kinetic finisher',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a huge steel executioner’s axe in a downward swing, a white arc trailing its edge',
        AGE_OF_STEAM:
          'a massive riveted steam-hammer piston driving down with a jet of white steam behind it',
        MODERN: 'a black sledgehammer striking down onto a cracked steel plate in a spray of white sparks',
        CYBERPUNK:
          'a gorilla-strength brushed-steel hydraulic ram, its pistons flared, driving a blunt steel striking block through a black ballistic plate',
        SPACE_OPERA: 'a white power-hammer piston driving a dense grey singularity forward',
      },
    },
    {
      id: 'kinetic-vulnerability',
      role: 'Kinetic vulnerability debuff',
      school: 'KINETIC',
      looks: {
        FANTASY: 'a dented steel breastplate split down its centre by a deep crack',
        AGE_OF_STEAM: 'a riveted iron armour plate with its rivets sheared and a crack running between them',
        MODERN: 'a cracked ceramic body-armour plate with a white crosshair marker over the fracture',
        CYBERPUNK:
          'a brushed-steel subdermal armour plate with a smart-gun targeting reticle locked over a spiderweb crack, its plating flaking away',
        SPACE_OPERA:
          'a white hull-armour plate dimpled inward by a grey gravity well, a targeting ring round the dent',
      },
    },
    {
      id: 'kinetic-ultimate',
      role: 'Kinetic ultimate',
      school: 'KINETIC',
      looks: {
        FANTASY:
          'a colossal steel greatsword plunged point-down, a ring of shattered stone erupting round its blade',
        AGE_OF_STEAM: 'a towering riveted steam cannon firing a single iron shell in a belch of white steam',
        MODERN:
          'a black anti-materiel rifle with a long fluted barrel and a huge muzzle brake firing a white blast',
        CYBERPUNK:
          'a hulking brushed-steel railgun with split rails crackling with steel-grey arcs, its slug tearing a shockwave cone through the air',
        SPACE_OPERA:
          'a white starship mass driver firing a black singularity round wreathed in a warped grey ring',
      },
    },
  ],
};
