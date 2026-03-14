import { mapEventToInsertModel } from "./events.repository";

describe("mapEventToInsertModel", () => {
  it("maps facebook country from user location", () => {
    const event = {
      eventId: "evt-fb-1",
      timestamp: "2026-03-14T10:00:00Z",
      source: "facebook" as const,
      funnelStage: "top" as const,
      eventType: "ad.view" as const,
      data: {
        user: {
          userId: "user-fb-1",
          name: "Jane Doe",
          age: 25,
          gender: "female" as const,
          location: {
            country: "US",
            city: "New York"
          }
        },
        engagement: {
          actionTime: "2026-03-14T10:00:00Z",
          referrer: "newsfeed" as const,
          videoId: "video-1"
        }
      }
    };

    const model = mapEventToInsertModel(event);

    expect(model.country).toBe("US");
  });

  it("maps null country for tiktok bottom events", () => {
    const event = {
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
    };

    const model = mapEventToInsertModel(event);

    expect(model.country).toBeNull();
  });
});
