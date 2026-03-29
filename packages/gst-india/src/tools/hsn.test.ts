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

describe("HSN Tools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    server = createMockServer();
    registerHsnTools(server as any);
  });

  describe("tool registration", () => {
    it("should register the 3 HSN tools", () => {
      const tools = server.getRegisteredTools();
      expect(tools).toContain("gst_search_hsn");
      expect(tools).toContain("gst_get_hsn_details");
      expect(tools).toContain("gst_list_rate_slabs");
      expect(tools).toHaveLength(3);
    });
  });

  describe("gst_search_hsn", () => {
    it("should return at most 20 results", async () => {
      // "service" should match many SAC codes but cap at 20
      const handler = server.getHandler("gst_search_hsn");
      const result = await handler({ query: "service" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.results.length).toBeLessThanOrEqual(20);
    });

    it("should be case-insensitive", async () => {
      const handler = server.getHandler("gst_search_hsn");
      const upper = await handler({ query: "LAPTOP" });
      const lower = await handler({ query: "laptop" });

      const upperParsed = JSON.parse(upper.content[0].text);
      const lowerParsed = JSON.parse(lower.content[0].text);

      expect(upperParsed.results.length).toBe(lowerParsed.results.length);
    });
  });

  describe("gst_get_hsn_details", () => {
    it("should find SAC codes starting with 99", async () => {
      const handler = server.getHandler("gst_get_hsn_details");
      const result = await handler({ code: "998512" });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.code).toBe("998512");
      expect(parsed.description).toMatch(/software/i);
    });
  });

  describe("gst_list_rate_slabs", () => {
    it("should return exactly 6 slabs", async () => {
      const handler = server.getHandler("gst_list_rate_slabs");
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.slabs).toHaveLength(6);
    });
  });
});
