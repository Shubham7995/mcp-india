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

describe("Calculation Tools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerCalculationTools(server as any);
  });

  describe("tool registration", () => {
    it("should register the 3 calculation tools", () => {
      const tools = server.getRegisteredTools();
      expect(tools).toContain("gst_calculate_tax");
      expect(tools).toContain("gst_determine_supply_type");
      expect(tools).toContain("gst_reverse_calculate");
      expect(tools).toHaveLength(3);
    });
  });

  describe("gst_calculate_tax", () => {
    it("should round to 2 decimal places for fractional amounts", async () => {
      const handler = server.getHandler("gst_calculate_tax");
      const result = await handler({ amount: 333.33, gst_rate: 18, supply_type: "intra" });
      const parsed = JSON.parse(result.content[0].text);

      // 333.33 * 0.09 = 29.9997 → rounded to 30.00
      expect(parsed.cgst_amount).toBe(30);
      expect(parsed.sgst_amount).toBe(30);
      expect(parsed.total_tax).toBe(60);
    });
  });

  describe("gst_determine_supply_type", () => {
    it("should correctly extract state codes from first 2 chars", async () => {
      const handler = server.getHandler("gst_determine_supply_type");
      const result = await handler({
        supplier_gstin: "33AABCU9603R1ZX",
        recipient_gstin: "33BBBCU1234R1ZX",
      });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.supplier_state).toBe("Tamil Nadu");
      expect(parsed.recipient_state).toBe("Tamil Nadu");
    });

    it("should reject GSTIN shorter than 15 characters", async () => {
      const handler = server.getHandler("gst_determine_supply_type");
      const result = await handler({
        supplier_gstin: "27",
        recipient_gstin: "29BBBCU1234R1ZX",
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("gst_reverse_calculate", () => {
    it("should return correct supply_type in output", async () => {
      const handler = server.getHandler("gst_reverse_calculate");
      const result = await handler({ inclusive_amount: 1180, gst_rate: 18, supply_type: "inter" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.supply_type).toBe("inter");
      expect(parsed.igst_amount).toBeGreaterThan(0);
      expect(parsed.cgst_amount).toBe(0);
    });
  });
});
