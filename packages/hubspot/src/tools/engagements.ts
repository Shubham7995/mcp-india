/**
 * HubSpot engagement tools.
 * Tools: hubspot_create_note, hubspot_create_task,
 *        hubspot_log_email, hubspot_list_activities
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HubSpotClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerEngagementTools(
  server: McpServer,
  client: HubSpotClient,
): void {
  // ── Create Note ────────────────────────────────────────────
  server.tool(
    "hubspot_create_note",
    "Create a note on a HubSpot contact, company, or deal",
    {
      body: z
        .string()
        .describe("Note body/content"),
      timestamp: z
        .string()
        .optional()
        .describe("Timestamp (ISO string). Defaults to now if omitted."),
    },
    async ({ body, timestamp }) => {
      try {
        const properties: Record<string, string> = {
          hs_note_body: body,
        };
        if (timestamp) properties.hs_timestamp = timestamp;

        const note = await client.createNote(properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(note, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Task ────────────────────────────────────────────
  server.tool(
    "hubspot_create_task",
    "Create a follow-up task in HubSpot with a subject and optional due date",
    {
      subject: z
        .string()
        .describe("Task subject/title"),
      body: z
        .string()
        .optional()
        .describe("Task body/description"),
      due_date: z
        .string()
        .optional()
        .describe("Due date (ISO string, e.g. 2026-04-15)"),
      priority: z
        .enum(["LOW", "MEDIUM", "HIGH"])
        .optional()
        .describe("Task priority"),
    },
    async ({ subject, body, due_date, priority }) => {
      try {
        const properties: Record<string, string> = {
          hs_task_subject: subject,
          hs_task_status: "NOT_STARTED",
        };
        if (body) properties.hs_task_body = body;
        if (due_date) properties.hs_timestamp = due_date;
        if (priority) properties.hs_task_priority = priority;

        const task = await client.createTask(properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(task, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Log Email ──────────────────────────────────────────────
  server.tool(
    "hubspot_log_email",
    "Log an email activity in HubSpot on a contact, company, or deal",
    {
      subject: z
        .string()
        .describe("Email subject line"),
      body: z
        .string()
        .optional()
        .describe("Email body content"),
      direction: z
        .enum(["INCOMING_EMAIL", "FORWARDED_EMAIL"])
        .optional()
        .describe("Email direction (default: INCOMING_EMAIL)"),
      timestamp: z
        .string()
        .optional()
        .describe("Timestamp (ISO string). Defaults to now."),
    },
    async ({ subject, body, direction, timestamp }) => {
      try {
        const properties: Record<string, string> = {
          hs_email_subject: subject,
          hs_email_direction: direction ?? "INCOMING_EMAIL",
        };
        if (body) properties.hs_email_text = body;
        if (timestamp) properties.hs_timestamp = timestamp;

        const email = await client.logEmail(properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(email, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── List Activities ────────────────────────────────────────
  server.tool(
    "hubspot_list_activities",
    "List recent engagements (notes, tasks, emails) for a HubSpot record",
    {
      object_type: z
        .enum(["contacts", "companies", "deals"])
        .describe("HubSpot object type"),
      object_id: z
        .string()
        .describe("HubSpot object ID"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
    },
    async ({ object_type, object_id, limit }) => {
      try {
        const activities = await client.listActivities(
          object_type,
          object_id,
          limit,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(activities, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
