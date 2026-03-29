/**
 * BDD spec: Zoho CRM activity tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   zoho_create_task, zoho_list_tasks,
 *   zoho_log_call, zoho_create_note
 */

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

describe("Zoho CRM activity tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerActivityTools(mockServer as any, mockClient);
  });

  // ── zoho_create_task ───────────────────────────────────────

  describe("zoho_create_task", () => {
    it("should create a task linked to a contact given a contact_id", async () => {
      // Given: task creation succeeds
      (mockClient.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "t1" }, message: "record added", status: "success" }],
      });

      // When: creating a task with a contact link
      const handler = mockServer.getHandler("zoho_create_task");
      const result = await handler({
        subject: "Follow up with Priya",
        due_date: "2026-04-05",
        contact_id: "c1",
      });

      // Then: task created with Who_Id set
      expect(result.isError).toBeUndefined();
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ Subject: "Follow up with Priya", Who_Id: "c1", Due_Date: "2026-04-05" }),
      );
    });

    it("should create a task linked to a deal given a deal_id", async () => {
      // Given: creation succeeds
      (mockClient.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "t2" }, message: "record added", status: "success" }],
      });

      // When: linking to a deal
      const handler = mockServer.getHandler("zoho_create_task");
      await handler({ subject: "Send proposal", deal_id: "d1" });

      // Then: What_Id is set
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ Subject: "Send proposal", What_Id: "d1" }),
      );
    });

    it("should include priority and description given they are provided", async () => {
      // Given: creation succeeds
      (mockClient.createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "t3" }, message: "record added", status: "success" }],
      });

      // When: full task details
      const handler = mockServer.getHandler("zoho_create_task");
      await handler({
        subject: "Urgent review",
        priority: "High",
        description: "Review the contract",
      });

      // Then: all fields present
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ Priority: "High", Description: "Review the contract" }),
      );
    });

    it("should return an error given the API rejects the request", async () => {
      // Given: validation error
      (mockClient.createTask as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("mandatory field missing"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_create_task");
      const result = await handler({ subject: "" });

      // Then: error
      expect(result.isError).toBe(true);
    });
  });

  // ── zoho_list_tasks ────────────────────────────────────────

  describe("zoho_list_tasks", () => {
    it("should return tasks given the API returns data", async () => {
      // Given: tasks exist
      (mockClient.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          { id: "t1", Subject: "Follow up", Status: "Not Started", Due_Date: "2026-04-05" },
          { id: "t2", Subject: "Review", Status: "In Progress", Due_Date: "2026-04-10" },
        ],
        info: { count: 2, more_records: false, page: 1, per_page: 20 },
      });

      // When: listing tasks
      const handler = mockServer.getHandler("zoho_list_tasks");
      const result = await handler({});

      // Then: both tasks returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(2);
    });

    it("should pass pagination params to the client", async () => {
      // Given: API returns data
      (mockClient.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

      // When: with pagination
      const handler = mockServer.getHandler("zoho_list_tasks");
      await handler({ page: 3, per_page: 100 });

      // Then: params forwarded
      expect(mockClient.listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, per_page: 100 }),
      );
    });

    it("should return an empty list given no tasks exist", async () => {
      // Given: no tasks
      (mockClient.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [],
        info: { count: 0, more_records: false, page: 1, per_page: 20 },
      });

      // When: listing
      const handler = mockServer.getHandler("zoho_list_tasks");
      const result = await handler({});

      // Then: empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data).toHaveLength(0);
    });

    it("should return an error given the API throws", async () => {
      // Given: API failure
      (mockClient.listTasks as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("rate limit exceeded"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_list_tasks");
      const result = await handler({});

      // Then: error
      expect(result.isError).toBe(true);
    });
  });

  // ── zoho_log_call ──────────────────────────────────────────

  describe("zoho_log_call", () => {
    it("should log a call with duration and contact given all fields", async () => {
      // Given: call logging succeeds
      (mockClient.logCall as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "call1" }, message: "record added", status: "success" }],
      });

      // When: logging with full details
      const handler = mockServer.getHandler("zoho_log_call");
      const result = await handler({
        subject: "Discovery call",
        duration_minutes: 30,
        contact_id: "c1",
        description: "Discussed requirements",
      });

      // Then: success
      expect(result.isError).toBeUndefined();
      expect(mockClient.logCall).toHaveBeenCalledWith(
        expect.objectContaining({
          Subject: "Discovery call",
          Call_Duration: "30",
          Who_Id: "c1",
          Description: "Discussed requirements",
        }),
      );
    });

    it("should log a call without optional duration given it is omitted", async () => {
      // Given: call logging succeeds
      (mockClient.logCall as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "call2" }, message: "record added", status: "success" }],
      });

      // When: only subject provided
      const handler = mockServer.getHandler("zoho_log_call");
      await handler({ subject: "Quick check-in" });

      // Then: no Call_Duration field
      const calledWith = (mockClient.logCall as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledWith).not.toHaveProperty("Call_Duration");
    });

    it("should return an error given the API throws", async () => {
      // Given: error
      (mockClient.logCall as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API error"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_log_call");
      const result = await handler({ subject: "test" });

      // Then: error
      expect(result.isError).toBe(true);
    });
  });

  // ── zoho_create_note ───────────────────────────────────────

  describe("zoho_create_note", () => {
    it("should create a note on a contact given module is Contacts", async () => {
      // Given: note creation succeeds
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "n1" }, message: "record added", status: "success" }],
      });

      // When: adding a note to a contact
      const handler = mockServer.getHandler("zoho_create_note");
      const result = await handler({
        note_content: "Met at the conference",
        title: "Conference Notes",
        parent_id: "c1",
        module: "Contacts",
      });

      // Then: correct fields sent
      expect(result.isError).toBeUndefined();
      expect(mockClient.createNote).toHaveBeenCalledWith({
        Note_Content: "Met at the conference",
        Note_Title: "Conference Notes",
        Parent_Id: "c1",
        $se_module: "Contacts",
      });
    });

    it("should create a note on a deal given module is Deals", async () => {
      // Given: note creation succeeds
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "n2" }, message: "record added", status: "success" }],
      });

      // When: adding a note to a deal
      const handler = mockServer.getHandler("zoho_create_note");
      await handler({ note_content: "Price negotiation", parent_id: "d1", module: "Deals" });

      // Then: $se_module is Deals
      expect(mockClient.createNote).toHaveBeenCalledWith(
        expect.objectContaining({ $se_module: "Deals", Parent_Id: "d1" }),
      );
    });

    it("should omit title given it is not provided", async () => {
      // Given: note creation succeeds
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ code: "SUCCESS", details: { id: "n3" }, message: "record added", status: "success" }],
      });

      // When: creating without title
      const handler = mockServer.getHandler("zoho_create_note");
      await handler({ note_content: "Quick note", parent_id: "c2", module: "Contacts" });

      // Then: no Note_Title field
      const calledWith = (mockClient.createNote as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledWith).not.toHaveProperty("Note_Title");
    });

    it("should return an error given an invalid parent ID", async () => {
      // Given: not found
      (mockClient.createNote as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Zoho CRM record not found"),
      );

      // When: the tool is invoked
      const handler = mockServer.getHandler("zoho_create_note");
      const result = await handler({ note_content: "test", parent_id: "bad", module: "Contacts" });

      // Then: error
      expect(result.isError).toBe(true);
    });
  });
});
