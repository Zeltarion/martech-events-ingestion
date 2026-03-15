export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  handler: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const limit = Math.max(1, concurrency);
  const inFlight = new Set<Promise<void>>();

  for (const item of items) {
    const task = handler(item).finally(() => {
      inFlight.delete(task);
    });

    inFlight.add(task);

    if (inFlight.size >= limit) {
      await Promise.race(inFlight);
    }
  }

  await Promise.all(inFlight);
}

export async function runAsyncIterableWithConcurrency<T>(
  items: AsyncIterable<T>,
  concurrency: number,
  handler: (item: T) => Promise<void>
): Promise<void> {
  const limit = Math.max(1, concurrency);
  const inFlight = new Set<Promise<void>>();

  for await (const item of items) {
    const task = handler(item).finally(() => {
      inFlight.delete(task);
    });

    inFlight.add(task);

    if (inFlight.size >= limit) {
      await Promise.race(inFlight);
    }
  }

  await Promise.all(inFlight);
}
