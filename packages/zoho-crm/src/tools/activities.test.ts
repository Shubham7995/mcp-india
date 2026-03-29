import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ZohoCrmClient } from "../client.js";
import { registerActivityTools } from "./activities.js";

function createMockClient() {
  return {
    createTask: vi.fn(),
    listTasks: vi.fn(),
    logCall: vi.fn(),
    createNote: vi.fn(),
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

describe("Activity Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerActivityTools(mockServer as any, mockClient);
  });

  describe("tool registration", () => {
    it("should register all 4 activity tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("zoho_create_task");
      expect(tools).toContain("zoho_list_tasks");
      expect(tools).toContain("zoho_log_call");
      expect(tools).toContain("zoho_create_note");
      expect(tools).toHaveLength(4);
    });
  });

  describe("zoho_create_task", () => {
    it("should map subject to Subject field", async () => {
      (mockClient.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "t1" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_task");
      await handler({ subject: "Follow up", contact_id: "c1" });

      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ Subject: "Follow up", Who_Id: "c1" }),
      );
    });

    it("should omit optional fields when not provided", async () => {
      (mockClient.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "t2" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_task");
      await handler({ subject: "Simple task" });

      const calledWith = (mockClient.createTask as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledWith).toEqual({ Subject: "Simple task" });
    });
  });

  describe("zoho_list_tasks", () => {
    it("should return task list as JSON", async () => {
      (mockClient.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ id: "t1", Subject: "Test" }],
        info: { count: 1, more_records: false, page: 1, per_page: 20 },
      });

      const handler = mockServer.getHandler("zoho_list_tasks");
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(1);
    });
  });

  describe("zoho_log_call", () => {
    it("should include duration as string given duration_minutes", async () => {
      (mockClient.logCall as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "call1" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_log_call");
      await handler({ subject: "Call", duration_minutes: 45 });

      expect(mockClient.logCall).toHaveBeenCalledWith(
        expect.objectContaining({ Call_Duration: "45" }),
      );
    });

    it("should omit duration given it is not provided", async () => {
      (mockClient.logCall as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "call2" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_log_call");
      await handler({ subject: "Quick call" });

      const calledWith = (mockClient.logCall as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledWith).not.toHaveProperty("Call_Duration");
    });
  });

  describe("zoho_create_note", () => {
    it("should set the correct module field", async () => {
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "n1" }, status: "success" }],
      });

      const handler = mockServer.getHandler("zoho_create_note");
      await handler({ note_content: "Note text", parent_id: "d1", module: "Deals" });

      expect(mockClient.createNote).toHaveBeenCalledWith(
        expect.objectContaining({ $se_module: "Deals", Parent_Id: "d1" }),
      );
    });
  });
});
