import { describe, it, expect, beforeEach } from "vitest";
import { registerValidationTools } from "./validation.js";

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

describe("Validation Tools — BDD", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerValidationTools(server as any);
  });

  describe("gst_validate_gstin", () => {
    it("should return valid breakdown given a correct GSTIN", async () => {
      // Given: a known valid GSTIN for Maharashtra
      // When: the tool is invoked
      const handler = server.getHandler("gst_validate_gstin");
      const result = await handler({ gstin: "27AABCU9603R1ZN" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: all breakdown fields are correct
      expect(parsed.is_valid).toBe(true);
      expect(parsed.state_code).toBe("27");
      expect(parsed.state_name).toBe("Maharashtra");
      expect(parsed.pan).toBe("AABCU9603R");
      expect(parsed.entity_number).toBe("1");
    });

    it("should return invalid given a GSTIN with wrong check digit", async () => {
      // Given: a GSTIN where the check digit (last char) is deliberately wrong
      // When: validated
      const handler = server.getHandler("gst_validate_gstin");
      const result = await handler({ gstin: "27AABCU9603R1ZA" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: is_valid is false with a check digit error
      expect(parsed.is_valid).toBe(false);
      expect(parsed.error).toContain("check digit");
    });

    it("should return invalid given a string shorter than 15 characters", async () => {
      // Given: a short string
      // When: validated
      const handler = server.getHandler("gst_validate_gstin");
      const result = await handler({ gstin: "27AABCU" });

      // Then: returns an error response
      expect(result.isError).toBe(true);
    });

    it("should correctly identify Delhi as a union territory", async () => {
      // Given: a GSTIN starting with 07 (Delhi)
      // When: validated with a correctly computed check digit
      const handler = server.getHandler("gst_validate_gstin");
      const result = await handler({ gstin: "07AABCU9603R1ZP" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: state is Delhi and type info is available
      expect(parsed.state_code).toBe("07");
      expect(parsed.state_name).toBe("Delhi");
    });
  });

  describe("gst_validate_invoice_number", () => {
    it("should accept a valid invoice number within 16 chars", async () => {
      // Given: a proper format invoice number
      // When: validated
      const handler = server.getHandler("gst_validate_invoice_number");
      const result = await handler({ invoice_number: "INV/2026-27/001" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: is_valid is true with correct length
      expect(parsed.is_valid).toBe(true);
      expect(parsed.length).toBe(15);
      expect(parsed.errors).toHaveLength(0);
    });

    it("should reject an invoice number exceeding 16 characters", async () => {
      // Given: a 20-character invoice number
      // When: validated
      const handler = server.getHandler("gst_validate_invoice_number");
      const result = await handler({ invoice_number: "INVOICE-2026-27-0001" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: is_valid is false with length error
      expect(parsed.is_valid).toBe(false);
      expect(parsed.errors).toContain("Invoice number must not exceed 16 characters");
    });

    it("should reject an invoice number containing spaces", async () => {
      // Given: an invoice number with a space
      // When: validated
      const handler = server.getHandler("gst_validate_invoice_number");
      const result = await handler({ invoice_number: "INV 001" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: is_valid is false
      expect(parsed.is_valid).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
    });

    it("should accept a short valid invoice number", async () => {
      // Given: a 12-character invoice number
      // When: validated
      const handler = server.getHandler("gst_validate_invoice_number");
      const result = await handler({ invoice_number: "INV/2024/001" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: is_valid is true
      expect(parsed.is_valid).toBe(true);
      expect(parsed.length).toBe(12);
    });
  });

  describe("gst_get_state_info", () => {
    it("should return Maharashtra info given state code 27", async () => {
      // Given: state code for Maharashtra
      // When: queried
      const handler = server.getHandler("gst_get_state_info");
      const result = await handler({ input: "27" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: returns correct state info
      expect(parsed.code).toBe("27");
      expect(parsed.name).toBe("Maharashtra");
      expect(parsed.type).toBe("state");
    });

    it("should return Delhi UT info given state code 07", async () => {
      // Given: state code for Delhi
      // When: queried
      const handler = server.getHandler("gst_get_state_info");
      const result = await handler({ input: "07" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: returns Delhi as union territory
      expect(parsed.code).toBe("07");
      expect(parsed.name).toBe("Delhi");
      expect(parsed.type).toBe("ut");
    });

    it("should return error for an invalid state code", async () => {
      // Given: a non-existent state code
      // When: queried
      const handler = server.getHandler("gst_get_state_info");
      const result = await handler({ input: "99" });

      // Then: returns error response
      expect(result.isError).toBe(true);
    });

    it("should extract state code from a full GSTIN", async () => {
      // Given: a full 15-char GSTIN starting with 29 (Karnataka)
      // When: queried
      const handler = server.getHandler("gst_get_state_info");
      const result = await handler({ input: "29AABCU9603R1ZK" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: extracts and returns Karnataka info
      expect(parsed.code).toBe("29");
      expect(parsed.name).toBe("Karnataka");
    });
  });
});
