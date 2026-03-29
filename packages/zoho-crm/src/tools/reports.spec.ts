/**
 * BDD spec: Zoho CRM report/analytics tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   zoho_sales_pipeline_summary, zoho_revenue_forecast
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ZohoCrmClient } from "../client.js";
import { registerReportTools } from "./reports.js";

function createMockClient() {
  return {
    getAllDeals: vi.fn(),
  } as unknown as ZohoCrmClient;
}

function createMockServer() {
  const tools = new Map<string, { handler: Function }>();
  return {
    tool: (name: string, _desc: string, _schema: unknown, handler: Function) => {
      tools.set(name, { handler });
    },
    getHandler: (name: string) => tools.get(name)!.handler,
    getRegisteredTools: () => Array.from(tools.keys()),
  };
}

describe("Zoho CRM report tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerReportTools(mockServer as any, mockClient);
  });

  // ── zoho_sales_pipeline_summary ────────────────────────────

  describe("zoho_sales_pipeline_summary", () => {
    it("should aggregate deals by stage given a mix of stages and amounts", async () => {
      // Given: three deals across two stages
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Deal_Name: "A", Stage: "Qualification", Amount: 50000, Pipeline: null, Probability: 30 },
        { id: "d2", Deal_Name: "B", Stage: "Qualification", Amount: 80000, Pipeline: null, Probability: 40 },
        { id: "d3", Deal_Name: "C", Stage: "Closed Won", Amount: 100000, Pipeline: null, Probability: 100 },
      ]);

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({});

      // Then: stages are grouped correctly
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(3);
      expect(parsed.stages).toHaveLength(2);

      const qual = parsed.stages.find((s: any) => s.stage === "Qualification");
      expect(qual.deal_count).toBe(2);
      expect(qual.total_value).toBe(130000);
      expect(qual.avg_probability).toBe(35); // (30+40)/2

      const won = parsed.stages.find((s: any) => s.stage === "Closed Won");
      expect(won.deal_count).toBe(1);
      expect(won.total_value).toBe(100000);
    });

    it("should compute correct weighted values", async () => {
      // Given: deals with known probability
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Deal_Name: "X", Stage: "Negotiation", Amount: 200000, Pipeline: null, Probability: 60 },
      ]);

      // When: pipeline summary is requested
      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({});

      // Then: weighted_value = 200000 * 60/100 = 120000
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.weighted_value).toBe(120000);
      expect(parsed.stages[0].weighted_value).toBe(120000);
    });

    it("should return empty stages given no deals exist", async () => {
      // Given: no deals
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({});

      // Then: zero everything
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(0);
      expect(parsed.stages).toHaveLength(0);
      expect(parsed.total_pipeline_value).toBe(0);
    });

    it("should filter by pipeline given a pipeline name", async () => {
      // Given: deals across two pipelines
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Deal_Name: "A", Stage: "Qual", Amount: 50000, Pipeline: "Standard", Probability: 30 },
        { id: "d2", Deal_Name: "B", Stage: "Qual", Amount: 80000, Pipeline: "Enterprise", Probability: 40 },
      ]);

      // When: filtered to Standard pipeline
      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({ pipeline: "Standard" });

      // Then: only Standard deal included
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(1);
      expect(parsed.pipeline).toBe("Standard");
    });

    it("should return an error given the API throws", async () => {
      // Given: API failure
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("rate limit exceeded"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({});

      // Then: error
      expect(result.isError).toBe(true);
    });
  });

  // ── zoho_revenue_forecast ──────────────────────────────────

  describe("zoho_revenue_forecast", () => {
    it("should forecast revenue for deals closing before the given date", async () => {
      // Given: deals with known closing dates and probabilities
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Deal_Name: "A", Stage: "Negotiation", Amount: 100000, Closing_Date: "2026-06-15", Probability: 60 },
        { id: "d2", Deal_Name: "B", Stage: "Negotiation", Amount: 200000, Closing_Date: "2026-06-25", Probability: 80 },
        { id: "d3", Deal_Name: "C", Stage: "Qualification", Amount: 50000, Closing_Date: "2026-09-01", Probability: 20 },
      ]);

      // When: forecasting for Q2 (before July)
      const handler = mockServer.getHandler("zoho_revenue_forecast");
      const result = await handler({ closing_before: "2026-07-01" });

      // Then: only d1 and d2 included (d3 closes in Sep)
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(2);
      expect(parsed.total_pipeline_value).toBe(300000);
      // weighted: 100000*0.6 + 200000*0.8 = 60000 + 160000 = 220000
      // But they're in the same stage, so avg prob = (60+80)/2 = 70, weighted = 300000 * 0.7 = 210000
      expect(parsed.by_stage).toHaveLength(1);
    });

    it("should filter by minimum probability given min_probability is set", async () => {
      // Given: deals with varying probability
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Deal_Name: "A", Stage: "Qual", Amount: 50000, Closing_Date: "2026-06-01", Probability: 20 },
        { id: "d2", Deal_Name: "B", Stage: "Negotiation", Amount: 100000, Closing_Date: "2026-06-01", Probability: 70 },
      ]);

      // When: filtering for >= 50% probability
      const handler = mockServer.getHandler("zoho_revenue_forecast");
      const result = await handler({ closing_before: "2026-07-01", min_probability: 50 });

      // Then: only d2 included
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(1);
      expect(parsed.total_pipeline_value).toBe(100000);
    });

    it("should return empty forecast given no deals match the criteria", async () => {
      // Given: no deals close before the date
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Deal_Name: "A", Stage: "Qual", Amount: 50000, Closing_Date: "2026-12-01", Probability: 30 },
      ]);

      // When: forecasting for Q1
      const handler = mockServer.getHandler("zoho_revenue_forecast");
      const result = await handler({ closing_before: "2026-04-01" });

      // Then: empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(0);
      expect(parsed.by_stage).toHaveLength(0);
    });

    it("should return an error given the API throws", async () => {
      // Given: API failure
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Authentication failed"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_revenue_forecast");
      const result = await handler({ closing_before: "2026-07-01" });

      // Then: error
      expect(result.isError).toBe(true);
    });
  });
});
