/**
 * Zoho CRM activity tools.
 * Tools: zoho_create_task, zoho_list_tasks,
 *        zoho_log_call, zoho_create_note
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZohoCrmClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerActivityTools(
  server: McpServer,
  client: ZohoCrmClient,
): void {
  // ── Create Task ────────────────────────────────────────────
  server.tool(
    "zoho_create_task",
    "Create a follow-up task in Zoho CRM, optionally linked to a contact or deal",
    {
      subject: z.string().describe("Task subject (required)"),
      due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
      contact_id: z.string().optional().describe("Link to a contact by ID"),
      deal_id: z.string().optional().describe("Link to a deal by ID"),
      priority: z
        .enum(["Highest", "High", "Normal", "Low", "Lowest"])
        .optional()
        .describe("Task priority"),
      description: z.string().optional().describe("Task description"),
    },
    async ({ subject, due_date, contact_id, deal_id, priority, description }) => {
      try {
        const fields: Record<string, unknown> = { Subject: subject };
        if (due_date) fields.Due_Date = due_date;
        if (contact_id) fields.Who_Id = contact_id;
        if (deal_id) fields.What_Id = deal_id;
        if (priority) fields.Priority = priority;
        if (description) fields.Description = description;

        const result = await client.createTask(fields);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Tasks ─────────────────────────────────────────────
  server.tool(
    "zoho_list_tasks",
    "List tasks in Zoho CRM with optional sorting and pagination",
    {
      sort_by: z.string().optional().describe("Field to sort by (e.g. 'Due_Date', 'Created_Time')"),
      sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
      page: z.number().optional().describe("Page number (1-indexed)"),
      per_page: z.number().optional().describe("Results per page (max 200)"),
    },
    async ({ sort_by, sort_order, page, per_page }) => {
      try {
        const tasks = await client.listTasks({ sort_by, sort_order, page, per_page });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(tasks, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Log Call ───────────────────────────────────────────────
  server.tool(
    "zoho_log_call",
    "Log a call activity in Zoho CRM",
    {
      subject: z.string().describe("Call subject (required)"),
      duration_minutes: z.number().optional().describe("Call duration in minutes"),
      contact_id: z.string().optional().describe("Associated contact ID"),
      deal_id: z.string().optional().describe("Associated deal ID"),
      description: z.string().optional().describe("Call notes/description"),
    },
    async ({ subject, duration_minutes, contact_id, deal_id, description }) => {
      try {
        const fields: Record<string, unknown> = { Subject: subject };
        if (duration_minutes !== undefined) fields.Call_Duration = `${duration_minutes}`;
        if (contact_id) fields.Who_Id = contact_id;
        if (deal_id) fields.What_Id = deal_id;
        if (description) fields.Description = description;

        const result = await client.logCall(fields);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Note ────────────────────────────────────────────
  server.tool(
    "zoho_create_note",
    "Add a note to a contact, deal, or other Zoho CRM record",
    {
      note_content: z.string().describe("Note body text (required)"),
      title: z.string().optional().describe("Note title"),
      parent_id: z.string().describe("ID of the parent record (contact, deal, etc.)"),
      module: z
        .enum(["Contacts", "Deals", "Leads", "Accounts"])
        .describe("Module the parent record belongs to"),
    },
    async ({ note_content, title, parent_id, module }) => {
      try {
        const fields: Record<string, unknown> = {
          Note_Content: note_content,
          Parent_Id: parent_id,
          $se_module: module,
        };
        if (title) fields.Note_Title = title;

        const result = await client.createNote(fields);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
