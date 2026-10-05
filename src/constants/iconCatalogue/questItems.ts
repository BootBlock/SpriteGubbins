import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The things a quest sends a player to carry, find or recover: a sealed dispatch, a relic, a chart
 * fragment, a power core, a ledger, a stolen package, a sample, a trophy and a beacon.
 *
 * **A quest item reads as important without saying why.** Nothing here carries writing, so a ledger
 * is drawn closed and a dispatch sealed, and each object earns its place through a seal, a glow or a
 * crack instead.
 */
export const QUEST_ITEMS: IconCatalogueGroup = {
  id: 'quest-items',
  label: 'Quest items',
  kind: 'ITEM',
  entries: [
    {
      id: 'quest-dispatch',
      role: 'Sealed dispatch',
      looks: {
        FANTASY: 'a rolled parchment scroll bound with a black ribbon and a red wax seal',
        AGE_OF_STEAM: 'a cream envelope closed with a red wax seal pressed with a winged crest',
        MODERN: 'a sealed manila envelope with a red string-and-button clasp',
        CYBERPUNK: 'a matte black data-courier envelope with a glowing red biometric seal',
        SPACE_OPERA: 'a sealed silver message cylinder with a pulsing blue ring',
      },
    },
    {
      id: 'quest-relic',
      role: 'Ancient relic',
      looks: {
        FANTASY: 'a tarnished golden chalice set with three red stones',
        AGE_OF_STEAM: 'a verdigris-green bronze astrolabe with interlocking rings',
        MODERN: 'a small carved stone totem in a clear museum display case',
        CYBERPUNK: 'a cracked pre-collapse server core with a single amber light still flickering inside',
        SPACE_OPERA: 'a smooth obsidian monolith fragment with pale blue lines of light tracing its edges',
      },
    },
    {
      id: 'quest-chart-fragment',
      role: 'Chart fragment',
      looks: {
        FANTASY: 'a torn corner of plain old parchment with a dotted trail ending in a red cross',
        AGE_OF_STEAM: 'a torn scrap of plain sea-stained parchment pinned beneath a brass compass',
        MODERN: 'a torn aerial photograph with a red circle drawn on it',
        CYBERPUNK: 'a cracked holo-chip projecting a jagged cyan wireframe of city blocks',
        SPACE_OPERA: 'a broken shard of star-chart crystal with a glowing constellation inside',
      },
    },
    {
      id: 'quest-power-core',
      role: 'Power core',
      looks: {
        FANTASY: 'a glowing orb of blue light cradled in a silver prong setting',
        AGE_OF_STEAM: 'a brass-caged glass globe of crackling lightning',
        MODERN: 'a heavy industrial battery cell with red and black terminals',
        CYBERPUNK: 'a hazard-striped brushed-steel fusion core cylinder with a blazing cyan plasma window',
        SPACE_OPERA: 'a floating white sphere with a rotating gold ring round a brilliant core',
      },
    },
    {
      id: 'quest-ledger',
      role: 'Evidence ledger',
      looks: {
        FANTASY: 'a closed leather-bound tome with brass corners and a clasp',
        AGE_OF_STEAM: 'a closed green clothbound ledger tied with a red ribbon',
        MODERN: 'a closed black notebook tucked in a clear evidence bag',
        CYBERPUNK: 'a scuffed black data-slate with a cracked cover and a blinking red light',
        SPACE_OPERA: 'a sealed cube of frosted glass with a blue data-shard suspended inside',
      },
    },
    {
      id: 'quest-stolen-package',
      role: 'Stolen package',
      looks: {
        FANTASY: 'a bundle wrapped in burlap and tied with rope',
        AGE_OF_STEAM: 'a brown-paper parcel tied with string, its wax customs seal torn',
        MODERN: 'a taped cardboard box with a torn corner',
        CYBERPUNK: 'a matte grey smuggling case with a snapped tamper seal sparking red',
        SPACE_OPERA: 'a dented silver cargo pod with a flickering red security beacon',
      },
    },
    {
      id: 'quest-sample',
      role: 'Collected sample',
      looks: {
        FANTASY: 'a small corked vial of shimmering green swamp water',
        AGE_OF_STEAM: 'a glass specimen jar of murky liquid with a brass screw lid',
        MODERN: 'a clear purple-capped sample tube in a zip-seal bag',
        CYBERPUNK: 'a brushed-steel bio-sample canister with a glowing green fluid window',
        SPACE_OPERA: 'a sealed cryo-tube of frosted glass around a violet glowing specimen',
      },
    },
    {
      id: 'quest-trophy',
      role: 'Trophy',
      looks: {
        FANTASY: 'a curved ivory tusk bound with leather at its base',
        AGE_OF_STEAM: 'a polished curling horn mounted on a small oak plaque',
        MODERN: 'a gilded trophy cup with two handles on a black base',
        CYBERPUNK:
          'a curved brushed-steel blade-horn torn from a war drone, still trailing a glowing red cable',
        SPACE_OPERA: 'a jagged iridescent horn trailing faint blue sparks',
      },
    },
    {
      id: 'quest-beacon',
      role: 'Signal beacon',
      looks: {
        FANTASY: 'a brass signal lantern with a bright flame behind its glass',
        AGE_OF_STEAM: 'a brass flare pistol loaded with a red cartridge',
        MODERN: 'an orange emergency radio beacon with a stub antenna',
        CYBERPUNK: 'a compact black transmitter puck with a spinning red strobe and a whip antenna',
        SPACE_OPERA: 'a white homing pylon with a pulsing blue light at its peak',
      },
    },
  ],
};
