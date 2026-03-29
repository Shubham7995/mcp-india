import { describe, it, expect, beforeEach } from "vitest";
import { registerHsnTools } from "./hsn.js";

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

describe("HSN Tools — BDD", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerHsnTools(server as any);
  });

  describe("gst_search_hsn", () => {
    it("should find laptop-related entries when searching by keyword", async () => {
      // Given: keyword "laptop"
      // When: searched
      const handler = server.getHandler("gst_search_hsn");
      const result = await handler({ query: "laptop" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: results include HSN 8471 with rate 18
      expect(parsed.results.length).toBeGreaterThan(0);
      const laptopEntry = parsed.results.find((r: any) => r.code === "8471");
      expect(laptopEntry).toBeDefined();
      expect(laptopEntry.rate).toBe(18);
    });

    it("should find entries by partial HSN code", async () => {
      // Given: partial code "8471"
      // When: searched
      const handler = server.getHandler("gst_search_hsn");
      const result = await handler({ query: "8471" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: results include entries matching 8471
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.results[0].code).toContain("8471");
    });

    it("should return empty results for a non-matching keyword", async () => {
      // Given: a nonsense keyword
      // When: searched
      const handler = server.getHandler("gst_search_hsn");
      const result = await handler({ query: "xyznonexistent" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: results are empty, not an error
      expect(parsed.results).toHaveLength(0);
      expect(result.isError).toBeUndefined();
    });

    it("should find rice entries with 0% rate", async () => {
      // Given: keyword "rice"
      // When: searched
      const handler = server.getHandler("gst_search_hsn");
      const result = await handler({ query: "rice" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: at least one result with rate 0
      expect(parsed.results.length).toBeGreaterThan(0);
      const riceEntry = parsed.results.find((r: any) => r.rate === 0);
      expect(riceEntry).toBeDefined();
    });
  });

  describe("gst_get_hsn_details", () => {
    it("should return details for HSN code 8471 (computers)", async () => {
      // Given: HSN code 8471
      // When: fetched
      const handler = server.getHandler("gst_get_hsn_details");
      const result = await handler({ code: "8471" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: returns computer description with rate 18
      expect(parsed.description).toMatch(/computer|data processing/i);
      expect(parsed.rate).toBe(18);
    });

    it("should return details for SAC code 9983 (professional services)", async () => {
      // Given: SAC code 9983
      // When: fetched
      const handler = server.getHandler("gst_get_hsn_details");
      const result = await handler({ code: "9983" });
      const parsed = JSON.parse(result.content[0].text);

      // Then: returns professional services description
      expect(parsed.description).toMatch(/professional|business/i);
      expect(parsed.rate).toBe(18);
    });

    it("should return error for an unknown code", async () => {
      // Given: a non-existent code
      // When: fetched
      const handler = server.getHandler("gst_get_hsn_details");
      const result = await handler({ code: "0000" });

      // Then: returns error
      expect(result.isError).toBe(true);
    });
  });

  describe("gst_list_rate_slabs", () => {
    it("should return all rate slabs", async () => {
      // When: invoked
      const handler = server.getHandler("gst_list_rate_slabs");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      // Then: returns multiple slabs including 0, 5, 12, 18, 28
      expect(parsed.slabs.length).toBeGreaterThanOrEqual(5);
      const rates = parsed.slabs.map((s: any) => s.rate);
      expect(rates).toContain(0);
      expect(rates).toContain(5);
      expect(rates).toContain(18);
      expect(rates).toContain(28);
    });

    it("should include example categories in each slab", async () => {
      const handler = server.getHandler("gst_list_rate_slabs");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      // Then: each slab has at least 3 examples
      for (const slab of parsed.slabs) {
        expect(slab.example_categories.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("should include essential goods in the 0% slab", async () => {
      const handler = server.getHandler("gst_list_rate_slabs");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      // Then: 0% slab mentions vegetables or milk
      const exemptSlab = parsed.slabs.find((s: any) => s.rate === 0);
      const examples = exemptSlab.example_categories.join(" ").toLowerCase();
      expect(examples).toMatch(/vegetables|milk|fruit/);
    });
  });
});
