/**
 * BDD spec: HubSpot report tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   hubspot_pipeline_summary, hubspot_deal_forecast
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HubSpotClient } from "../client.js";
import { registerReportTools } from "./reports.js";

function createMockClient(): {
  [K in keyof HubSpotClient]: ReturnType<typeof vi.fn>;
} {
  return {
    searchContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    searchCompanies: vi.fn(),
    getCompany: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    searchDeals: vi.fn(),
    getDeal: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    createNote: vi.fn(),
    createTask: vi.fn(),
    logEmail: vi.fn(),
    listActivities: vi.fn(),
    listPipelines: vi.fn(),
    listAllDeals: vi.fn(),
  } as unknown as { [K in keyof HubSpotClient]: ReturnType<typeof vi.fn> };
}

function createMockServer() {
  const tools = new Map<
    string,
    { description: string; schema: unknown; handler: Function }
  >();

  return {
    tool: (
      name: string,
      description: string,
      schema: unknown,
      handler: Function,
    ) => {
      tools.set(name, { description, schema, handler });
    },
    getHandler: (name: string) => {
      const entry = tools.get(name);
      if (!entry) throw new Error(`Tool "${name}" not registered`);
      return entry.handler;
    },
    getRegisteredTools: () => Array.from(tools.keys()),
  };
}

const SALES_PIPELINE = {
  results: [
    {
      id: "default",
      label: "Sales Pipeline",
      stages: [
        { id: "appointmentscheduled", label: "Appointment Scheduled", displayOrder: 0, metadata: { probability: "20" } },
        { id: "qualifiedtobuy", label: "Qualified To Buy", displayOrder: 1, metadata: { probability: "40" } },
        { id: "presentationscheduled", label: "Presentation Scheduled", displayOrder: 2, metadata: { probability: "60" } },
        { id: "closedwon", label: "Closed Won", displayOrder: 3, metadata: { probability: "100" } },
        { id: "closedlost", label: "Closed Lost", displayOrder: 4, metadata: { probability: "0" } },
      ],
    },
  ],
};

describe("hubspot report tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerReportTools(mockServer as any, mockClient as any);
  });

  // ── hubspot_pipeline_summary ────────────────────────────────

  describe("hubspot_pipeline_summary", () => {
    it("should return a pipeline summary given deals across multiple stages", async () => {
      // Given: the default pipeline has deals in two stages
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({
        results: [
          { id: "801", properties: { dealname: "Deal A", amount: "50000", dealstage: "qualifiedtobuy", pipeline: "default" } },
          { id: "802", properties: { dealname: "Deal B", amount: "20000", dealstage: "presentationscheduled", pipeline: "default" } },
        ],
        paging: null,
      });

      // When: the tool is invoked without a pipeline_id
      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      // Then: the summary contains correct counts and values
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pipeline_label).toBe("Sales Pipeline");
      expect(parsed.total_deals).toBe(2);
      expect(parsed.total_pipeline_value).toBe(70000);
    });

    it("should weight deal values by stage probability", async () => {
      // Given: one deal at 40% probability
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({
        results: [
          { id: "801", properties: { dealname: "Weighted Deal", amount: "100000", dealstage: "qualifiedtobuy", pipeline: "default" } },
        ],
        paging: null,
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      // Then: weighted_value is 100000 * 0.40 = 40000
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.weighted_value).toBeCloseTo(40000);
    });

    it("should exclude closed-lost deals from the stage summary", async () => {
      // Given: one closed-won deal and one closed-lost deal
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({
        results: [
          { id: "801", properties: { dealname: "Won Deal", amount: "40000", dealstage: "closedwon", pipeline: "default" } },
          { id: "802", properties: { dealname: "Lost Deal", amount: "25000", dealstage: "closedlost", pipeline: "default" } },
        ],
        paging: null,
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      // Then: closed-won contributes to weighted value, closed-lost does not (0% probability)
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(2);
      // closedwon (100%): 40000 * 1.0 = 40000
      // closedlost (0%): 25000 * 0.0 = 0
      expect(parsed.weighted_value).toBeCloseTo(40000);
    });

    it("should return pipeline not found error given an invalid pipeline_id", async () => {
      // Given: the requested pipeline does not exist
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({ results: [], paging: null });

      // When: the tool is invoked with a bad pipeline_id
      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({ pipeline_id: "bad-pipeline-id" });

      // Then: the response contains an error key
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("Pipeline not found");
    });

    it("should return empty stages given a pipeline with no deals", async () => {
      // Given: the pipeline has no deals in any stage
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({ results: [], paging: null });

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      // Then: all values are zero and stages array is empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(0);
      expect(parsed.stages).toHaveLength(0);
    });

    it("should return an error response given an API failure", async () => {
      // Given: the listPipelines call fails
      mockClient.listPipelines.mockRejectedValue(new Error("HubSpot API is down"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("HubSpot API is down");
    });
  });

  // ── hubspot_deal_forecast ───────────────────────────────────

  describe("hubspot_deal_forecast", () => {
    it("should return a forecast given deals in the pipeline", async () => {
      // Given: the pipeline has 3 deals across 2 stages
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({
        results: [
          { id: "801", properties: { dealname: "Deal A", amount: "50000", dealstage: "qualifiedtobuy", pipeline: "default" } },
          { id: "802", properties: { dealname: "Deal B", amount: "12000", dealstage: "qualifiedtobuy", pipeline: "default" } },
          { id: "803", properties: { dealname: "Deal C", amount: "30000", dealstage: "presentationscheduled", pipeline: "default" } },
        ],
        paging: null,
      });

      // When: the tool is invoked without a pipeline_id
      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      // Then: forecast contains correct deal count and weighted total
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(3);
      expect(parsed.total_pipeline_value).toBe(92000);
      // qualifiedtobuy (40%): 62000 * 0.40 = 24800
      // presentationscheduled (60%): 30000 * 0.60 = 18000
      expect(parsed.weighted_forecast).toBeCloseTo(42800);
    });

    it("should include by_stage breakdown with probability and weighted_value per stage", async () => {
      // Given: two deals in qualifiedtobuy (40%)
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({
        results: [
          { id: "801", properties: { dealname: "Deal A", amount: "40000", dealstage: "qualifiedtobuy", pipeline: "default" } },
          { id: "802", properties: { dealname: "Deal B", amount: "60000", dealstage: "qualifiedtobuy", pipeline: "default" } },
        ],
        paging: null,
      });

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      // Then: by_stage has one entry with correct weighted_value
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.by_stage).toHaveLength(1);
      const stage = parsed.by_stage[0];
      expect(stage.stage_label).toBe("Qualified To Buy");
      expect(stage.deal_count).toBe(2);
      expect(stage.total_value).toBe(100000);
      expect(stage.probability).toBeCloseTo(0.4);
      // 100000 * 0.40 = 40000
      expect(stage.weighted_value).toBeCloseTo(40000);
    });

    it("should return forecast for a specific pipeline given a pipeline_id", async () => {
      // Given: the default pipeline exists
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({
        results: [
          { id: "801", properties: { dealname: "Deal A", amount: "20000", dealstage: "qualifiedtobuy", pipeline: "default" } },
        ],
        paging: null,
      });

      // When: the tool is invoked with the explicit pipeline_id "default"
      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({ pipeline_id: "default" });

      // Then: only deals for that pipeline are included
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pipeline_id).toBe("default");
      expect(parsed.total_deals).toBe(1);
    });

    it("should return pipeline not found error given an invalid pipeline_id", async () => {
      // Given: the pipeline does not exist
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({ results: [], paging: null });

      // When: the tool is invoked with a bad pipeline_id
      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({ pipeline_id: "nonexistent" });

      // Then: the response contains a pipeline not found error
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("Pipeline not found");
    });

    it("should return zero forecast given an empty pipeline", async () => {
      // Given: no deals exist in the pipeline
      mockClient.listPipelines.mockResolvedValue(SALES_PIPELINE);
      mockClient.listAllDeals.mockResolvedValue({ results: [], paging: null });

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      // Then: all numeric totals are zero
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(0);
      expect(parsed.total_pipeline_value).toBe(0);
      expect(parsed.weighted_forecast).toBe(0);
      expect(parsed.by_stage).toHaveLength(0);
    });

    it("should return an error response given an API failure", async () => {
      // Given: the listAllDeals call fails
      mockClient.listAllDeals.mockRejectedValue(new Error("Connection timeout"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Connection timeout");
    });
  });
});
