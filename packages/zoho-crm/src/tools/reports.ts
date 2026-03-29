/**
 * Zoho CRM report/analytics tools.
 * Custom aggregation tools — not direct API wrappers.
 * Tools: zoho_sales_pipeline_summary, zoho_revenue_forecast
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZohoCrmClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";
import type {
  ZohoDeal,
  PipelineStageSummary,
  SalesPipelineSummary,
  RevenueForecastItem,
  RevenueForecast,
} from "../types.js";

export function registerReportTools(
  server: McpServer,
  client: ZohoCrmClient,
): void {
  // ── Sales Pipeline Summary ─────────────────────────────────
  server.tool(
    "zoho_sales_pipeline_summary",
    "Get a summary of the Zoho CRM sales pipeline grouped by stage: deal count, total value, and weighted value",
    {
      pipeline: z.string().optional().describe("Filter by pipeline name (omit for all)"),
    },
    async ({ pipeline }) => {
      try {
        const deals = await client.getAllDeals({
          fields: "Deal_Name,Stage,Amount,Pipeline,Probability",
        });

        const filtered = pipeline
          ? deals.filter((d: ZohoDeal) => d.Pipeline === pipeline)
          : deals;

        const stageMap = new Map<string, { deals: ZohoDeal[] }>();
        for (const deal of filtered) {
          const existing = stageMap.get(deal.Stage);
          if (existing) {
            existing.deals.push(deal);
          } else {
            stageMap.set(deal.Stage, { deals: [deal] });
          }
        }

        const stages: PipelineStageSummary[] = [];
        let totalPipelineValue = 0;
        let totalWeightedValue = 0;

        for (const [stage, { deals: stageDeals }] of stageMap) {
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.Amount ?? 0), 0);
          const avgProb =
            stageDeals.length > 0
              ? stageDeals.reduce((sum, d) => sum + (d.Probability ?? 0), 0) / stageDeals.length
              : 0;
          const weightedValue = totalValue * (avgProb / 100);

          stages.push({
            stage,
            deal_count: stageDeals.length,
            total_value: totalValue,
            avg_probability: Math.round(avgProb * 100) / 100,
            weighted_value: Math.round(weightedValue * 100) / 100,
          });

          totalPipelineValue += totalValue;
          totalWeightedValue += weightedValue;
        }

        const summary: SalesPipelineSummary = {
          pipeline: pipeline ?? null,
          stages,
          total_deals: filtered.length,
          total_pipeline_value: totalPipelineValue,
          weighted_value: Math.round(totalWeightedValue * 100) / 100,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(summary, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Revenue Forecast ───────────────────────────────────────
  server.tool(
    "zoho_revenue_forecast",
    "Forecast expected revenue from Zoho CRM deals closing before a given date, grouped by stage with weighted probabilities",
    {
      closing_before: z
        .string()
        .describe("Only include deals closing before this date (YYYY-MM-DD, required)"),
      min_probability: z
        .number()
        .optional()
        .describe("Minimum probability filter (0-100, default 0)"),
    },
    async ({ closing_before, min_probability }) => {
      try {
        const minProb = min_probability ?? 0;
        const deals = await client.getAllDeals({
          fields: "Deal_Name,Stage,Amount,Closing_Date,Probability",
        });

        const filtered = deals.filter((d: ZohoDeal) => {
          if (!d.Closing_Date) return false;
          if (d.Closing_Date > closing_before) return false;
          if ((d.Probability ?? 0) < minProb) return false;
          return true;
        });

        const stageMap = new Map<string, ZohoDeal[]>();
        for (const deal of filtered) {
          const existing = stageMap.get(deal.Stage);
          if (existing) {
            existing.push(deal);
          } else {
            stageMap.set(deal.Stage, [deal]);
          }
        }

        const byStage: RevenueForecastItem[] = [];
        let totalPipelineValue = 0;
        let totalWeightedForecast = 0;

        for (const [stage, stageDeals] of stageMap) {
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.Amount ?? 0), 0);
          const avgProb =
            stageDeals.length > 0
              ? stageDeals.reduce((sum, d) => sum + (d.Probability ?? 0), 0) / stageDeals.length
              : 0;
          const weightedValue = totalValue * (avgProb / 100);

          byStage.push({
            stage,
            deal_count: stageDeals.length,
            total_value: totalValue,
            probability: Math.round(avgProb * 100) / 100,
            weighted_value: Math.round(weightedValue * 100) / 100,
          });

          totalPipelineValue += totalValue;
          totalWeightedForecast += weightedValue;
        }

        const forecast: RevenueForecast = {
          closing_before,
          total_deals: filtered.length,
          total_pipeline_value: totalPipelineValue,
          weighted_forecast: Math.round(totalWeightedForecast * 100) / 100,
          by_stage: byStage,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(forecast, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
