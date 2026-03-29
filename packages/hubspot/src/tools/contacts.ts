/**
 * HubSpot contact tools.
 * Tools: hubspot_search_contacts, hubspot_get_contact,
 *        hubspot_create_contact, hubspot_update_contact
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HubSpotClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

const DEFAULT_CONTACT_PROPS = ["email", "firstname", "lastname", "phone", "company"];

export function registerContactTools(
  server: McpServer,
  client: HubSpotClient,
): void {
  // ── Search Contacts ────────────────────────────────────────
  server.tool(
    "hubspot_search_contacts",
    "Search HubSpot contacts by name, email, or phone. Returns matching contacts with their properties.",
    {
      query: z
        .string()
        .describe("Search query (e.g. 'alice@example.com' or 'Alice Smith')"),
      properties: z
        .array(z.string())
        .optional()
        .describe("Properties to return (default: email, firstname, lastname, phone, company)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of results (max 100)"),
      after: z
        .string()
        .optional()
        .describe("Cursor for pagination"),
    },
    async ({ query, properties, limit, after }) => {
      try {
        const results = await client.searchContacts(
          query,
          properties ?? DEFAULT_CONTACT_PROPS,
          limit,
          after,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(results, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Get Contact ────────────────────────────────────────────
  server.tool(
    "hubspot_get_contact",
    "Get a specific HubSpot contact by ID with selected properties",
    {
      contact_id: z
        .string()
        .describe("HubSpot contact ID"),
      properties: z
        .array(z.string())
        .optional()
        .describe("Properties to return (default: email, firstname, lastname, phone, company)"),
    },
    async ({ contact_id, properties }) => {
      try {
        const contact = await client.getContact(
          contact_id,
          properties ?? DEFAULT_CONTACT_PROPS,
        );
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

  // ── Create Contact ─────────────────────────────────────────
  server.tool(
    "hubspot_create_contact",
    "Create a new HubSpot contact. At minimum provide an email address.",
    {
      email: z
        .string()
        .optional()
        .describe("Contact email address"),
      firstname: z
        .string()
        .optional()
        .describe("First name"),
      lastname: z
        .string()
        .optional()
        .describe("Last name"),
      phone: z
        .string()
        .optional()
        .describe("Phone number"),
      company: z
        .string()
        .optional()
        .describe("Company name"),
    },
    async ({ email, firstname, lastname, phone, company }) => {
      try {
        const properties: Record<string, string> = {};
        if (email) properties.email = email;
        if (firstname) properties.firstname = firstname;
        if (lastname) properties.lastname = lastname;
        if (phone) properties.phone = phone;
        if (company) properties.company = company;

        const contact = await client.createContact(properties);
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

  // ── Update Contact ─────────────────────────────────────────
  server.tool(
    "hubspot_update_contact",
    "Update properties on an existing HubSpot contact",
    {
      contact_id: z
        .string()
        .describe("HubSpot contact ID to update"),
      properties: z
        .record(z.string())
        .describe("Properties to update (e.g. { email: 'new@example.com', phone: '+1234' })"),
    },
    async ({ contact_id, properties }) => {
      try {
        const contact = await client.updateContact(contact_id, properties);
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
