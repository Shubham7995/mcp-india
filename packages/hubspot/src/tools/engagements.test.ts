import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HubSpotClient } from "../client.js";
import { registerEngagementTools } from "./engagements.js";

function createMockClient(): {
  [K in keyof HubSpotClient]: ReturnType<typeof vi.fn>;
} {
  return {
    searchContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    searchCompanies: vi.fn(),
    getCompany: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    searchDeals: vi.fn(),
    getDeal: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    createNote: vi.fn(),
    createTask: vi.fn(),
    logEmail: vi.fn(),
    listActivities: vi.fn(),
    listPipelines: vi.fn(),
    listAllDeals: vi.fn(),
  } as unknown as { [K in keyof HubSpotClient]: ReturnType<typeof vi.fn> };
}

function createMockServer() {
  const tools = new Map<
    string,
    { description: string; schema: unknown; handler: Function }
  >();

  return {
    tool: (
      name: string,
      description: string,
      schema: unknown,
      handler: Function,
    ) => {
      tools.set(name, { description, schema, handler });
    },
    getHandler: (name: string) => {
      const entry = tools.get(name);
      if (!entry) throw new Error(`Tool "${name}" not registered`);
      return entry.handler;
    },
    getRegisteredTools: () => Array.from(tools.keys()),
  };
}

