export async function enqueueWithConcurrencyLimit(
  inFlight: Set<Promise<void>>,
  concurrency: number,
  taskFactory: () => Promise<void>
): Promise<void> {
  const task = taskFactory().finally(() => {
    inFlight.delete(task);
  });

  inFlight.add(task);

  if (inFlight.size >= Math.max(1, concurrency)) {
    await Promise.race(inFlight);
  }
}

export async function drainConcurrencyPool(inFlight: Set<Promise<void>>): Promise<void> {
  await Promise.all(inFlight);
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  handler: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const inFlight = new Set<Promise<void>>();

  for (const item of items) {
    await enqueueWithConcurrencyLimit(inFlight, concurrency, async () => {
      await handler(item);
    });
  }

  await drainConcurrencyPool(inFlight);
}
