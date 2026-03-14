import { Injectable } from "@nestjs/common";

import {
  CountriesReportFilters,
  EventsRepository,
  ReportFilters,
  RevenueReportFilters
} from "../persistence/events.repository";

@Injectable()
export class ReportsService {
  public constructor(private readonly eventsRepository: EventsRepository) {}

  public async getFunnelReport(filters: ReportFilters): Promise<{
    from: string;
    to: string;
    source?: string;
    topCount: number;
    bottomCount: number;
    conversionRate: number;
  }> {
    const result = await this.eventsRepository.getFunnelReport(filters);
    const conversionRate = result.topCount === 0 ? 0 : result.bottomCount / result.topCount;

    return {
      from: filters.from,
      to: filters.to,
      source: filters.source,
      topCount: result.topCount,
      bottomCount: result.bottomCount,
      conversionRate: Number(conversionRate.toFixed(3))
    };
  }

  public async getCountriesReport(filters: CountriesReportFilters): Promise<{
    from: string;
    to: string;
    source?: string;
    limit: number;
    items: Array<{ country: string; eventsCount: number; uniqueUsers: number }>;
  }> {
    const items = await this.eventsRepository.getCountriesReport(filters);

    return {
      from: filters.from,
      to: filters.to,
      source: filters.source,
      limit: filters.limit,
      items
    };
  }

  public async getRevenueReport(filters: RevenueReportFilters): Promise<{
    from: string;
    to: string;
    source?: string;
    groupBy: "day" | "hour";
    items: Array<{ bucket: string; revenue: string }>;
    totalRevenue: string;
  }> {
    const items = await this.eventsRepository.getRevenueReport(filters);
    const totalRevenue = items
      .reduce((accumulator, item) => accumulator + Number(item.revenue), 0)
      .toFixed(2);

    return {
      from: filters.from,
      to: filters.to,
      source: filters.source,
      groupBy: filters.groupBy,
      items,
      totalRevenue
    };
  }
}
