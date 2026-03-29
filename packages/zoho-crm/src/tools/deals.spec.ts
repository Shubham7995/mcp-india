/**
 * BDD spec: Zoho CRM deal tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   zoho_list_deals, zoho_create_deal,
 *   zoho_update_deal_stage, zoho_get_deal
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ZohoCrmClient } from "../client.js";
import { registerDealTools } from "./deals.js";

function createMockClient() {
  return {
    listDeals: vi.fn(),
    getDeal: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
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

describe("Zoho CRM deal tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerDealTools(mockServer as any, mockClient);
  });

  // ── zoho_list_deals ────────────────────────────────────────

  describe("zoho_list_deals", () => {
    it("should return deals given the API returns data", async () => {
      // Given: Zoho CRM has deals
      (mockClient.listDeals as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { id: "d1", Deal_Name: "Acme SaaS", Stage: "Qualification", Amount: 50000 },
          { id: "d2", Deal_Name: "Beta Corp", Stage: "Proposal/Price Quote", Amount: 120000 },
        ],
        info: { count: 2, more_records: false, page: 1, per_page: 20 },
      });

      // When: the tool lists deals
      const handler = mockServer.getHandler("zoho_list_deals");
      const result = await handler({});

      // Then: both deals are returned
      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0].Deal_Name).toBe("Acme SaaS");
    });

    it("should pass sort and pagination params to the client", async () => {
      // Given: API returns data
      (mockClient.listDeals as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], info: null });

      // When: listing with sort and pagination
      const handler = mockServer.getHandler("zoho_list_deals");
      await handler({ sort_by: "Amount", sort_order: "desc", page: 2, per_page: 50 });

      // Then: params are forwarded
      expect(mockClient.listDeals).toHaveBeenCalledWith({
        sort_by: "Amount",
        sort_order: "desc",
        page: 2,
        per_page: 50,
      });
    });

    it("should return an error given the API throws", async () => {
      // Given: auth failure
      (mockClient.listDeals as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Authentication failed for Zoho CRM"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_list_deals");
      const result = await handler({});

      // Then: error response
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Authentication failed");
    });

    it("should return an empty list given no deals exist", async () => {
      // Given: no deals
      (mockClient.listDeals as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        info: { count: 0, more_records: false, page: 1, per_page: 20 },
      });

      // When: listing deals
      const handler = mockServer.getHandler("zoho_list_deals");
      const result = await handler({});

      // Then: empty array
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(0);
    });
  });

  // ── zoho_create_deal ───────────────────────────────────────

  describe("zoho_create_deal", () => {
    it("should create a deal given required fields", async () => {
      // Given: creation succeeds
      (mockClient.createDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d10" }, message: "record added", status: "success" }],
      });

      // When: creating with name and stage
      const handler = mockServer.getHandler("zoho_create_deal");
      const result = await handler({ deal_name: "New Deal", stage: "Qualification" });

      // Then: success with ID
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].code).toBe("SUCCESS");
      expect(parsed.data[0].details.id).toBe("d10");
    });

    it("should include amount and closing date given they are provided", async () => {
      // Given: creation succeeds
      (mockClient.createDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d11" }, message: "record added", status: "success" }],
      });

      // When: creating with all optional fields
      const handler = mockServer.getHandler("zoho_create_deal");
      await handler({
        deal_name: "Big Deal",
        stage: "Negotiation",
        amount: 500000,
        closing_date: "2026-06-30",
        account_id: "a1",
      });

      // Then: all fields passed to client
      expect(mockClient.createDeal).toHaveBeenCalledWith({
        Deal_Name: "Big Deal",
        Stage: "Negotiation",
        Amount: 500000,
        Closing_Date: "2026-06-30",
        Account_Name: "a1",
      });
    });

    it("should return an error given creation fails", async () => {
      // Given: validation error
      (mockClient.createDeal as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("mandatory field missing"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_create_deal");
      const result = await handler({ deal_name: "", stage: "" });

      // Then: error
      expect(result.isError).toBe(true);
    });
  });

  // ── zoho_update_deal_stage ─────────────────────────────────

  describe("zoho_update_deal_stage", () => {
    it("should update the stage given a valid deal ID", async () => {
      // Given: update succeeds
      (mockClient.updateDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d1" }, message: "record updated", status: "success" }],
      });

      // When: moving to a new stage
      const handler = mockServer.getHandler("zoho_update_deal_stage");
      const result = await handler({ deal_id: "d1", stage: "Closed Won" });

      // Then: success
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data[0].code).toBe("SUCCESS");
    });

    it("should pass only the Stage field to the client", async () => {
      // Given: update succeeds
      (mockClient.updateDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "d1" }, message: "record updated", status: "success" }],
      });

      // When: updating stage
      const handler = mockServer.getHandler("zoho_update_deal_stage");
      await handler({ deal_id: "d1", stage: "Proposal/Price Quote" });

      // Then: only Stage is sent
      expect(mockClient.updateDeal).toHaveBeenCalledWith("d1", { Stage: "Proposal/Price Quote" });
    });

    it("should return an error given the deal does not exist", async () => {
      // Given: not found
      (mockClient.updateDeal as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM record not found"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_update_deal_stage");
      const result = await handler({ deal_id: "invalid", stage: "Closed Won" });

      // Then: error
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  // ── zoho_get_deal ──────────────────────────────────────────

  describe("zoho_get_deal", () => {
    it("should return the full deal record given a valid ID", async () => {
      // Given: the deal exists
      (mockClient.getDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "d1",
        Deal_Name: "Acme SaaS",
        Stage: "Qualification",
        Amount: 50000,
        Closing_Date: "2026-06-30",
        Pipeline: "Standard",
        Probability: 40,
      });

      // When: fetching the deal
      const handler = mockServer.getHandler("zoho_get_deal");
      const result = await handler({ deal_id: "d1" });

      // Then: all fields present
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("d1");
      expect(parsed.Deal_Name).toBe("Acme SaaS");
      expect(parsed.Amount).toBe(50000);
      expect(parsed.Probability).toBe(40);
    });

    it("should pass the correct deal ID to the client", async () => {
      // Given: client returns data
      (mockClient.getDeal as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "d99", Deal_Name: "Test" });

      // When: requesting by ID
      const handler = mockServer.getHandler("zoho_get_deal");
      await handler({ deal_id: "d99" });

      // Then: correct ID passed
      expect(mockClient.getDeal).toHaveBeenCalledWith("d99");
    });

    it("should return an error given the deal ID does not exist", async () => {
      // Given: not found
      (mockClient.getDeal as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM record not found"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_get_deal");
      const result = await handler({ deal_id: "invalid" });

      // Then: error
      expect(result.isError).toBe(true);
    });
  });
});
