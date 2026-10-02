import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * Consumables that put back what a fight takes: health, the ability resource, stamina, and a cleared
 * affliction.
 *
 * **Three healing tiers that differ in size and in nothing else a player could misread.** An action bar
 * holds the minor and the major side by side, so each look grows the same object rather than swapping
 * it for another: a slim injector against a heavy one, a small vial against a large flask.
 */
export const RESTORATIVES: IconCatalogueGroup = {
  id: 'restoratives',
  label: 'Restoratives',
  kind: 'ITEM',
  entries: [
    {
      id: 'heal-minor',
      role: 'Minor healing consumable',
      looks: {
        FANTASY: 'a small round glass vial of red potion, stoppered with cork',
        AGE_OF_STEAM: 'a small brown apothecary bottle of red tonic with a wax-sealed stopper',
        MODERN: 'a compact first-aid pouch with a red cross panel and a zip pull',
        CYBERPUNK: 'a slim red stim-pack auto-injector, needle capped, with a glowing amber dose window',
        SPACE_OPERA: 'a palm-sized white medi-gel capsule with a soft red glow at its core',
      },
    },
    {
      id: 'heal-standard',
      role: 'Healing consumable',
      looks: {
        FANTASY: 'a pear-shaped glass flask of red potion with a twine-tied cork',
        AGE_OF_STEAM: 'a ribbed green-glass tonic bottle of red elixir with a brass cap',
        MODERN: 'a white first-aid kit box with a red cross and a moulded carry handle',
        CYBERPUNK:
          'a twin-chamber red trauma injector with a chrome plunger and two glowing amber dose windows',
        SPACE_OPERA: 'a long white medi-gel cartridge, its red core pulsing through frosted casing',
      },
    },
    {
      id: 'heal-major',
      role: 'Major healing consumable',
      looks: {
        FANTASY: 'a large round-bellied flask of glowing red potion with a gilded stopper',
        AGE_OF_STEAM: 'a tall brass-banded glass carboy of red restorative with a pressure valve',
        MODERN: 'an orange trauma bag with a red cross, side pockets and a shoulder strap',
        CYBERPUNK:
          'a heavy red trauma-pack injector gun with a pistol grip, a hazard-striped barrel and a bright amber cartridge',
        SPACE_OPERA: 'a red nanite-repair canister with a glowing ring at its waist and a domed white cap',
      },
    },
    {
      id: 'mana-minor',
      role: 'Minor ability-resource restorative',
      looks: {
        FANTASY: 'a small round glass vial of blue potion, stoppered with cork',
        AGE_OF_STEAM: 'a small cobalt-glass bottle of blue tincture with a wax-sealed stopper',
        MODERN: 'a slim blue energy-drink can with a ring pull',
        CYBERPUNK:
          'a slim cyan neuro-boost auto-injector with a capped needle and a glowing cyan dose window',
        SPACE_OPERA: 'a small faceted blue energy crystal held in a white clip-on cell',
      },
    },
    {
      id: 'mana-major',
      role: 'Major ability-resource restorative',
      looks: {
        FANTASY: 'a large round-bellied flask of glowing blue potion with a silver stopper',
        AGE_OF_STEAM: 'a tall cobalt-glass carboy of blue aether tincture caged in brass wire',
        MODERN: 'a tall blue sports-drink bottle with a flip-up sport cap',
        CYBERPUNK:
          'a chunky cyan neural-charge cartridge with chrome contacts at one end and a bright cyan level bar down its side',
        SPACE_OPERA: 'a large blue energy crystal locked into a white power cell with glowing seams',
      },
    },
    {
      id: 'stamina-restore',
      role: 'Stamina restorative',
      looks: {
        FANTASY: 'a small glass vial of bright yellow-green draught with a leather-tied stopper',
        AGE_OF_STEAM: 'a dented tin flask of strong coffee with a hinged cap',
        MODERN: 'a foil energy-gel sachet with a tear-off corner',
        CYBERPUNK: 'a yellow adrenal-spike injector pen with a chrome tip and a blinking yellow charge light',
        SPACE_OPERA: 'a yellow glucose-pod capsule with a white grip band and a soft yellow glow',
      },
    },
    {
      id: 'cure-poison',
      role: 'Poison cure',
      looks: {
        FANTASY: 'a squat green glass vial of antidote with a sprig of herb tied to its neck',
        AGE_OF_STEAM: 'a small amber bottle of antivenom with a cork and a paper-tied neck',
        MODERN: 'a white blister pack of green antidote tablets',
        CYBERPUNK: 'a green detox injector with a twin-needle tip and a glowing green purge window',
        SPACE_OPERA: 'a green purifier capsule with a white mesh strainer cap',
      },
    },
    {
      id: 'cure-affliction',
      role: 'Disease and curse cure',
      looks: {
        FANTASY: 'a white ceramic phial of holy water sealed with a gold wax drop',
        AGE_OF_STEAM: 'a small round tin of medicinal salve with a stamped lid',
        MODERN: 'a white pill bottle with a child-proof cap and a blue band',
        CYBERPUNK: 'a white antiviral cartridge with a violet glowing purge ring and chrome end caps',
        SPACE_OPERA: 'a white sterilisation wand with a violet light at its tip',
      },
    },
    {
      id: 'bandage',
      role: 'Bandage',
      looks: {
        FANTASY: 'a rolled linen bandage with a loose trailing end',
        AGE_OF_STEAM: 'a rolled cotton bandage pinned with a brass safety pin',
        MODERN: 'a rolled crepe bandage with a metal clip',
        CYBERPUNK: 'a roll of grey synth-skin tape with a glowing green seam down its length',
        SPACE_OPERA: 'a folded white bio-weave patch with a soft blue glowing grid',
      },
    },
    {
      id: 'regeneration',
      role: 'Healing-over-time consumable',
      looks: {
        FANTASY: 'a stoppered glass vial of red potion with a slow spiral of light inside',
        AGE_OF_STEAM: 'a glass dropper bottle of red tincture with a rubber bulb',
        MODERN: 'a round adhesive medical patch with a red centre',
        CYBERPUNK: 'a red regen-patch dermal pad with a ring of tiny glowing amber diodes',
        SPACE_OPERA: 'a red nanite drip-pod with a white collar and a trickle of glowing particles',
      },
    },
    {
      id: 'revive',
      role: 'Revive consumable',
      looks: {
        FANTASY: 'a golden feather resting across a small white-and-gold phial',
        AGE_OF_STEAM: 'a brass-and-glass galvanic resuscitator with two copper paddles',
        MODERN: 'a yellow defibrillator case with a lightning-bolt panel',
        CYBERPUNK: 'a pair of chrome defib paddles with coiled red cables and crackling blue charge',
        SPACE_OPERA: 'a white revival beacon with a gold halo ring of light above it',
      },
    },
    {
      id: 'elixir',
      role: 'Full restoration consumable',
      looks: {
        FANTASY: 'a crystal decanter of swirling red and blue potion with a gold stopper',
        AGE_OF_STEAM: 'an ornate brass-caged bottle of luminous golden elixir',
        MODERN: 'a gold-capped glass vial in a padded protective case',
        CYBERPUNK: 'a gold-cased military-grade combat injector with a red and cyan double chamber',
        SPACE_OPERA: 'a gold full-restoration canister with a red and blue swirling glow behind glass',
      },
    },
  ],
};
