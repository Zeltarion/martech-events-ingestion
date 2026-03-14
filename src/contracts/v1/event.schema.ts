import { z } from "zod";

const isoDatetimeString = z.string().datetime({ offset: true });

const facebookTopEventTypeSchema = z.enum(["ad.view", "page.like", "comment", "video.view"]);
const facebookBottomEventTypeSchema = z.enum(["ad.click", "form.submission", "checkout.complete"]);
const tiktokTopEventTypeSchema = z.enum(["video.view", "like", "share", "comment"]);
const tiktokBottomEventTypeSchema = z.enum(["profile.visit", "purchase", "follow"]);

const facebookUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  age: z.number().int().nonnegative(),
  gender: z.enum(["male", "female", "non-binary"]),
  location: z.object({
    country: z.string(),
    city: z.string()
  })
});

const tiktokUserSchema = z.object({
  userId: z.string(),
  username: z.string(),
  followers: z.number().int().nonnegative()
});

const facebookEngagementTopSchema = z.object({
  actionTime: isoDatetimeString,
  referrer: z.enum(["newsfeed", "marketplace", "groups"]),
  videoId: z.string().nullable()
});

const facebookEngagementBottomSchema = z.object({
  adId: z.string(),
  campaignId: z.string(),
  clickPosition: z.enum(["top_left", "bottom_right", "center"]),
  device: z.enum(["mobile", "desktop"]),
  browser: z.enum(["Chrome", "Firefox", "Safari"]),
  purchaseAmount: z.string().nullable()
});

const tiktokEngagementTopSchema = z.object({
  watchTime: z.number().min(0),
  percentageWatched: z.number().min(0).max(100),
  device: z.enum(["Android", "iOS", "Desktop"]),
  country: z.string(),
  videoId: z.string()
});

const tiktokEngagementBottomSchema = z.object({
  actionTime: isoDatetimeString,
  profileId: z.string().nullable(),
  purchasedItem: z.string().nullable(),
  purchaseAmount: z.string().nullable()
});

const facebookTopEventSchema = z.object({
  eventId: z.string(),
  timestamp: isoDatetimeString,
  source: z.literal("facebook"),
  funnelStage: z.literal("top"),
  eventType: facebookTopEventTypeSchema,
  data: z.object({
    user: facebookUserSchema,
    engagement: facebookEngagementTopSchema
  })
});

const facebookBottomEventSchema = z.object({
  eventId: z.string(),
  timestamp: isoDatetimeString,
  source: z.literal("facebook"),
  funnelStage: z.literal("bottom"),
  eventType: facebookBottomEventTypeSchema,
  data: z.object({
    user: facebookUserSchema,
    engagement: facebookEngagementBottomSchema
  })
});

const tiktokTopEventSchema = z.object({
  eventId: z.string(),
  timestamp: isoDatetimeString,
  source: z.literal("tiktok"),
  funnelStage: z.literal("top"),
  eventType: tiktokTopEventTypeSchema,
  data: z.object({
    user: tiktokUserSchema,
    engagement: tiktokEngagementTopSchema
  })
});

const tiktokBottomEventSchema = z.object({
  eventId: z.string(),
  timestamp: isoDatetimeString,
  source: z.literal("tiktok"),
  funnelStage: z.literal("bottom"),
  eventType: tiktokBottomEventTypeSchema,
  data: z.object({
    user: tiktokUserSchema,
    engagement: tiktokEngagementBottomSchema
  })
});

export const eventSchema = z.union([
  facebookTopEventSchema,
  facebookBottomEventSchema,
  tiktokTopEventSchema,
  tiktokBottomEventSchema
]);

export const eventBatchSchema = z.array(eventSchema).min(1);

export const ingestionPayloadSchema = z.union([eventSchema, eventBatchSchema]);

export type EventSchema = z.infer<typeof eventSchema>;
export type EventBatchSchema = z.infer<typeof eventBatchSchema>;
export type IngestionPayloadSchema = z.infer<typeof ingestionPayloadSchema>;

export function isEventBatchPayload(payload: IngestionPayloadSchema): payload is EventBatchSchema {
  return Array.isArray(payload);
}

export function validateIngestionPayload(payload: unknown): IngestionPayloadSchema {
  return ingestionPayloadSchema.parse(payload);
}
