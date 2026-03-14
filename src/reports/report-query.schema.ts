import { z } from "zod";

const isoDatetimeString = z.string().datetime({ offset: true });
const sourceSchema = z.enum(["facebook", "tiktok"]);

const baseReportQueryObject = z.object({
  from: isoDatetimeString,
  to: isoDatetimeString,
  source: sourceSchema.optional()
});

function validateDateRange(value: { from: string; to: string }, context: z.RefinementCtx): void {
  if (new Date(value.from) >= new Date(value.to)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "`from` must be earlier than `to`",
      path: ["from"]
    });
  }
}

export const funnelReportQuerySchema = baseReportQueryObject.superRefine(validateDateRange);

export const countriesReportQuerySchema = baseReportQueryObject
  .extend({
    limit: z.coerce.number().int().positive().max(100).default(10)
  })
  .superRefine(validateDateRange);

export const revenueReportQuerySchema = baseReportQueryObject
  .extend({
    groupBy: z.enum(["day", "hour"]).default("day")
  })
  .superRefine(validateDateRange);

export type FunnelReportQuery = z.infer<typeof funnelReportQuerySchema>;
export type CountriesReportQuery = z.infer<typeof countriesReportQuerySchema>;
export type RevenueReportQuery = z.infer<typeof revenueReportQuerySchema>;
