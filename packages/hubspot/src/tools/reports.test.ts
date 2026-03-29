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

const MOCK_PIPELINES = {
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

const MOCK_DEALS = {
  results: [
    {
      id: "801",
      properties: {
        dealname: "Enterprise Renewal",
        amount: "50000",
        dealstage: "qualifiedtobuy",
        pipeline: "default",
      },
    },
    {
      id: "802",
      properties: {
        dealname: "SMB Upsell",
        amount: "12000",
        dealstage: "qualifiedtobuy",
        pipeline: "default",
      },
    },
    {
      id: "803",
      properties: {
        dealname: "New Logo",
        amount: "30000",
        dealstage: "presentationscheduled",
        pipeline: "default",
      },
    },
  ],
  paging: null,
};

describe("Report Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerReportTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 2 report tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("hubspot_pipeline_summary");
      expect(tools).toContain("hubspot_deal_forecast");
      expect(tools).toHaveLength(2);
    });
  });

  describe("hubspot_pipeline_summary", () => {
    it("should return a summary with correct deal counts per stage", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pipeline_id).toBe("default");
      expect(parsed.pipeline_label).toBe("Sales Pipeline");
      expect(parsed.total_deals).toBe(3);
    });

    it("should compute correct total_pipeline_value from deal amounts", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      // 50000 + 12000 + 30000 = 92000
      expect(parsed.total_pipeline_value).toBe(92000);
    });

    it("should compute correct weighted_value using stage probability", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      // qualifiedtobuy (40%): (50000 + 12000) * 0.40 = 24800
      // presentationscheduled (60%): 30000 * 0.60 = 18000
      // total weighted = 42800
      expect(parsed.weighted_value).toBeCloseTo(42800);
    });

    it("should only include stages that have at least one deal", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      // Only qualifiedtobuy and presentationscheduled have deals
      expect(parsed.stages).toHaveLength(2);
      const stageIds = parsed.stages.map((s: any) => s.stage_id);
      expect(stageIds).toContain("qualifiedtobuy");
      expect(stageIds).toContain("presentationscheduled");
    });

    it("should use the first pipeline when no pipeline_id is provided", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pipeline_id).toBe("default");
    });

    it("should return error response when pipeline is not found", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({ pipeline_id: "nonexistent-pipeline" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("Pipeline not found");
    });

    it("should return zero totals when pipeline has no deals", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue({ results: [], paging: null });

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(0);
      expect(parsed.total_pipeline_value).toBe(0);
      expect(parsed.weighted_value).toBe(0);
      expect(parsed.stages).toHaveLength(0);
    });

    it("should return error response on API failure", async () => {
      mockClient.listPipelines.mockRejectedValue(new Error("Unauthorized"));

      const handler = mockServer.getHandler("hubspot_pipeline_summary");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });

  describe("hubspot_deal_forecast", () => {
    it("should return a forecast with correct total_deals count", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.pipeline_id).toBe("default");
      expect(parsed.total_deals).toBe(3);
    });

    it("should compute correct total_pipeline_value", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      // 50000 + 12000 + 30000 = 92000
      expect(parsed.total_pipeline_value).toBe(92000);
    });

    it("should compute correct weighted_forecast from stage probabilities", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      // qualifiedtobuy (40%): 62000 * 0.40 = 24800
      // presentationscheduled (60%): 30000 * 0.60 = 18000
      // weighted_forecast = 42800
      expect(parsed.weighted_forecast).toBeCloseTo(42800);
    });

    it("should include by_stage breakdown with correct probability values", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.by_stage).toHaveLength(2);

      const qualifiedStage = parsed.by_stage.find(
        (s: any) => s.stage_label === "Qualified To Buy",
      );
      expect(qualifiedStage).toBeDefined();
      expect(qualifiedStage.probability).toBeCloseTo(0.4);
      expect(qualifiedStage.deal_count).toBe(2);
      expect(qualifiedStage.total_value).toBe(62000);
    });

    it("should return error response when pipeline is not found", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue(MOCK_DEALS);

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({ pipeline_id: "unknown-pipeline" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.error).toBe("Pipeline not found");
    });

    it("should return zero forecast when pipeline has no deals", async () => {
      mockClient.listPipelines.mockResolvedValue(MOCK_PIPELINES);
      mockClient.listAllDeals.mockResolvedValue({ results: [], paging: null });

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(0);
      expect(parsed.total_pipeline_value).toBe(0);
      expect(parsed.weighted_forecast).toBe(0);
      expect(parsed.by_stage).toHaveLength(0);
    });

    it("should return error response on API failure", async () => {
      mockClient.listAllDeals.mockRejectedValue(new Error("Rate limit exceeded"));

      const handler = mockServer.getHandler("hubspot_deal_forecast");
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit exceeded");
    });
  });
});
