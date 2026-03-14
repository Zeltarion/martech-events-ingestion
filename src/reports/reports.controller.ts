import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ZodError } from "zod";

import {
  countriesReportQuerySchema,
  funnelReportQuerySchema,
  revenueReportQuerySchema
} from "./report-query.schema";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  public constructor(private readonly reportsService: ReportsService) {}

  @Get("funnel")
  public async getFunnelReport(@Query() query: Record<string, string | undefined>) {
    const parsedQuery = this.parseQuery(() => funnelReportQuerySchema.parse(query));

    return this.reportsService.getFunnelReport(parsedQuery);
  }

  @Get("countries")
  public async getCountriesReport(@Query() query: Record<string, string | undefined>) {
    const parsedQuery = this.parseQuery(() => countriesReportQuerySchema.parse(query));

    return this.reportsService.getCountriesReport(parsedQuery);
  }

  @Get("revenue")
  public async getRevenueReport(@Query() query: Record<string, string | undefined>) {
    const parsedQuery = this.parseQuery(() => revenueReportQuerySchema.parse(query));

    return this.reportsService.getRevenueReport(parsedQuery);
  }

  private parseQuery<T>(parser: () => T): T {
    try {
      return parser();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }));

        throw new BadRequestException({
          message: "Invalid report query parameters",
          issues
        });
      }

      throw error;
    }
  }
}
