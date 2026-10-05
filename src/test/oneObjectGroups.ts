/**
 * The groups whose every entry is one carrier marked differently, by convention: a chat channel is a
 * speech bubble with its channel's mark inside, an emote is a gesture of a hand or a face, and a pet
 * command is a paw print with the command's mark. The mark is drawn, so it reads without colour.
 */
export const ONE_OBJECT_GROUPS: ReadonlySet<string> = new Set(['chat', 'emotes', 'pet-commands']);
