import { describe, it, expect, beforeEach } from "vitest";
import { registerValidationTools, computeGstinCheckDigit } from "./validation.js";

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

describe("Validation Tools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerValidationTools(server as any);
  });

  describe("tool registration", () => {
    it("should register the 3 validation tools", () => {
      const tools = server.getRegisteredTools();
      expect(tools).toContain("gst_validate_gstin");
      expect(tools).toContain("gst_validate_invoice_number");
      expect(tools).toContain("gst_get_state_info");
      expect(tools).toHaveLength(3);
    });
  });

  describe("computeGstinCheckDigit", () => {
    it("should compute correct check digit for a known GSTIN", () => {
      // 27AABCU9603R1Z → computed check digit N
      const checkDigit = computeGstinCheckDigit("27AABCU9603R1Z");
      expect(checkDigit).toBe("N");
    });

    it("should compute correct check digit for Delhi GSTIN", () => {
      // 07AABCU9603R1Z → computed check digit P
      const checkDigit = computeGstinCheckDigit("07AABCU9603R1Z");
      expect(checkDigit).toBe("P");
    });
  });

  describe("gst_validate_invoice_number", () => {
    it("should reject a 17-character invoice number", async () => {
      const handler = server.getHandler("gst_validate_invoice_number");
      const result = await handler({ invoice_number: "12345678901234567" });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.is_valid).toBe(false);
    });
  });

  describe("gst_get_state_info", () => {
    it("should return error for unknown state code 25", async () => {
      const handler = server.getHandler("gst_get_state_info");
      const result = await handler({ input: "25" });
      expect(result.isError).toBe(true);
    });
  });
});
