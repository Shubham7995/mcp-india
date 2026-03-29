import { describe, it, expect, beforeEach } from "vitest";
import { registerCalculationTools } from "./calculation.js";

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

describe("Calculation Tools — BDD", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerCalculationTools(server as any);
  });

  describe("gst_calculate_tax", () => {
    it("should split 18% into CGST+SGST for intra-state supply", async () => {
      // Given: amount 1000, rate 18%, intra-state
      // When: calculated
      const handler = server.getHandler("gst_calculate_tax");
      const result = await handler({ amount: 1000, gst_rate: 18, supply_type: "intra" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: CGST=90, SGST=90, IGST=0, total=1180
      expect(parsed.cgst_amount).toBe(90);
      expect(parsed.sgst_amount).toBe(90);
      expect(parsed.igst_amount).toBe(0);
      expect(parsed.total_tax).toBe(180);
      expect(parsed.total_amount).toBe(1180);
    });

    it("should apply full IGST for inter-state supply", async () => {
      // Given: amount 1000, rate 18%, inter-state
      // When: calculated
      const handler = server.getHandler("gst_calculate_tax");
      const result = await handler({ amount: 1000, gst_rate: 18, supply_type: "inter" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: CGST=0, SGST=0, IGST=180
      expect(parsed.cgst_amount).toBe(0);
      expect(parsed.sgst_amount).toBe(0);
      expect(parsed.igst_amount).toBe(180);
      expect(parsed.total_tax).toBe(180);
    });

    it("should correctly compute 5% GST on 10000 intra-state", async () => {
      // Given: amount 10000, rate 5%, intra-state
      const handler = server.getHandler("gst_calculate_tax");
      const result = await handler({ amount: 10000, gst_rate: 5, supply_type: "intra" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: CGST=250, SGST=250, total=10500
      expect(parsed.cgst_amount).toBe(250);
      expect(parsed.sgst_amount).toBe(250);
      expect(parsed.total_amount).toBe(10500);
    });

    it("should return zero tax for 0% rate", async () => {
      // Given: amount 500, rate 0%, inter-state
      const handler = server.getHandler("gst_calculate_tax");
      const result = await handler({ amount: 500, gst_rate: 0, supply_type: "inter" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: all tax amounts are 0
      expect(parsed.cgst_amount).toBe(0);
      expect(parsed.sgst_amount).toBe(0);
      expect(parsed.igst_amount).toBe(0);
      expect(parsed.total_tax).toBe(0);
      expect(parsed.total_amount).toBe(500);
    });
  });

  describe("gst_determine_supply_type", () => {
    it("should determine intra-state when both GSTINs share state code", async () => {
      // Given: both supplier and recipient from Maharashtra (27)
      const handler = server.getHandler("gst_determine_supply_type");
      const result = await handler({
        supplier_gstin: "27AABCU9603R1ZN",
        recipient_gstin: "27BBBCU1234R1ZX",
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: supply type is intra, applicable taxes are CGST + SGST
      expect(parsed.supply_type).toBe("intra");
      expect(parsed.applicable_taxes).toContain("CGST");
      expect(parsed.applicable_taxes).toContain("SGST");
    });

    it("should determine inter-state when GSTINs have different state codes", async () => {
      // Given: supplier from Maharashtra (27), recipient from Karnataka (29)
      const handler = server.getHandler("gst_determine_supply_type");
      const result = await handler({
        supplier_gstin: "27AABCU9603R1ZN",
        recipient_gstin: "29BBBCU1234R1ZX",
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: supply type is inter, applicable tax is IGST
      expect(parsed.supply_type).toBe("inter");
      expect(parsed.applicable_taxes).toContain("IGST");
    });

    it("should return error for invalid GSTIN format", async () => {
      // Given: an invalid supplier GSTIN
      const handler = server.getHandler("gst_determine_supply_type");
      const result = await handler({
        supplier_gstin: "INVALID",
        recipient_gstin: "29BBBCU1234R1ZX",
      });

      // Then: returns error
      expect(result.isError).toBe(true);
    });

    it("should determine intra-state for same GSTIN (intra-company)", async () => {
      // Given: same GSTIN for both
      const handler = server.getHandler("gst_determine_supply_type");
      const result = await handler({
        supplier_gstin: "27AABCU9603R1ZN",
        recipient_gstin: "27AABCU9603R1ZN",
      });
      const parsed = JSON.parse(result.content[0].text);

      // Then: intra-state
      expect(parsed.supply_type).toBe("intra");
    });
  });

  describe("gst_reverse_calculate", () => {
    it("should extract base amount from 18% GST-inclusive amount (intra)", async () => {
      // Given: inclusive amount 1180, rate 18%, intra-state
      const handler = server.getHandler("gst_reverse_calculate");
      const result = await handler({ inclusive_amount: 1180, gst_rate: 18, supply_type: "intra" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: base=1000, CGST=90, SGST=90
      expect(parsed.base_amount).toBe(1000);
      expect(parsed.cgst_amount).toBe(90);
      expect(parsed.sgst_amount).toBe(90);
    });

    it("should extract base amount from 5% GST-inclusive amount (inter)", async () => {
      // Given: inclusive amount 1050, rate 5%, inter-state
      const handler = server.getHandler("gst_reverse_calculate");
      const result = await handler({ inclusive_amount: 1050, gst_rate: 5, supply_type: "inter" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: base=1000, IGST=50
      expect(parsed.base_amount).toBe(1000);
      expect(parsed.igst_amount).toBe(50);
    });

    it("should return same amount when rate is 0%", async () => {
      // Given: inclusive amount 1000, rate 0%
      const handler = server.getHandler("gst_reverse_calculate");
      const result = await handler({ inclusive_amount: 1000, gst_rate: 0, supply_type: "intra" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: base=1000, all taxes=0
      expect(parsed.base_amount).toBe(1000);
      expect(parsed.total_tax).toBe(0);
    });

    it("should extract base amount from 28% GST-inclusive amount (inter)", async () => {
      // Given: inclusive amount 1280, rate 28%, inter-state
      const handler = server.getHandler("gst_reverse_calculate");
      const result = await handler({ inclusive_amount: 1280, gst_rate: 28, supply_type: "inter" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: base=1000
      expect(parsed.base_amount).toBe(1000);
      expect(parsed.igst_amount).toBe(280);
    });
  });
});
