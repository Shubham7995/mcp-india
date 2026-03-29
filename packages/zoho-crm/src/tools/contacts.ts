/**
 * Zoho CRM contact tools.
 * Tools: zoho_search_contacts, zoho_create_contact,
 *        zoho_update_contact, zoho_get_contact
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZohoCrmClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

export function registerContactTools(
  server: McpServer,
  client: ZohoCrmClient,
): void {
  // ── Search Contacts ────────────────────────────────────────
  server.tool(
    "zoho_search_contacts",
    "Search Zoho CRM contacts by email, phone, or keyword",
    {
      query: z.string().describe("Search value (email address, phone number, or keyword)"),
      search_by: z
        .enum(["email", "phone", "word"])
        .describe("Search type: 'email', 'phone', or 'word' (keyword)"),
      page: z.number().optional().describe("Page number (1-indexed)"),
      per_page: z.number().optional().describe("Results per page (max 200)"),
    },
    async ({ query, search_by, page, per_page }) => {
      try {
        const params: Record<string, unknown> = { page, per_page };
        params[search_by] = query;

        const contacts = await client.searchContacts(
          params as Parameters<typeof client.searchContacts>[0],
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(contacts, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Contact ─────────────────────────────────────────
  server.tool(
    "zoho_create_contact",
    "Create a new contact in Zoho CRM",
    {
      last_name: z.string().describe("Contact's last name (required)"),
      first_name: z.string().optional().describe("Contact's first name"),
      email: z.string().optional().describe("Contact's email address"),
      phone: z.string().optional().describe("Contact's phone number"),
    },
    async ({ last_name, first_name, email, phone }) => {
      try {
        const fields: Record<string, string> = { Last_Name: last_name };
        if (first_name) fields.First_Name = first_name;
        if (email) fields.Email = email;
        if (phone) fields.Phone = phone;

        const result = await client.createContact(fields);
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

  // ── Update Contact ─────────────────────────────────────────
  server.tool(
    "zoho_update_contact",
    "Update fields on an existing Zoho CRM contact",
    {
      contact_id: z.string().describe("Zoho CRM contact ID"),
      fields: z
        .record(z.unknown())
        .describe("Fields to update (e.g. { Email: 'new@example.com', Phone: '+91...' })"),
    },
    async ({ contact_id, fields }) => {
      try {
        const result = await client.updateContact(contact_id, fields);
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

  // ── Get Contact ────────────────────────────────────────────
  server.tool(
    "zoho_get_contact",
    "Get a Zoho CRM contact by ID",
    {
      contact_id: z.string().describe("Zoho CRM contact ID"),
    },
    async ({ contact_id }) => {
      try {
        const contact = await client.getContact(contact_id);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(contact, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
