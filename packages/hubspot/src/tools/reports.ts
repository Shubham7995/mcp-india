/**
 * HubSpot report tools.
 * Tools: hubspot_pipeline_summary, hubspot_deal_forecast
 *
 * These are computed aggregations — not direct HubSpot API endpoints.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HubSpotClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";
import type {
  HubSpotPipelineSummary,
  PipelineStageSummary,
  DealForecast,
  DealForecastItem,
} from "../types.js";

export function registerReportTools(
  server: McpServer,
  client: HubSpotClient,
): void {
  // ── Pipeline Summary ───────────────────────────────────────
  server.tool(
    "hubspot_pipeline_summary",
    "Get a summary of your HubSpot deal pipeline: deals per stage, total values, and weighted values",
    {
      pipeline_id: z
        .string()
        .optional()
        .describe("Pipeline ID (default: first pipeline)"),
    },
    async ({ pipeline_id }) => {
      try {
        const [pipelinesResp, dealsResp] = await Promise.all([
          client.listPipelines(),
          client.listAllDeals(["dealname", "amount", "dealstage", "pipeline"], 100),
        ]);

        const pipeline = pipeline_id
          ? pipelinesResp.results.find((p) => p.id === pipeline_id)
          : pipelinesResp.results[0];

        if (!pipeline) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: "Pipeline not found" }) },
            ],
          };
        }

        const pipelineDeals = dealsResp.results.filter(
          (d) => !pipeline_id || d.properties.pipeline === pipeline_id,
        );

        const stageMap = new Map<string, PipelineStageSummary>();
        for (const stage of pipeline.stages) {
          stageMap.set(stage.id, {
            stage_id: stage.id,
            stage_label: stage.label,
            deal_count: 0,
            total_value: 0,
            weighted_value: 0,
          });
        }

        for (const deal of pipelineDeals) {
          const stageId = deal.properties.dealstage;
          const amount = parseFloat(deal.properties.amount || "0");
          const stage = stageMap.get(stageId);
          if (stage) {
            stage.deal_count++;
            stage.total_value += amount;
            const prob = parseFloat(
              pipeline.stages.find((s) => s.id === stageId)?.metadata?.probability ?? "0",
            ) / 100;
            stage.weighted_value += amount * prob;
          }
        }

        const stages = Array.from(stageMap.values()).filter((s) => s.deal_count > 0);

        const summary: HubSpotPipelineSummary = {
          pipeline_id: pipeline.id,
          pipeline_label: pipeline.label,
          stages,
          total_deals: pipelineDeals.length,
          total_pipeline_value: stages.reduce((s, st) => s + st.total_value, 0),
          weighted_value: stages.reduce((s, st) => s + st.weighted_value, 0),
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

  // ── Deal Forecast ──────────────────────────────────────────
  server.tool(
    "hubspot_deal_forecast",
    "Get a revenue forecast from your HubSpot deal pipeline weighted by stage probability",
    {
      pipeline_id: z
        .string()
        .optional()
        .describe("Pipeline ID (default: first pipeline)"),
    },
    async ({ pipeline_id }) => {
      try {
        const [pipelinesResp, dealsResp] = await Promise.all([
          client.listPipelines(),
          client.listAllDeals(["dealname", "amount", "dealstage", "pipeline"], 100),
        ]);

        const pipeline = pipeline_id
          ? pipelinesResp.results.find((p) => p.id === pipeline_id)
          : pipelinesResp.results[0];

        if (!pipeline) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: "Pipeline not found" }) },
            ],
          };
        }

        const pipelineDeals = dealsResp.results.filter(
          (d) => !pipeline_id || d.properties.pipeline === pipeline_id,
        );

        const stageGroups = new Map<string, { amount: number; count: number }>();
        for (const deal of pipelineDeals) {
          const stageId = deal.properties.dealstage;
          const amount = parseFloat(deal.properties.amount || "0");
          const group = stageGroups.get(stageId) ?? { amount: 0, count: 0 };
          group.amount += amount;
          group.count++;
          stageGroups.set(stageId, group);
        }

        const byStage: DealForecastItem[] = [];
        for (const stage of pipeline.stages) {
          const group = stageGroups.get(stage.id);
          if (!group) continue;
          const prob = parseFloat(stage.metadata?.probability ?? "0") / 100;
          byStage.push({
            stage_label: stage.label,
            deal_count: group.count,
            total_value: group.amount,
            probability: prob,
            weighted_value: group.amount * prob,
          });
        }

        const forecast: DealForecast = {
          pipeline_id: pipeline.id,
          total_deals: pipelineDeals.length,
          total_pipeline_value: byStage.reduce((s, st) => s + st.total_value, 0),
          weighted_forecast: byStage.reduce((s, st) => s + st.weighted_value, 0),
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
