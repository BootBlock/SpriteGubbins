import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The social bar: friends, the guild, group and raid finding, mail, chat and the tools for keeping
 * away a player you would rather not meet.
 *
 * **Figures only where the subject is people.** Friends, the group finder, the raid and the who list
 * draw silhouettes and say so; the rest are objects, so the sheet's figure exclusion still holds them.
 */
export const SOCIAL_PANELS: IconCatalogueGroup = {
  id: 'social-panels',
  label: 'Social panels',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'social-friends',
      role: 'Friends',
      figure: true,
      looks: {
        FANTASY: 'a pair of head-and-shoulders silhouettes side by side beneath a small gold heart',
        AGE_OF_STEAM: 'a brass double locket holding a pair of umber head-and-shoulders silhouettes',
        MODERN: 'a pair of overlapping grey head-and-shoulders silhouettes, the front one blue',
        CYBERPUNK:
          'a pair of head-and-shoulders silhouettes drawn in glowing cyan and hot-pink wireframe, linked by a bright data line',
        SPACE_OPERA:
          'a pair of pale-blue holographic head-and-shoulders silhouettes above a white emitter bar',
      },
    },
    {
      id: 'social-guild',
      role: 'Guild',
      looks: {
        FANTASY: 'a red heraldic banner with a gold tower, hung from a crossbar',
        AGE_OF_STEAM: 'an enamelled brass guild badge in the shape of a cog wreathed in laurel',
        MODERN: 'a blue pennant flag with a white star on a short pole',
        CYBERPUNK:
          'a black crew patch shaped like a shield, its jagged emblem stitched in glowing neon-green thread',
        SPACE_OPERA: 'a white fleet insignia shaped like a winged star with a blue light at its heart',
      },
    },
    {
      id: 'social-group-finder',
      role: 'Group finder',
      figure: true,
      looks: {
        FANTASY: 'a brass spyglass lens over three small head-and-shoulders silhouettes',
        AGE_OF_STEAM: 'a brass magnifying glass over three umber head-and-shoulders silhouettes',
        MODERN: 'a grey magnifying glass over three small blue head-and-shoulders silhouettes',
        CYBERPUNK:
          'a glowing cyan targeting reticle locked over three hot-pink wireframe head-and-shoulders silhouettes',
        SPACE_OPERA:
          'a white scanner disc sweeping a pale-blue beam over three holographic head-and-shoulders silhouettes',
      },
    },
    {
      id: 'social-raid',
      role: 'Raid',
      figure: true,
      looks: {
        FANTASY: 'a crowd of five head-and-shoulders silhouettes beneath a red war banner',
        AGE_OF_STEAM: 'a row of five umber head-and-shoulders silhouettes beneath a brass bugle',
        MODERN: 'a tight cluster of five grey head-and-shoulders silhouettes, the centre one red',
        CYBERPUNK:
          'a rank of five head-and-shoulders silhouettes in glowing hot-pink wireframe, ranked beneath a hot red strike chevron',
        SPACE_OPERA: 'a wedge formation of five pale-blue holographic head-and-shoulders silhouettes',
      },
    },
    {
      id: 'social-mail',
      role: 'Mail',
      looks: {
        FANTASY: 'a folded parchment envelope sealed with a blob of red wax',
        AGE_OF_STEAM: 'a cream envelope tied with string and sealed with a brass-stamped wax disc',
        MODERN: 'a sealed white envelope with its flap closed',
        CYBERPUNK:
          'a sealed black envelope of thin polymer with a glowing cyan seam along its flap and a blinking hot-pink diode',
        SPACE_OPERA: 'a white data capsule with a blue light pulsing along its seal',
      },
    },
    {
      id: 'social-who-list',
      role: 'Who list',
      figure: true,
      looks: {
        FANTASY: 'a lit candle beside a head-and-shoulders silhouette on a parchment roll',
        AGE_OF_STEAM: 'a brass opera glass trained on an umber head-and-shoulders silhouette',
        MODERN: 'a magnifying glass over a single grey head-and-shoulders silhouette',
        CYBERPUNK:
          'a head-and-shoulders silhouette in a glowing cyan wireframe, crossed by a bright scan line from a chrome scanner bar',
        SPACE_OPERA: 'a pale-blue holographic head-and-shoulders silhouette inside a white scanning arc',
      },
    },
    {
      id: 'social-ignore-list',
      role: 'Ignore list',
      looks: {
        FANTASY: 'a closed iron portcullis with a red ribbon across it',
        AGE_OF_STEAM: 'a brass door chain drawn across a shut iron grille',
        MODERN: 'a grey speech bubble crossed through by a red diagonal bar',
        CYBERPUNK: 'a black speech bubble with a glowing red firewall grid across it and a dead grey diode',
        SPACE_OPERA: 'a white comm bubble behind a flickering red energy barrier',
      },
    },
    {
      id: 'social-report-player',
      role: 'Report a player',
      looks: {
        FANTASY: 'a red pennant on a short wooden spear driven into the ground',
        AGE_OF_STEAM: 'a brass alarm bell on a wall bracket with a red pull cord',
        MODERN: 'a red flag on a short white pole',
        CYBERPUNK: 'a red holographic flag flickering above a chrome alert beacon with a hazard-striped base',
        SPACE_OPERA: 'a white alert beacon with a pulsing red light and a red pennant of light',
      },
    },
    {
      id: 'social-chat-channels',
      role: 'Chat channels',
      looks: {
        FANTASY: 'a pair of overlapping parchment speech bubbles pinned with a brass tack',
        AGE_OF_STEAM: 'a brass telegraph sounder with two coiled wires running from it',
        MODERN: 'a pair of overlapping speech bubbles, one blue and one grey',
        CYBERPUNK:
          'a stack of three speech bubbles in neon cyan, hot-pink and green, each with a tiny glowing diode',
        SPACE_OPERA: 'a white comm dish beaming three pale-blue arcs',
      },
    },
    {
      id: 'social-whisper',
      role: 'Whisper',
      looks: {
        FANTASY: 'a tiny rolled scroll tied to a white feather',
        AGE_OF_STEAM: 'a slim brass speaking tube curling round into a small flared bell',
        MODERN: 'a small pink speech bubble with a curled tail and three dots inside',
        CYBERPUNK: 'a small violet speech bubble with a padlocked tail and a soft glowing encryption shimmer',
        SPACE_OPERA: 'a narrow white comm beam with a violet pulse travelling along it',
      },
    },
    {
      id: 'social-party-invite',
      role: 'Party invite',
      looks: {
        FANTASY: 'a parchment envelope sealed with green wax pressed in a cross shape',
        AGE_OF_STEAM: 'a gilt-edged invitation card propped against a brass calling-card tray',
        MODERN: 'a white envelope with a green plus-shaped cross on its flap',
        CYBERPUNK:
          'a chrome access chip with a glowing green plus-shaped cross and a neon-cyan contact strip',
        SPACE_OPERA: 'a white beacon capsule with a green cross of light pulsing at its centre',
      },
    },
    {
      id: 'social-voice-chat',
      role: 'Voice chat',
      states: ['open', 'muted'],
      looks: {
        FANTASY:
          'a spiral conch shell with sound ripples leaving its opening, and wrapped shut with a cord for the second state',
        AGE_OF_STEAM:
          'a brass carbon microphone on a stand with sound waves rising from it, and a brass cap clamped over it for the second state',
        MODERN:
          'a black desk microphone, and the same microphone with a red diagonal slash for the second state',
        CYBERPUNK:
          'a chrome collar-mic capsule pulsing neon-green sound waves, and dark with a glowing red slash across it for the second state',
        SPACE_OPERA:
          'a white comm stud rippling with blue rings, and dimmed with a red bar of light across it for the second state',
      },
    },
  ],
};
