/**
 * Where this tab stands against the newest build of the app.
 *
 * - `current` — nothing newer is known, or the reader has put the notice away.
 * - `waiting` — a newer build is installed and waits for the reader to start it. Nothing changes
 *   until they do, because a reload would clear what is only on screen.
 * - `starting` — the reader asked this tab to start the waiting build, and the tab reloads as soon
 *   as that build takes over.
 * - `elsewhere` — another tab started the newer build. This tab still runs the build it booted
 *   with, and the service worker keeps that build's files for it, so it goes on working until the
 *   reader reloads it.
 */
export type AppUpdate = 'current' | 'waiting' | 'starting' | 'elsewhere';
