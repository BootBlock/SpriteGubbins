import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The emote wheel: the gestures a player makes at another, from a wave and a bow to a shrug, a roar
 * and a peace sign.
 *
 * **Every entry declares `figure`, because an emote is nothing but one.** The sheet’s exclusions ban a
 * hand or a figure no entry names, and a wave with no hand is no wave. Each look draws one figure or
 * one or two hands and says exactly what they do, so the gesture reads from its silhouette at 32 px.
 */
export const EMOTES: IconCatalogueGroup = {
  id: 'emotes',
  label: 'Emotes',
  kind: 'SOCIAL',
  entries: [
    {
      id: 'emote-wave',
      role: 'Wave emote',
      figure: true,
      looks: {
        FANTASY: 'an armoured gauntlet raised with its open palm tilted mid-wave',
        AGE_OF_STEAM:
          'a white-gloved hand raised with its open palm tilted mid-wave, a brass cufflink at the cuff',
        MODERN: 'a flat yellow cartoon hand raised with its open palm tilted mid-wave',
        CYBERPUNK:
          'a chrome cyber-hand raised with its open palm tilted mid-wave, its knuckle diodes glowing neon cyan',
        SPACE_OPERA:
          'a white-armoured glove raised with its open palm tilted mid-wave, a pale-blue light at its wrist seam',
      },
    },
    {
      id: 'emote-bow',
      role: 'Bow emote',
      figure: true,
      looks: {
        FANTASY:
          'a hooded adventurer silhouette bowing deeply from the waist, one arm folded across its chest',
        AGE_OF_STEAM: 'a top-hatted silhouette bowing from the waist, its hat swept off in one hand',
        MODERN: 'a flat cartoon figure bowing from the waist with both arms straight at its sides',
        CYBERPUNK:
          'a neon wireframe avatar bowing low from the waist with one chrome arm across its chest, its seams glowing cyan',
        SPACE_OPERA:
          'a pale holographic crew avatar in a white uniform bowing from the waist, both arms at its sides',
      },
    },
    {
      id: 'emote-salute',
      role: 'Salute emote',
      figure: true,
      looks: {
        FANTASY: 'an armoured gauntlet clenched into a fist and pressed to a dented breastplate in salute',
        AGE_OF_STEAM: 'a top-hatted silhouette touching two fingers to the brim of its hat in salute',
        MODERN: 'a round smiley-style face with a flat cartoon hand held level at its brow in salute',
        CYBERPUNK:
          'a chrome android face-plate with diode eyes, a chrome cyber-hand snapped flat to its brow in salute',
        SPACE_OPERA:
          'a white-armoured glove held flat and level at the brow of a white helmet visor in salute',
      },
    },
    {
      id: 'emote-cheer',
      role: 'Cheer emote',
      figure: true,
      looks: {
        FANTASY: 'a hooded adventurer silhouette leaping with both arms thrown up in triumph',
        AGE_OF_STEAM: 'a top-hatted silhouette tossing its hat into the air with both arms raised',
        MODERN:
          'a round smiley-style face with a wide open grin and two flat cartoon hands thrown up beside it',
        CYBERPUNK:
          'a holographic street-kid avatar in a hoodie leaping with both fists punched skyward, neon-cyan glitch edges round it',
        SPACE_OPERA:
          'a pale holographic crew avatar with both arms flung high and a small white starburst above it',
      },
    },
    {
      id: 'emote-laugh',
      role: 'Laugh emote',
      figure: true,
      looks: {
        FANTASY:
          'a carved wooden mask with a wide open grinning mouth and eyes squeezed into upturned crescents',
        AGE_OF_STEAM:
          'a brass automaton face with its hinged jaw dropped open in laughter and its eyelids squeezed into crescents',
        MODERN: 'a round yellow smiley-style face laughing with its mouth wide open and two teardrops of joy',
        CYBERPUNK: 'a holographic street-kid avatar in a hoodie doubled over laughing, its mouth wide open',
        SPACE_OPERA: 'a pale holographic crew avatar thrown back in laughter, one hand clutching its belly',
      },
    },
    {
      id: 'emote-cry',
      role: 'Cry emote',
      figure: true,
      looks: {
        FANTASY:
          'a carved wooden mask with downturned brows and a single blue tear carved running down from one eye',
        AGE_OF_STEAM:
          'a brass automaton face leaking a drip of black oil like a tear from one riveted eye socket',
        MODERN: 'a round smiley-style face with a downturned mouth and two streams of blue tears',
        CYBERPUNK:
          'a chrome android face-plate with drooping diode eyes and a trickle of glowing cyan coolant running down like tears',
        SPACE_OPERA:
          'a pale holographic crew avatar with its head bowed into one hand, a single bright tear falling',
      },
    },
    {
      id: 'emote-dance',
      role: 'Dance emote',
      figure: true,
      looks: {
        FANTASY:
          'a hooded adventurer silhouette mid-jig on one foot, its cloak swirling and both arms flung out',
        AGE_OF_STEAM:
          'a top-hatted silhouette mid-twirl with a cane held out in one hand and one leg kicked high',
        MODERN:
          'a flat cartoon figure mid-dance with one hip out, one arm pointing up and the other on its hip',
        CYBERPUNK:
          'a neon wireframe avatar mid-dance with one arm pointed skyward and one knee raised, its outline pulsing violet',
        SPACE_OPERA:
          'a pale holographic crew avatar spinning on one toe with both arms held out in a graceful arc',
      },
    },
    {
      id: 'emote-point',
      role: 'Point emote',
      figure: true,
      looks: {
        FANTASY: 'an armoured gauntlet with its index finger thrust forward to point ahead',
        AGE_OF_STEAM: 'a white-gloved hand with its index finger extended in a crisp point to the right',
        MODERN: 'a flat cartoon hand with its index finger extended to point to the right, its thumb tucked',
        CYBERPUNK:
          'a chrome cyber-hand with its index finger extended to point, a thin neon-red laser beam running from the fingertip',
        SPACE_OPERA:
          'a white-armoured glove pointing its index finger forward, a pale-blue target ring at the fingertip',
      },
    },
    {
      id: 'emote-thumbs-up',
      role: 'Thumbs-up emote',
      figure: true,
      looks: {
        FANTASY: 'an armoured gauntlet clenched into a fist with its thumb raised straight up',
        AGE_OF_STEAM: 'a riveted brass automaton hand in a fist with its jointed thumb raised straight up',
        MODERN: 'a flat yellow cartoon hand in a fist with its thumb raised straight up',
        CYBERPUNK:
          'a chrome cyber-hand in a fist with its thumb raised straight up, its knuckle diodes glowing green',
        SPACE_OPERA:
          'a white-armoured glove in a fist with its thumb raised, a pale-blue light along its knuckles',
      },
    },
    {
      id: 'emote-thumbs-down',
      role: 'Thumbs-down emote',
      figure: true,
      looks: {
        FANTASY: 'an armoured gauntlet clenched into a fist with its thumb jabbed straight down',
        AGE_OF_STEAM: 'a white-gloved hand in a fist with its thumb turned straight down',
        MODERN: 'a flat yellow cartoon hand in a fist with its thumb pointing straight down',
        CYBERPUNK:
          'a chrome cyber-hand in a fist with its thumb pointing straight down, its knuckle diodes glowing red',
        SPACE_OPERA:
          'a white-armoured glove in a fist with its thumb pointing down, a dim red light along its knuckles',
      },
    },
    {
      id: 'emote-shrug',
      role: 'Shrug emote',
      figure: true,
      looks: {
        FANTASY:
          'a hooded adventurer silhouette with its shoulders hunched up and both palms turned up and out',
        AGE_OF_STEAM:
          'a top-hatted silhouette with its shoulders raised and both white-gloved palms turned up and out',
        MODERN:
          'a round smiley-style face with a flat crooked mouth and two flat cartoon hands raised palms up beside it',
        CYBERPUNK:
          'a holographic street-kid avatar in a hoodie with its shoulders hunched and both palms turned up, its outline flickering cyan',
        SPACE_OPERA:
          'a pale holographic crew avatar with its shoulders raised and both palms turned up and out',
      },
    },
    {
      id: 'emote-facepalm',
      role: 'Facepalm emote',
      figure: true,
      looks: {
        FANTASY: 'a carved wooden mask with an armoured gauntlet clapped flat across its eyes',
        AGE_OF_STEAM:
          'a brass automaton face with its riveted hand pressed flat over its eyes and a puff of steam from its collar',
        MODERN: 'a round smiley-style face with a flat cartoon hand slapped over its eyes',
        CYBERPUNK:
          'a chrome android face-plate with a chrome cyber-hand pressed over its diode eyes, the eyes glowing red between the fingers',
        SPACE_OPERA: 'a pale holographic crew avatar with its head dropped forward into one palm',
      },
    },
    {
      id: 'emote-clap',
      role: 'Clap emote',
      figure: true,
      looks: {
        FANTASY:
          'a pair of armoured gauntlets meeting palm to palm in a clap, a small burst of sparks between them',
        AGE_OF_STEAM: 'a pair of white-gloved hands meeting palm to palm in a clap',
        MODERN: 'a pair of flat cartoon hands meeting palm to palm with a small starburst between them',
        CYBERPUNK:
          'a pair of chrome cyber-hands meeting palm to palm, a ring of neon-cyan light bursting from the impact',
        SPACE_OPERA:
          'a pair of white-armoured gloves meeting palm to palm, a pale-blue ring of light flashing between them',
      },
    },
    {
      id: 'emote-flex',
      role: 'Flex emote',
      figure: true,
      looks: {
        FANTASY: 'an armoured arm bent at the elbow with its bicep bulging under a dented iron vambrace',
        AGE_OF_STEAM:
          'a brass automaton arm bent at the elbow, its riveted bicep swollen and a puff of steam at the joint',
        MODERN: 'a flat cartoon arm bent at the elbow with a bulging bicep and a clenched fist',
        CYBERPUNK:
          'a chrome cyber-arm bent at the elbow with a bulging hydraulic bicep and glowing knuckle diodes',
        SPACE_OPERA:
          'a white-armoured arm bent at the elbow with its bicep plate swelling and a pale-blue light at the joint',
      },
    },
    {
      id: 'emote-sit',
      role: 'Sit emote',
      figure: true,
      looks: {
        FANTASY: 'a hooded adventurer silhouette sitting cross-legged with its hands resting on its knees',
        AGE_OF_STEAM: 'a top-hatted silhouette seated with its legs crossed and a cane laid across its lap',
        MODERN: 'a flat cartoon figure sitting with its knees drawn up and both arms wrapped round them',
        CYBERPUNK:
          'a holographic street-kid avatar in a hoodie sitting slouched with its knees up and its elbows on them',
        SPACE_OPERA:
          'a pale holographic crew avatar sitting cross-legged in mid-air with its hands on its knees',
      },
    },
    {
      id: 'emote-sleep',
      role: 'Sleep emote',
      figure: true,
      looks: {
        FANTASY:
          'a carved wooden mask with its eyes carved shut, a small crescent moon and three drifting bubbles above it',
        AGE_OF_STEAM:
          'a brass automaton face with its shuttered eyelids closed, a crescent moon and three bubbles drifting from its collar valve',
        MODERN:
          'a round smiley-style face with closed curved eyes, a small crescent moon and three drifting bubbles above it',
        CYBERPUNK:
          'a chrome android face-plate with its diode eyes dimmed to closed slits, a neon crescent moon and three glowing bubbles drifting above it',
        SPACE_OPERA:
          'a pale holographic crew avatar curled asleep with closed eyes, a white crescent moon and three drifting bubbles above it',
      },
    },
    {
      id: 'emote-kneel',
      role: 'Kneel emote',
      figure: true,
      looks: {
        FANTASY:
          'a hooded adventurer silhouette kneeling on one knee with both hands resting on a sword hilt',
        AGE_OF_STEAM: 'a top-hatted silhouette down on one knee with its hat held to its chest',
        MODERN: 'a flat cartoon figure kneeling on one knee with its head bowed',
        CYBERPUNK:
          'a neon wireframe avatar kneeling on one knee with one chrome fist planted down, its outline glowing cyan',
        SPACE_OPERA:
          'a white-armoured trooper silhouette kneeling on one knee with its head bowed and one palm on its knee',
      },
    },
    {
      id: 'emote-heart',
      role: 'Heart emote',
      figure: true,
      looks: {
        FANTASY: 'a pair of armoured gauntlets curved together with their fingers and thumbs shaping a heart',
        AGE_OF_STEAM:
          'a pair of white-gloved hands curved together with fingertips and thumbs shaping a heart',
        MODERN:
          'a pair of flat cartoon hands curved together into a heart shape with a small red heart inside',
        CYBERPUNK: 'a pair of chrome cyber-hands shaping a heart, the gap between them glowing crimson',
        SPACE_OPERA:
          'a pair of white-armoured gloves shaping a heart around a small pale-blue holographic heart',
      },
    },
    {
      id: 'emote-angry',
      role: 'Angry emote',
      figure: true,
      looks: {
        FANTASY: 'a carved wooden mask painted red with heavy furrowed brows and bared teeth',
        AGE_OF_STEAM:
          'a brass automaton face with slanted brow plates and steam jetting from both ear valves',
        MODERN: 'a round red smiley-style face with furrowed brows and a tight downturned frown',
        CYBERPUNK:
          'a chrome android face-plate with its diode eyes narrowed into hot-red slashes and its jaw grille clenched',
        SPACE_OPERA:
          'a pale holographic crew avatar with clenched fists at its sides, its outline flickering red',
      },
    },
    {
      id: 'emote-beg',
      role: 'Beg emote',
      figure: true,
      looks: {
        FANTASY: 'a hooded adventurer silhouette on its knees with both cupped hands held up',
        AGE_OF_STEAM: 'a pair of white-gloved hands cupped together and held up, palms open',
        MODERN:
          'a round smiley-style face with huge pleading eyes and two flat cartoon hands pressed together beneath it',
        CYBERPUNK:
          'a holographic street-kid avatar in a hoodie on its knees with both cupped hands held up, its outline glowing amber',
        SPACE_OPERA:
          'a pair of white-armoured gloves pressed palm to palm in a plea, a pale-blue glow round them',
      },
    },
    {
      id: 'emote-roar',
      role: 'Roar emote',
      figure: true,
      looks: {
        FANTASY: 'a carved wooden war mask with its mouth flung wide in a roar and its fangs bared',
        AGE_OF_STEAM:
          'a brass automaton face with its hinged jaw flung wide and a blast of steam roaring from its mouth',
        MODERN:
          'a round smiley-style face with its mouth stretched wide in a roar and three curved sound waves leaving it',
        CYBERPUNK:
          'a chrome android face-plate with its jaw grille wide open in a roar, glowing neon sound rings blasting from it',
        SPACE_OPERA:
          'a pale holographic crew avatar with its head thrown back and fists clenched in a roar, rings of light leaving its mouth',
      },
    },
    {
      id: 'emote-peace',
      role: 'Peace-sign emote',
      figure: true,
      looks: {
        FANTASY:
          'an armoured gauntlet raised with its index and middle fingers spread apart and the rest curled',
        AGE_OF_STEAM: 'a white-gloved hand raised palm out with its index and middle fingers spread apart',
        MODERN: 'a flat cartoon hand raised palm out with two fingers spread apart in a peace sign',
        CYBERPUNK:
          'a chrome cyber-hand flashing a peace sign with two fingers spread, its knuckle diodes glowing violet',
        SPACE_OPERA:
          'a white-armoured glove raised palm out with two fingers spread apart, a pale-blue light at its wrist',
      },
    },
  ],
};
