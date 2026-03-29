/**
 * Type definitions for Airtable API responses.
 */

// ── Record types ─────────────────────────────────────────────

export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableMutationResponse {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export interface AirtableBulkResponse {
  records: AirtableRecord[];
}

// ── Schema types ─────────────────────────────────────────────

export interface AirtableFieldOption {
  id: string;
  name: string;
  color?: string;
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: AirtableFieldOption[];
    [key: string]: unknown;
  };
}

export interface AirtableTable {
  id: string;
  name: string;
  description?: string;
  fields: AirtableField[];
  primaryFieldId: string;
}

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableBasesResponse {
  bases: AirtableBase[];
  offset?: string;
}

export interface AirtableTablesResponse {
  tables: AirtableTable[];
}

// ── Aggregation types (computed) ─────────────────────────────

export interface TableSummary {
  table_name: string;
  total_records: number;
  fields: Array<{ name: string; type: string }>;
  sample_records: AirtableRecord[];
}
