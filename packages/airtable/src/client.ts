/**
 * Airtable API client wrapper.
 * All external API calls go through this module — tools never call fetch directly.
 * Uses native fetch with PAT auth and rate limiting.
 */

import {
  RateLimiter,
  ApiAuthError,
  ApiRateLimitError,
  ApiNotFoundError,
  ApiValidationError,
} from "@mcp-india/shared";
import type {
  AirtableListResponse,
  AirtableMutationResponse,
  AirtableBulkResponse,
  AirtableBasesResponse,
  AirtableTablesResponse,
  AirtableTable,
} from "./types.js";

export interface AirtableClientConfig {
  accessToken: string;
  baseId: string;
}

export class AirtableClient {
  private readonly accessToken: string;
  private readonly baseId: string;
  private readonly rateLimiter: RateLimiter;

  constructor(config: AirtableClientConfig) {
    this.accessToken = config.accessToken;
    this.baseId = config.baseId;
    this.rateLimiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000,
    });
  }

  // ── HTTP Request Helper ────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    options?: { body?: unknown },
  ): Promise<T> {
    await this.rateLimiter.acquire();

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      throw new ApiAuthError("Airtable");
    }
    if (response.status === 404) {
      throw new ApiNotFoundError("Airtable record", url);
    }
    if (response.status === 429) {
      throw new ApiRateLimitError("Airtable");
    }
    if (response.status === 422) {
      const text = await response.text();
      throw new ApiValidationError(`Airtable: ${text}`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable API error (${response.status}): ${text}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  private recordUrl(table: string, baseId?: string): string {
    const base = baseId ?? this.baseId;
    return `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`;
  }

  private metaUrl(path: string): string {
    return `https://api.airtable.com/v0/meta${path}`;
  }

  // ── Records ────────────────────────────────────────────────

  async listRecords(params: {
    table: string;
    baseId?: string;
    view?: string;
    sort?: Array<{ field: string; direction: "asc" | "desc" }>;
    filterByFormula?: string;
    maxRecords?: number;
    offset?: string;
  }): Promise<AirtableListResponse> {
    const url = new URL(this.recordUrl(params.table, params.baseId));
    if (params.view) url.searchParams.set("view", params.view);
    if (params.filterByFormula) url.searchParams.set("filterByFormula", params.filterByFormula);
    if (params.maxRecords) url.searchParams.set("maxRecords", String(params.maxRecords));
    if (params.offset) url.searchParams.set("offset", params.offset);
    if (params.sort) {
      params.sort.forEach((s, i) => {
        url.searchParams.set(`sort[${i}][field]`, s.field);
        url.searchParams.set(`sort[${i}][direction]`, s.direction);
      });
    }

    return this.request<AirtableListResponse>("GET", url.toString());
  }

  async getRecord(params: {
    table: string;
    recordId: string;
    baseId?: string;
  }): Promise<AirtableMutationResponse> {
    const url = `${this.recordUrl(params.table, params.baseId)}/${params.recordId}`;
    return this.request<AirtableMutationResponse>("GET", url);
  }

  async createRecord(params: {
    table: string;
    fields: Record<string, unknown>;
    baseId?: string;
  }): Promise<AirtableMutationResponse> {
    return this.request<AirtableMutationResponse>(
      "POST",
      this.recordUrl(params.table, params.baseId),
      { body: { fields: params.fields } },
    );
  }

  async updateRecord(params: {
    table: string;
    recordId: string;
    fields: Record<string, unknown>;
    baseId?: string;
  }): Promise<AirtableMutationResponse> {
    const url = `${this.recordUrl(params.table, params.baseId)}/${params.recordId}`;
    return this.request<AirtableMutationResponse>("PATCH", url, {
      body: { fields: params.fields },
    });
  }

  async deleteRecord(params: {
    table: string;
    recordId: string;
    baseId?: string;
  }): Promise<{ id: string; deleted: boolean }> {
    const url = `${this.recordUrl(params.table, params.baseId)}/${params.recordId}`;
    return this.request<{ id: string; deleted: boolean }>("DELETE", url);
  }

  // ── Schema ─────────────────────────────────────────────────

  async listBases(): Promise<AirtableBasesResponse> {
    return this.request<AirtableBasesResponse>("GET", this.metaUrl("/bases"));
  }

  async listTables(baseId?: string): Promise<AirtableTablesResponse> {
    const base = baseId ?? this.baseId;
    return this.request<AirtableTablesResponse>(
      "GET",
      this.metaUrl(`/bases/${base}/tables`),
    );
  }

  async getTableSchema(table: string, baseId?: string): Promise<AirtableTable | null> {
    const tables = await this.listTables(baseId);
    return tables.tables.find((t) => t.name === table || t.id === table) ?? null;
  }

  // ── Bulk Operations ────────────────────────────────────────

  async bulkCreate(params: {
    table: string;
    records: Array<{ fields: Record<string, unknown> }>;
    baseId?: string;
  }): Promise<AirtableBulkResponse> {
    if (params.records.length > 10) {
      throw new ApiValidationError(
        "Airtable bulk operations are limited to 10 records per call",
      );
    }
    return this.request<AirtableBulkResponse>(
      "POST",
      this.recordUrl(params.table, params.baseId),
      { body: { records: params.records } },
    );
  }

  async bulkUpdate(params: {
    table: string;
    records: Array<{ id: string; fields: Record<string, unknown> }>;
    baseId?: string;
  }): Promise<AirtableBulkResponse> {
    if (params.records.length > 10) {
      throw new ApiValidationError(
        "Airtable bulk operations are limited to 10 records per call",
      );
    }
    return this.request<AirtableBulkResponse>(
      "PATCH",
      this.recordUrl(params.table, params.baseId),
      { body: { records: params.records } },
    );
  }
}

/** Create an AirtableClient from environment variables. */
export function createClientFromEnv(): AirtableClient {
  const accessToken = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!accessToken) {
    throw new Error(
      "Missing AIRTABLE_ACCESS_TOKEN environment variable. " +
        "Set it in your MCP server configuration. " +
        "Create a PAT at https://airtable.com/create/tokens",
    );
  }
  if (!baseId) {
    throw new Error(
      "Missing AIRTABLE_BASE_ID environment variable. " +
        "Find your base ID in the Airtable URL (starts with 'app').",
    );
  }

  return new AirtableClient({ accessToken, baseId });
}
