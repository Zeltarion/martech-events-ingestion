import { EventsRepository } from "./events.repository";

describe("EventsRepository", () => {
  const createRepository = (queryResult: unknown) => {
    const query = jest.fn().mockResolvedValue(queryResult);
    const rawEventRepository = { query };
    const repository = new EventsRepository(rawEventRepository as never);

    return { repository, query };
  };

  const createTiktokBottomEvent = () => ({
    eventId: "evt-tt-bottom-1",
    timestamp: "2026-03-14T12:00:00Z",
    source: "tiktok" as const,
    funnelStage: "bottom" as const,
    eventType: "purchase" as const,
    data: {
      user: {
        userId: "user-tt-99",
        username: "buyer99",
        followers: 50
      },
      engagement: {
        actionTime: "2026-03-14T12:00:00Z",
        profileId: "profile-1",
        purchasedItem: "course",
        purchaseAmount: "42.50"
      }
    }
  });

  it("returns true when insert succeeds", async () => {
    const { repository } = createRepository([{ event_id: "evt-tt-bottom-1" }]);

    await expect(repository.insertEvent(createTiktokBottomEvent())).resolves.toBe(true);
  });

  it("returns false for duplicate inserts when ON CONFLICT DO NOTHING produces no rows", async () => {
    const { repository } = createRepository([]);

    await expect(repository.insertEvent(createTiktokBottomEvent())).resolves.toBe(false);
  });
  
  it("returns inserted event ids for bulk inserts", async () => {
    const { repository } = createRepository([{ event_id: "evt-tt-bottom-1" }]);

    await expect(repository.insertEvents([createTiktokBottomEvent()])).resolves.toEqual(
      new Set(["evt-tt-bottom-1"])
    );
  });
});
