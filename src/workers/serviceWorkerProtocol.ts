/**
 * The one message a page sends the service worker: start the build that is waiting.
 *
 * Shared by both sides so the two cannot drift. The shape is the one workbox-window's
 * `messageSkipWaiting` sends, so a page and a worker agree whichever of them sent it.
 */
export const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const;

/** Whether a message a worker received asks it to stop waiting and activate. */
export function isSkipWaitingMessage(data: unknown): boolean {
  return (
    typeof data === 'object' && data !== null && 'type' in data && data.type === SKIP_WAITING_MESSAGE.type
  );
}
