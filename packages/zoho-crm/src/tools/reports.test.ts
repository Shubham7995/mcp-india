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

describe("Report Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerReportTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register the 2 report tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("zoho_sales_pipeline_summary");
      expect(tools).toContain("zoho_revenue_forecast");
      expect(tools).toHaveLength(2);
    });
  });

  describe("zoho_sales_pipeline_summary", () => {
    it("should group deals by stage and compute totals", async () => {
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Stage: "Qual", Amount: 50000, Pipeline: null, Probability: 30 },
        { id: "d2", Stage: "Qual", Amount: 50000, Pipeline: null, Probability: 50 },
        { id: "d3", Stage: "Won", Amount: 100000, Pipeline: null, Probability: 100 },
      ]);

      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(3);
      expect(parsed.total_pipeline_value).toBe(200000);
      expect(parsed.stages).toHaveLength(2);
    });

    it("should handle deals with null amounts", async () => {
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Stage: "Qual", Amount: null, Pipeline: null, Probability: 30 },
      ]);

      const handler = mockServer.getHandler("zoho_sales_pipeline_summary");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_pipeline_value).toBe(0);
      expect(parsed.stages[0].total_value).toBe(0);
    });
  });

  describe("zoho_revenue_forecast", () => {
    it("should filter deals by closing date", async () => {
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Stage: "Negotiation", Amount: 100000, Closing_Date: "2026-05-01", Probability: 70 },
        { id: "d2", Stage: "Qual", Amount: 50000, Closing_Date: "2026-12-01", Probability: 20 },
      ]);

      const handler = mockServer.getHandler("zoho_revenue_forecast");
      const result = await handler({ closing_before: "2026-06-01" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(1);
      expect(parsed.total_pipeline_value).toBe(100000);
    });

    it("should exclude deals without a closing date", async () => {
      (mockClient.getAllDeals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "d1", Stage: "Qual", Amount: 50000, Closing_Date: null, Probability: 30 },
        { id: "d2", Stage: "Qual", Amount: 80000, Closing_Date: "2026-05-01", Probability: 50 },
      ]);

      const handler = mockServer.getHandler("zoho_revenue_forecast");
      const result = await handler({ closing_before: "2026-06-01" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_deals).toBe(1);
    });
  });
});
