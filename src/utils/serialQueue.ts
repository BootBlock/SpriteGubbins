/** Runs the task it is handed once every task handed to it before has settled. */
export type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * A queue that runs asynchronous tasks one at a time, in the order they were handed over.
 *
 * For a read-then-write a store has to keep whole: two of them interleaved can each read a collection
 * the other is about to change, and each write what the other would have refused. A task that rejects
 * rejects only its own caller; the queue carries on with the next.
 */
export function createSerialQueue(): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}