describe("Engagement Tools", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerEngagementTools(mockServer as any, mockClient as any);
  });

  describe("tool registration", () => {
    it("should register all 4 engagement tools", () => {
      const tools = mockServer.getRegisteredTools();
      expect(tools).toContain("hubspot_create_note");
      expect(tools).toContain("hubspot_create_task");
      expect(tools).toContain("hubspot_log_email");
      expect(tools).toContain("hubspot_list_activities");
      expect(tools).toHaveLength(4);
    });
  });

  describe("hubspot_create_note", () => {
    it("should create a note with body content", async () => {
      mockClient.createNote.mockResolvedValue({
        id: "1101",
        properties: {
          hs_note_body: "Meeting went well. Follow up in 2 weeks.",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_note");
      const result = await handler({ body: "Meeting went well. Follow up in 2 weeks." });

      expect(mockClient.createNote).toHaveBeenCalledWith({
        hs_note_body: "Meeting went well. Follow up in 2 weeks.",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1101");
    });

    it("should include hs_timestamp when timestamp is provided", async () => {
      mockClient.createNote.mockResolvedValue({
        id: "1102",
        properties: {
          hs_note_body: "Timestamped note.",
          hs_timestamp: "2026-03-28T15:00:00Z",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_note");
      await handler({
        body: "Timestamped note.",
        timestamp: "2026-03-28T15:00:00Z",
      });

      expect(mockClient.createNote).toHaveBeenCalledWith({
        hs_note_body: "Timestamped note.",
        hs_timestamp: "2026-03-28T15:00:00Z",
      });
    });

    it("should omit hs_timestamp when timestamp is not provided", async () => {
      mockClient.createNote.mockResolvedValue({ id: "1103", properties: {} });

      const handler = mockServer.getHandler("hubspot_create_note");
      await handler({ body: "No timestamp note." });

      const callArg = mockClient.createNote.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("hs_timestamp");
    });

    it("should return error response on API failure", async () => {
      mockClient.createNote.mockRejectedValue(new Error("Forbidden"));

      const handler = mockServer.getHandler("hubspot_create_note");
      const result = await handler({ body: "Failing note." });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forbidden");
    });
  });

  describe("hubspot_create_task", () => {
    it("should create a task with subject and status NOT_STARTED", async () => {
      mockClient.createTask.mockResolvedValue({
        id: "1201",
        properties: {
          hs_task_subject: "Follow up with Alice",
          hs_task_status: "NOT_STARTED",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_create_task");
      const result = await handler({ subject: "Follow up with Alice" });

      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          hs_task_subject: "Follow up with Alice",
          hs_task_status: "NOT_STARTED",
        }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1201");
    });

    it("should include body, due_date, and priority when provided", async () => {
      mockClient.createTask.mockResolvedValue({ id: "1202", properties: {} });

      const handler = mockServer.getHandler("hubspot_create_task");
      await handler({
        subject: "Send proposal",
        body: "Include pricing deck",
        due_date: "2026-04-15",
        priority: "HIGH",
      });

      expect(mockClient.createTask).toHaveBeenCalledWith({
        hs_task_subject: "Send proposal",
        hs_task_status: "NOT_STARTED",
        hs_task_body: "Include pricing deck",
        hs_timestamp: "2026-04-15",
        hs_task_priority: "HIGH",
      });
    });

    it("should omit optional fields when not provided", async () => {
      mockClient.createTask.mockResolvedValue({ id: "1203", properties: {} });

      const handler = mockServer.getHandler("hubspot_create_task");
      await handler({ subject: "Minimal task" });

      const callArg = mockClient.createTask.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("hs_task_body");
      expect(callArg).not.toHaveProperty("hs_timestamp");
      expect(callArg).not.toHaveProperty("hs_task_priority");
    });

    it("should return error response on API failure", async () => {
      mockClient.createTask.mockRejectedValue(new Error("Unauthorized"));

      const handler = mockServer.getHandler("hubspot_create_task");
      const result = await handler({ subject: "Failing task" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unauthorized");
    });
  });

  describe("hubspot_log_email", () => {
    it("should log an email with subject and default direction INCOMING_EMAIL", async () => {
      mockClient.logEmail.mockResolvedValue({
        id: "1301",
        properties: {
          hs_email_subject: "Product demo request",
          hs_email_direction: "INCOMING_EMAIL",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      const handler = mockServer.getHandler("hubspot_log_email");
      const result = await handler({ subject: "Product demo request" });

      expect(mockClient.logEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          hs_email_subject: "Product demo request",
          hs_email_direction: "INCOMING_EMAIL",
        }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1301");
    });

    it("should use provided direction when specified", async () => {
      mockClient.logEmail.mockResolvedValue({ id: "1302", properties: {} });

      const handler = mockServer.getHandler("hubspot_log_email");
      await handler({
        subject: "Forwarded inquiry",
        direction: "FORWARDED_EMAIL",
      });

      expect(mockClient.logEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          hs_email_subject: "Forwarded inquiry",
          hs_email_direction: "FORWARDED_EMAIL",
        }),
      );
    });

    it("should include body and timestamp when provided", async () => {
      mockClient.logEmail.mockResolvedValue({ id: "1303", properties: {} });

      const handler = mockServer.getHandler("hubspot_log_email");
      await handler({
        subject: "Detailed email",
        body: "Here is the proposal attached.",
        timestamp: "2026-03-28T09:00:00Z",
      });

      expect(mockClient.logEmail).toHaveBeenCalledWith({
        hs_email_subject: "Detailed email",
        hs_email_direction: "INCOMING_EMAIL",
        hs_email_text: "Here is the proposal attached.",
        hs_timestamp: "2026-03-28T09:00:00Z",
      });
    });

    it("should omit optional fields when not provided", async () => {
      mockClient.logEmail.mockResolvedValue({ id: "1304", properties: {} });

      const handler = mockServer.getHandler("hubspot_log_email");
      await handler({ subject: "Minimal email" });

      const callArg = mockClient.logEmail.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("hs_email_text");
      expect(callArg).not.toHaveProperty("hs_timestamp");
    });

    it("should return error response on API failure", async () => {
      mockClient.logEmail.mockRejectedValue(new Error("Rate limit exceeded"));

      const handler = mockServer.getHandler("hubspot_log_email");
      const result = await handler({ subject: "Failing email" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit exceeded");
    });
  });

  describe("hubspot_list_activities", () => {
    it("should list activities for a contact", async () => {
      mockClient.listActivities.mockResolvedValue({
        results: [
          { id: "eng_1", type: "NOTE" },
          { id: "eng_2", type: "EMAIL" },
        ],
        paging: { next: { after: "nextCursor" } },
      });

      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "contacts",
        object_id: "101",
        limit: 10,
      });

      expect(mockClient.listActivities).toHaveBeenCalledWith("contacts", "101", 10);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results).toHaveLength(2);
    });

    it("should list activities for a deal", async () => {
      mockClient.listActivities.mockResolvedValue({
        results: [{ id: "eng_3", type: "TASK" }],
        paging: null,
      });

      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "deals",
        object_id: "801",
        limit: 5,
      });

      expect(mockClient.listActivities).toHaveBeenCalledWith("deals", "801", 5);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results).toHaveLength(1);
    });

    it("should list activities for a company", async () => {
      mockClient.listActivities.mockResolvedValue({ results: [], paging: null });

      const handler = mockServer.getHandler("hubspot_list_activities");
      await handler({ object_type: "companies", object_id: "501", limit: 10 });

      expect(mockClient.listActivities).toHaveBeenCalledWith("companies", "501", 10);
    });

    it("should return error response on API failure", async () => {
      mockClient.listActivities.mockRejectedValue(new Error("Object not found"));

      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "contacts",
        object_id: "999",
        limit: 10,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Object not found");
    });
  });
});
