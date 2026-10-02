import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The chat bar: one button for each channel a player can speak in, the emote wheel and the
 * microphone.
 *
 * **Channels are told apart by shape and motif, never by name.** No icon may carry lettering, so a
 * channel cannot be marked with its initial as a game interface usually marks it. Say is one plain
 * bubble, yell a jagged shout, and every other channel is a bubble carrying its own emblem: a group
 * of three for the party, a crest for the guild, a war chevron for the raid and a coin or scales for
 * trade.
 */
export const CHAT: IconCatalogueGroup = {
  id: 'chat',
  label: 'Chat',
  kind: 'SOCIAL',
  entries: [
    {
      id: 'chat-say',
      role: 'Say channel',
      looks: {
        FANTASY: 'a single plain parchment speech bubble with a short pointed tail',
        AGE_OF_STEAM: 'a single plain speech bubble of cream enamel with a thin brass rim and a short tail',
        MODERN: 'a single plain white speech bubble with a rounded tail',
        CYBERPUNK:
          'a single plain speech bubble of black glass with a neon-cyan outline and a short angled tail',
        SPACE_OPERA: 'a single plain white holographic speech bubble with a soft pale-blue rim',
      },
    },
    {
      id: 'chat-yell',
      role: 'Yell channel',
      looks: {
        FANTASY: 'a jagged shout bubble of torn parchment with spiky starburst edges',
        AGE_OF_STEAM:
          'a jagged brass shout bubble with spiked edges and a puff of steam bursting from one point',
        MODERN: 'a jagged orange shout bubble with sharp spiked edges',
        CYBERPUNK:
          'a jagged shout bubble of glowing crimson neon tube with spiked edges and a crackle of amber sparks',
        SPACE_OPERA: 'a jagged white shout bubble with spiked edges flaring bright red light',
      },
    },
    {
      id: 'chat-party',
      role: 'Party channel',
      looks: {
        FANTASY: 'a parchment speech bubble bearing a small emblem of three linked iron rings',
        AGE_OF_STEAM: 'a cream enamel speech bubble with a small brass emblem of three meshed cogs',
        MODERN: 'a blue speech bubble with a small white emblem of three dots joined in a triangle',
        CYBERPUNK:
          'a black glass speech bubble with a small emblem of three neon-green nodes linked in a triangle',
        SPACE_OPERA: 'a white speech bubble with a small pale-blue emblem of three stars in a ring',
      },
    },
    {
      id: 'chat-guild',
      role: 'Guild channel',
      looks: {
        FANTASY: 'a parchment speech bubble with a small red heraldic crest at its centre',
        AGE_OF_STEAM: 'a cream enamel speech bubble with a small brass cog-and-laurel crest at its centre',
        MODERN: 'a green speech bubble with a small white shield crest at its centre',
        CYBERPUNK:
          'a black glass speech bubble with a tiny hanging crew banner stitched in glowing neon-green thread at its centre',
        SPACE_OPERA: 'a white speech bubble with a small winged-star fleet crest at its centre',
      },
    },
    {
      id: 'chat-raid',
      role: 'Raid channel',
      looks: {
        FANTASY: 'a parchment speech bubble with a bold red war chevron at its centre',
        AGE_OF_STEAM:
          'a cream enamel speech bubble with a pair of crimson brass-edged chevrons stacked at its centre',
        MODERN: 'an orange speech bubble with a bold white double chevron at its centre',
        CYBERPUNK:
          'a speech bubble of cracked black glass with a triple strike chevron glowing hot red at its centre',
        SPACE_OPERA: 'a white speech bubble with a red fleet-assault chevron of light at its centre',
      },
    },
    {
      id: 'chat-trade',
      role: 'Trade channel',
      looks: {
        FANTASY: 'a parchment speech bubble with a small pair of brass scales at its centre',
        AGE_OF_STEAM: 'a cream enamel speech bubble with a stamped brass coin at its centre',
        MODERN: 'a yellow speech bubble with a small gold coin at its centre',
        CYBERPUNK: 'a black glass speech bubble with a glowing neon-gold credit chip at its centre',
        SPACE_OPERA: 'a white speech bubble with a pale-blue holographic coin spinning at its centre',
      },
    },
    {
      id: 'chat-emote-wheel',
      role: 'Emote wheel',
      figure: true,
      looks: {
        FANTASY: 'a round carved wooden token bearing a small smiling face',
        AGE_OF_STEAM: 'a brass carousel of four small enamel faces, the front one smiling',
        MODERN: 'a round yellow smiling face beside a small grid of four tiny grey faces',
        CYBERPUNK: 'a black glass palette of four small smiling faces, the chosen one glowing neon-cyan',
        SPACE_OPERA: 'a white holo-ring of small pale-blue smiling faces orbiting a brighter central one',
      },
    },
    {
      id: 'chat-microphone',
      role: 'Microphone',
      states: ['unmuted', 'muted'],
      looks: {
        FANTASY:
          'a glowing crystal sending-stone held in a silver claw mount, and gone dark with a silver band clasped round it for the second state',
        AGE_OF_STEAM:
          'a brass candlestick telephone mouthpiece with its flared cone open, and its cone stoppered with a leather cap for the second state',
        MODERN:
          'a grey podcast microphone in a round shock mount, and the same microphone under a red circle-and-bar for the second state',
        CYBERPUNK:
          'a chrome clip-on mic pod with a glowing cyan mesh grille, and its grille gone dark with a red diode blinking for the second state',
        SPACE_OPERA:
          'a slim white boom-mic wand extended with a pale-blue tip light, and folded back flat against its base with a red ring for the second state',
      },
    },
  ],
};
