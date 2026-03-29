/**
 * HubSpot company tools.
 * Tools: hubspot_search_companies, hubspot_get_company,
 *        hubspot_create_company, hubspot_update_company
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HubSpotClient } from "../client.js";
import { formatToolError } from "@mcp-india/shared";

const DEFAULT_COMPANY_PROPS = ["name", "domain", "industry", "city", "phone"];

export function registerCompanyTools(
  server: McpServer,
  client: HubSpotClient,
): void {
  // ── Search Companies ───────────────────────────────────────
  server.tool(
    "hubspot_search_companies",
    "Search HubSpot companies by name or domain",
    {
      query: z
        .string()
        .describe("Search query (e.g. 'Acme' or 'acme.com')"),
      properties: z
        .array(z.string())
        .optional()
        .describe("Properties to return (default: name, domain, industry, city, phone)"),
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
        const results = await client.searchCompanies(
          query,
          properties ?? DEFAULT_COMPANY_PROPS,
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

  // ── Get Company ────────────────────────────────────────────
  server.tool(
    "hubspot_get_company",
    "Get a specific HubSpot company by ID with selected properties",
    {
      company_id: z
        .string()
        .describe("HubSpot company ID"),
      properties: z
        .array(z.string())
        .optional()
        .describe("Properties to return (default: name, domain, industry, city, phone)"),
    },
    async ({ company_id, properties }) => {
      try {
        const company = await client.getCompany(
          company_id,
          properties ?? DEFAULT_COMPANY_PROPS,
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(company, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Create Company ─────────────────────────────────────────
  server.tool(
    "hubspot_create_company",
    "Create a new HubSpot company. At minimum provide a name.",
    {
      name: z
        .string()
        .describe("Company name"),
      domain: z
        .string()
        .optional()
        .describe("Company website domain (e.g. acme.com)"),
      industry: z
        .string()
        .optional()
        .describe("Industry"),
      city: z
        .string()
        .optional()
        .describe("City"),
      phone: z
        .string()
        .optional()
        .describe("Phone number"),
    },
    async ({ name, domain, industry, city, phone }) => {
      try {
        const properties: Record<string, string> = { name };
        if (domain) properties.domain = domain;
        if (industry) properties.industry = industry;
        if (city) properties.city = city;
        if (phone) properties.phone = phone;

        const company = await client.createCompany(properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(company, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ── Update Company ─────────────────────────────────────────
  server.tool(
    "hubspot_update_company",
    "Update properties on an existing HubSpot company",
    {
      company_id: z
        .string()
        .describe("HubSpot company ID to update"),
      properties: z
        .record(z.string())
        .describe("Properties to update (e.g. { domain: 'new.com', industry: 'Tech' })"),
    },
    async ({ company_id, properties }) => {
      try {
        const company = await client.updateCompany(company_id, properties);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(company, null, 2) },
          ],
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
