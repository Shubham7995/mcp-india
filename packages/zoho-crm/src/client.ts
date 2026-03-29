/**
 * Zoho CRM API v2 client wrapper.
 * All external API calls go through this module — tools never call fetch directly.
 * Handles OAuth2 token refresh, rate limiting, and error mapping.
 */

import {
  RateLimiter,
  ApiAuthError,
  ApiRateLimitError,
  ApiNotFoundError,
  ApiValidationError,
} from "@mcp-india/shared";
import type {
  ZohoListResponse,
  ZohoMutationResponse,
  ZohoContact,
  ZohoDeal,
  ZohoTask,
  ZohoCall,
  ZohoNote,
} from "./types.js";

export interface ZohoCrmClientConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  apiDomain: string;
  accountsDomain: string;
}

export class ZohoCrmClient {
  private readonly config: ZohoCrmClientConfig;
  private readonly rateLimiter: RateLimiter;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private tokenRefreshPromise: Promise<void> | null = null;

  constructor(config: ZohoCrmClientConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000,
    });
  }

  // ── OAuth2 Token Management ────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    if (this.tokenRefreshPromise) {
      await this.tokenRefreshPromise;
      return this.accessToken!;
    }

    this.tokenRefreshPromise = this.refreshAccessToken();
    try {
      await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }

    return this.accessToken!;
  }

  private async refreshAccessToken(): Promise<void> {
    const url = `https://${this.config.accountsDomain}/oauth/v2/token`;
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (response.status === 401) {
      throw new ApiAuthError("Zoho CRM");
    }
    if (response.status === 429) {
      throw new ApiRateLimitError("Zoho CRM");
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Zoho token refresh failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = json.access_token;
    this.tokenExpiresAt = Date.now() + json.expires_in * 1000;
  }

  // ── HTTP Request Helper ────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options?: { query?: Record<string, string>; body?: unknown },
  ): Promise<T> {
    await this.rateLimiter.acquire();
    const token = await this.getAccessToken();

    const url = new URL(`https://${this.config.apiDomain}/crm/v2/${path}`);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      throw new ApiAuthError("Zoho CRM");
    }
    if (response.status === 404) {
      throw new ApiNotFoundError("Zoho CRM record", path);
    }
    if (response.status === 429) {
      throw new ApiRateLimitError("Zoho CRM");
    }
    if (response.status === 400) {
      const text = await response.text();
      throw new ApiValidationError(`Zoho CRM: ${text}`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Zoho CRM API error (${response.status}): ${text}`);
    }

    // Zoho returns 204 No Content for some operations
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  // ── Contacts ───────────────────────────────────────────────

  async searchContacts(params: {
    criteria?: string;
    email?: string;
    phone?: string;
    word?: string;
    page?: number;
    per_page?: number;
  }): Promise<ZohoListResponse<ZohoContact>> {
    const query: Record<string, string> = {};
    if (params.criteria) query.criteria = params.criteria;
    if (params.email) query.email = params.email;
    if (params.phone) query.phone = params.phone;
    if (params.word) query.word = params.word;
    if (params.page) query.page = String(params.page);
    if (params.per_page) query.per_page = String(Math.min(params.per_page, 200));

    return this.request<ZohoListResponse<ZohoContact>>("GET", "Contacts/search", { query });
  }

  async getContact(contactId: string): Promise<ZohoContact> {
    const response = await this.request<{ data: ZohoContact[] }>("GET", `Contacts/${contactId}`);
    return response.data[0];
  }

  async createContact(fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("POST", "Contacts", {
      body: { data: [fields] },
    });
  }

  async updateContact(contactId: string, fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("PUT", `Contacts/${contactId}`, {
      body: { data: [fields] },
    });
  }

  // ── Deals ──────────────────────────────────────────────────

  async listDeals(params: {
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
    fields?: string;
  }): Promise<ZohoListResponse<ZohoDeal>> {
    const query: Record<string, string> = {};
    if (params.sort_by) query.sort_by = params.sort_by;
    if (params.sort_order) query.sort_order = params.sort_order;
    if (params.page) query.page = String(params.page);
    if (params.per_page) query.per_page = String(Math.min(params.per_page, 200));
    if (params.fields) query.fields = params.fields;

    return this.request<ZohoListResponse<ZohoDeal>>("GET", "Deals", { query });
  }

  async getDeal(dealId: string): Promise<ZohoDeal> {
    const response = await this.request<{ data: ZohoDeal[] }>("GET", `Deals/${dealId}`);
    return response.data[0];
  }

  async createDeal(fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("POST", "Deals", {
      body: { data: [fields] },
    });
  }

  async updateDeal(dealId: string, fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("PUT", `Deals/${dealId}`, {
      body: { data: [fields] },
    });
  }

  // ── Tasks ──────────────────────────────────────────────────

  async listTasks(params: {
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
  }): Promise<ZohoListResponse<ZohoTask>> {
    const query: Record<string, string> = {};
    if (params.sort_by) query.sort_by = params.sort_by;
    if (params.sort_order) query.sort_order = params.sort_order;
    if (params.page) query.page = String(params.page);
    if (params.per_page) query.per_page = String(Math.min(params.per_page, 200));

    return this.request<ZohoListResponse<ZohoTask>>("GET", "Tasks", { query });
  }

  async createTask(fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("POST", "Tasks", {
      body: { data: [fields] },
    });
  }

  // ── Calls ──────────────────────────────────────────────────

  async logCall(fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("POST", "Calls", {
      body: { data: [fields] },
    });
  }

  // ── Notes ──────────────────────────────────────────────────

  async createNote(fields: Record<string, unknown>): Promise<ZohoMutationResponse> {
    return this.request<ZohoMutationResponse>("POST", "Notes", {
      body: { data: [fields] },
    });
  }

  // ── Reports (multi-page fetch for aggregation) ─────────────

  async getAllDeals(params?: {
    fields?: string;
    maxPages?: number;
  }): Promise<ZohoDeal[]> {
    const allDeals: ZohoDeal[] = [];
    const maxPages = params?.maxPages ?? 5;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const query: Record<string, string> = {
        page: String(page),
        per_page: "200",
      };
      if (params?.fields) query.fields = params.fields;

      const response = await this.request<ZohoListResponse<ZohoDeal>>("GET", "Deals", { query });
      if (response.data) {
        allDeals.push(...response.data);
      }
      hasMore = response.info?.more_records ?? false;
      page++;
    }

    return allDeals;
  }
}

/** Create a ZohoCrmClient from environment variables. */
export function createClientFromEnv(): ZohoCrmClient {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and/or ZOHO_REFRESH_TOKEN environment variables. " +
        "Set them in your MCP server configuration.",
    );
  }

  return new ZohoCrmClient({
    clientId,
    clientSecret,
    refreshToken,
    apiDomain: process.env.ZOHO_API_DOMAIN ?? "zohoapis.com",
    accountsDomain: process.env.ZOHO_ACCOUNTS_DOMAIN ?? "accounts.zoho.com",
  });
}
