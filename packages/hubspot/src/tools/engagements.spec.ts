/**
 * BDD spec: HubSpot engagement tools
 * Perspective: AI assistant invoking tools on behalf of a user.
 *
 * Tools covered:
 *   hubspot_create_note, hubspot_create_task,
 *   hubspot_log_email, hubspot_list_activities
 */

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

describe("hubspot engagement tools — BDD specs", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = createMockServer();
    registerEngagementTools(mockServer as any, mockClient as any);
  });

  // ── hubspot_create_note ─────────────────────────────────────

  describe("hubspot_create_note", () => {
    it("should create a note given a body string", async () => {
      // Given: HubSpot will accept the note
      mockClient.createNote.mockResolvedValue({
        id: "1101",
        properties: { hs_note_body: "Discussed pricing with Alice." },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with a body
      const handler = mockServer.getHandler("hubspot_create_note");
      const result = await handler({ body: "Discussed pricing with Alice." });

      // Then: the note is created and its ID is returned
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1101");
      expect(parsed.properties.hs_note_body).toBe("Discussed pricing with Alice.");
    });

    it("should create a note with a timestamp given one is provided", async () => {
      // Given: a specific timestamp is known for the note
      mockClient.createNote.mockResolvedValue({
        id: "1102",
        properties: {
          hs_note_body: "Historical note.",
          hs_timestamp: "2026-01-15T09:00:00Z",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with body and timestamp
      const handler = mockServer.getHandler("hubspot_create_note");
      const result = await handler({
        body: "Historical note.",
        timestamp: "2026-01-15T09:00:00Z",
      });

      // Then: hs_timestamp is included in the client call
      expect(mockClient.createNote).toHaveBeenCalledWith({
        hs_note_body: "Historical note.",
        hs_timestamp: "2026-01-15T09:00:00Z",
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1102");
    });

    it("should return an error response given an API failure", async () => {
      // Given: the API rejects the request
      mockClient.createNote.mockRejectedValue(new Error("Forbidden access"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_create_note");
      const result = await handler({ body: "This note will fail." });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forbidden access");
    });
  });

  // ── hubspot_create_task ─────────────────────────────────────

  describe("hubspot_create_task", () => {
    it("should create a high-priority task given subject, body, due_date, and priority", async () => {
      // Given: HubSpot will create the task
      mockClient.createTask.mockResolvedValue({
        id: "1201",
        properties: {
          hs_task_subject: "Send contract to Alice",
          hs_task_status: "NOT_STARTED",
          hs_task_body: "Include NDA addendum",
          hs_timestamp: "2026-04-10",
          hs_task_priority: "HIGH",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with all fields
      const handler = mockServer.getHandler("hubspot_create_task");
      const result = await handler({
        subject: "Send contract to Alice",
        body: "Include NDA addendum",
        due_date: "2026-04-10",
        priority: "HIGH",
      });

      // Then: the task is created with all fields
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1201");
      expect(parsed.properties.hs_task_priority).toBe("HIGH");
    });

    it("should create a task with status NOT_STARTED regardless of input", async () => {
      // Given: HubSpot always initialises tasks as NOT_STARTED
      mockClient.createTask.mockResolvedValue({
        id: "1202",
        properties: { hs_task_subject: "Quick follow-up", hs_task_status: "NOT_STARTED" },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with just a subject
      const handler = mockServer.getHandler("hubspot_create_task");
      await handler({ subject: "Quick follow-up" });

      // Then: the client receives hs_task_status as NOT_STARTED
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ hs_task_status: "NOT_STARTED" }),
      );
    });

    it("should return an error given an API authorization failure", async () => {
      // Given: the access token lacks write permissions
      mockClient.createTask.mockRejectedValue(new Error("Insufficient scopes"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_create_task");
      const result = await handler({ subject: "Failing task" });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Insufficient scopes");
    });
  });

  // ── hubspot_log_email ───────────────────────────────────────

  describe("hubspot_log_email", () => {
    it("should log an incoming email given a subject", async () => {
      // Given: HubSpot will accept the email log
      mockClient.logEmail.mockResolvedValue({
        id: "1301",
        properties: {
          hs_email_subject: "Request for demo",
          hs_email_direction: "INCOMING_EMAIL",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with a subject (no direction → defaults to INCOMING_EMAIL)
      const handler = mockServer.getHandler("hubspot_log_email");
      const result = await handler({ subject: "Request for demo" });

      // Then: the email is logged with INCOMING_EMAIL direction
      expect(mockClient.logEmail).toHaveBeenCalledWith(
        expect.objectContaining({ hs_email_direction: "INCOMING_EMAIL" }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1301");
    });

    it("should log a forwarded email given direction FORWARDED_EMAIL", async () => {
      // Given: this is a forwarded internal email
      mockClient.logEmail.mockResolvedValue({
        id: "1302",
        properties: {
          hs_email_subject: "FWD: Legal review",
          hs_email_direction: "FORWARDED_EMAIL",
        },
        createdAt: "2026-03-29T10:00:00Z",
        updatedAt: "2026-03-29T10:00:00Z",
      });

      // When: the tool is invoked with direction FORWARDED_EMAIL
      const handler = mockServer.getHandler("hubspot_log_email");
      const result = await handler({
        subject: "FWD: Legal review",
        direction: "FORWARDED_EMAIL",
      });

      // Then: the direction is preserved in the client call
      expect(mockClient.logEmail).toHaveBeenCalledWith(
        expect.objectContaining({ hs_email_direction: "FORWARDED_EMAIL" }),
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("1302");
    });

    it("should return an error given an API rate limit exceeded response", async () => {
      // Given: the API is throttling requests
      mockClient.logEmail.mockRejectedValue(new Error("Too many requests"));

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_log_email");
      const result = await handler({ subject: "Throttled email" });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Too many requests");
    });
  });

  // ── hubspot_list_activities ─────────────────────────────────

  describe("hubspot_list_activities", () => {
    it("should return activities given a valid contact ID", async () => {
      // Given: the contact has two engagements
      mockClient.listActivities.mockResolvedValue({
        results: [
          { id: "eng_1", type: "NOTE" },
          { id: "eng_2", type: "EMAIL" },
        ],
        paging: { next: { after: "nextCursor" } },
      });

      // When: the tool is invoked for a contact
      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "contacts",
        object_id: "101",
        limit: 10,
      });

      // Then: both engagements are returned
      expect(mockClient.listActivities).toHaveBeenCalledWith("contacts", "101", 10);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results).toHaveLength(2);
    });

    it("should return activities given a valid deal ID", async () => {
      // Given: the deal has one task engagement
      mockClient.listActivities.mockResolvedValue({
        results: [{ id: "eng_3", type: "TASK" }],
        paging: null,
      });

      // When: the tool is invoked for a deal
      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "deals",
        object_id: "801",
        limit: 5,
      });

      // Then: the task engagement is returned
      expect(mockClient.listActivities).toHaveBeenCalledWith("deals", "801", 5);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results[0].type).toBe("TASK");
    });

    it("should return empty results given a record with no activities", async () => {
      // Given: the record has no engagements
      mockClient.listActivities.mockResolvedValue({ results: [], paging: null });

      // When: the tool is invoked
      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "companies",
        object_id: "501",
        limit: 10,
      });

      // Then: results are empty
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.results).toHaveLength(0);
    });

    it("should return an error given a non-existent object ID", async () => {
      // Given: the object does not exist
      mockClient.listActivities.mockRejectedValue(new Error("Object 999 not found"));

      // When: the tool is invoked with the bad ID
      const handler = mockServer.getHandler("hubspot_list_activities");
      const result = await handler({
        object_type: "contacts",
        object_id: "999",
        limit: 10,
      });

      // Then: the error is surfaced
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("999");
    });
  });
});
