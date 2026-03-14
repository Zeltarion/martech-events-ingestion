import { validateIngestionPayload } from "./event.schema";

function createFacebookTopEvent() {
  return {
    eventId: "evt-fb-top-1",
    timestamp: "2026-03-14T10:00:00Z",
    source: "facebook",
    funnelStage: "top",
    eventType: "ad.view",
    data: {
      user: {
        userId: "user-fb-1",
        name: "Jane Doe",
        age: 28,
        gender: "female",
        location: {
          country: "US",
          city: "New York"
        }
      },
      engagement: {
        actionTime: "2026-03-14T10:00:00Z",
        referrer: "newsfeed",
        videoId: "video-1"
      }
    }
  };
}

describe("event schema validation", () => {
  it("accepts a valid single event payload", () => {
    const payload = createFacebookTopEvent();

    expect(validateIngestionPayload(payload)).toEqual(payload);
  });

  it("accepts a valid batch payload", () => {
    const payload = [createFacebookTopEvent(), { ...createFacebookTopEvent(), eventId: "evt-fb-top-2" }];

    expect(validateIngestionPayload(payload)).toEqual(payload);
  });

  it("rejects an event with mismatched funnelStage and eventType", () => {
    const invalidPayload = {
      ...createFacebookTopEvent(),
      eventType: "checkout.complete"
    };

    expect(() => validateIngestionPayload(invalidPayload)).toThrow();
  });

  it("rejects an event with invalid percentageWatched", () => {
    const invalidPayload = {
      eventId: "evt-tt-top-1",
      timestamp: "2026-03-14T11:00:00Z",
      source: "tiktok",
      funnelStage: "top",
      eventType: "video.view",
      data: {
        user: {
          userId: "user-tt-1",
          username: "creator1",
          followers: 10
        },
        engagement: {
          watchTime: 30,
          percentageWatched: 101,
          device: "Android",
          country: "DE",
          videoId: "video-tt-1"
        }
      }
    };

    expect(() => validateIngestionPayload(invalidPayload)).toThrow();
  });
});
