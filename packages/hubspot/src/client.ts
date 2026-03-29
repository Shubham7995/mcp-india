/**
 * HubSpot CRM API v3 client wrapper.
 * All external API calls go through this module — tools never call fetch directly.
 * Uses native fetch with Bearer token auth and rate limiting.
 */

import {
  RateLimiter,
  ApiAuthError,
  ApiRateLimitError,
  ApiNotFoundError,
  ApiValidationError,
} from "@mcp-india/shared";
import type {
  HubSpotSearchResponse,
  HubSpotListResponse,
  HubSpotMutationResponse,
  HubSpotPipeline,
} from "./types.js";

export interface HubSpotClientConfig {
  accessToken: string;
}

export class HubSpotClient {
  private readonly accessToken: string;
  private readonly rateLimiter: RateLimiter;

  constructor(config: HubSpotClientConfig) {
    this.accessToken = config.accessToken;
    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000,
    });
  }

  // ── HTTP Request Helper ────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options?: { query?: Record<string, string>; body?: unknown },
  ): Promise<T> {
    await this.rateLimiter.acquire();

    const url = new URL(`https://api.hubapi.com${path}`);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      throw new ApiAuthError("HubSpot");
    }
    if (response.status === 404) {
      throw new ApiNotFoundError("HubSpot record", path);
    }
    if (response.status === 429) {
      throw new ApiRateLimitError("HubSpot");
    }
    if (response.status === 400) {
      const text = await response.text();
      throw new ApiValidationError(`HubSpot: ${text}`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HubSpot API error (${response.status}): ${text}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  // ── Contacts ───────────────────────────────────────────────

  async searchContacts(
    query: string,
    properties: string[],
    limit?: number,
    after?: string,
  ): Promise<HubSpotSearchResponse> {
    return this.request<HubSpotSearchResponse>("POST", "/crm/v3/objects/contacts/search", {
      body: {
        query,
        properties,
        limit: limit ?? 10,
        ...(after ? { after } : {}),
      },
    });
  }

  async getContact(contactId: string, properties: string[]): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("GET", `/crm/v3/objects/contacts/${contactId}`, {
      query: { properties: properties.join(",") },
    });
  }

  async createContact(properties: Record<string, string>): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("POST", "/crm/v3/objects/contacts", {
      body: { properties },
    });
  }

  async updateContact(
    contactId: string,
    properties: Record<string, string>,
  ): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>(
      "PATCH",
      `/crm/v3/objects/contacts/${contactId}`,
      { body: { properties } },
    );
  }

  // ── Companies ──────────────────────────────────────────────

  async searchCompanies(
    query: string,
    properties: string[],
    limit?: number,
    after?: string,
  ): Promise<HubSpotSearchResponse> {
    return this.request<HubSpotSearchResponse>("POST", "/crm/v3/objects/companies/search", {
      body: {
        query,
        properties,
        limit: limit ?? 10,
        ...(after ? { after } : {}),
      },
    });
  }

  async getCompany(companyId: string, properties: string[]): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("GET", `/crm/v3/objects/companies/${companyId}`, {
      query: { properties: properties.join(",") },
    });
  }

  async createCompany(properties: Record<string, string>): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("POST", "/crm/v3/objects/companies", {
      body: { properties },
    });
  }

  async updateCompany(
    companyId: string,
    properties: Record<string, string>,
  ): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>(
      "PATCH",
      `/crm/v3/objects/companies/${companyId}`,
      { body: { properties } },
    );
  }

  // ── Deals ──────────────────────────────────────────────────

  async searchDeals(
    query: string,
    properties: string[],
    limit?: number,
    after?: string,
  ): Promise<HubSpotSearchResponse> {
    return this.request<HubSpotSearchResponse>("POST", "/crm/v3/objects/deals/search", {
      body: {
        query,
        properties,
        limit: limit ?? 10,
        ...(after ? { after } : {}),
      },
    });
  }

  async getDeal(dealId: string, properties: string[]): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("GET", `/crm/v3/objects/deals/${dealId}`, {
      query: { properties: properties.join(",") },
    });
  }

  async createDeal(properties: Record<string, string>): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("POST", "/crm/v3/objects/deals", {
      body: { properties },
    });
  }

  async updateDeal(
    dealId: string,
    properties: Record<string, string>,
  ): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>(
      "PATCH",
      `/crm/v3/objects/deals/${dealId}`,
      { body: { properties } },
    );
  }

  // ── Engagements ────────────────────────────────────────────

  async createNote(properties: Record<string, string>): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("POST", "/crm/v3/objects/notes", {
      body: { properties },
    });
  }

  async createTask(properties: Record<string, string>): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("POST", "/crm/v3/objects/tasks", {
      body: { properties },
    });
  }

  async logEmail(properties: Record<string, string>): Promise<HubSpotMutationResponse> {
    return this.request<HubSpotMutationResponse>("POST", "/crm/v3/objects/emails", {
      body: { properties },
    });
  }

  async listActivities(
    objectType: string,
    objectId: string,
    limit?: number,
  ): Promise<HubSpotListResponse> {
    return this.request<HubSpotListResponse>(
      "GET",
      `/crm/v3/objects/${objectType}/${objectId}/associations/engagements`,
      { query: { limit: String(limit ?? 10) } },
    );
  }

  // ── Pipelines (for reports) ────────────────────────────────

  async listPipelines(): Promise<{ results: HubSpotPipeline[] }> {
    return this.request<{ results: HubSpotPipeline[] }>(
      "GET",
      "/crm/v3/pipelines/deals",
    );
  }

  async listAllDeals(
    properties: string[],
    limit?: number,
    after?: string,
  ): Promise<HubSpotListResponse> {
    return this.request<HubSpotListResponse>("GET", "/crm/v3/objects/deals", {
      query: {
        properties: properties.join(","),
        limit: String(limit ?? 100),
        ...(after ? { after } : {}),
      },
    });
  }
}

/** Create a HubSpotClient from environment variables. */
export function createClientFromEnv(): HubSpotClient {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "Missing HUBSPOT_ACCESS_TOKEN environment variable. " +
        "Set it in your MCP server configuration. " +
        "Create a Private App at https://app.hubspot.com → Settings → Integrations → Private Apps",
    );
  }

  return new HubSpotClient({ accessToken });
}
