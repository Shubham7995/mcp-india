/**
 * Type definitions for Zoho CRM API v2 responses.
 */

// ── API response envelopes ──────────────────────────────────

export interface ZohoListResponse<T> {
  data: T[];
  info?: {
    count: number;
    more_records: boolean;
    page: number;
    per_page: number;
  };
}

export interface ZohoMutationResult {
  code: string;
  details: { id: string; [key: string]: unknown };
  message: string;
  status: string;
}

export interface ZohoMutationResponse {
  data: ZohoMutationResult[];
}

// ── Module records ──────────────────────────────────────────

export interface ZohoContact {
  id: string;
  First_Name: string | null;
  Last_Name: string;
  Email: string | null;
  Phone: string | null;
  Account_Name: { name: string; id: string } | null;
  Owner: { name: string; id: string } | null;
  Created_Time: string;
  Modified_Time: string;
}

export interface ZohoDeal {
  id: string;
  Deal_Name: string;
  Stage: string;
  Amount: number | null;
  Closing_Date: string | null;
  Account_Name: { name: string; id: string } | null;
  Contact_Name: { name: string; id: string } | null;
  Pipeline: string | null;
  Probability: number | null;
  Owner: { name: string; id: string } | null;
  Created_Time: string;
  Modified_Time: string;
}

export interface ZohoTask {
  id: string;
  Subject: string;
  Status: string;
  Due_Date: string | null;
  What_Id: { name: string; id: string } | null;
  Who_Id: { name: string; id: string } | null;
  Description: string | null;
  Priority: string | null;
  Owner: { name: string; id: string } | null;
  Created_Time: string;
}

export interface ZohoCall {
  id: string;
  Subject: string;
  Call_Duration: string | null;
  Call_Type: string | null;
  Who_Id: { name: string; id: string } | null;
  What_Id: { name: string; id: string } | null;
  Description: string | null;
  Created_Time: string;
}

export interface ZohoNote {
  id: string;
  Note_Title: string | null;
  Note_Content: string;
  Parent_Id: { name: string; id: string };
  $se_module: string;
  Created_Time: string;
}

// ── Aggregation types (computed, not from API) ──────────────

export interface PipelineStageSummary {
  stage: string;
  deal_count: number;
  total_value: number;
  avg_probability: number;
  weighted_value: number;
}

export interface SalesPipelineSummary {
  pipeline: string | null;
  stages: PipelineStageSummary[];
  total_deals: number;
  total_pipeline_value: number;
  weighted_value: number;
}

export interface RevenueForecastItem {
  stage: string;
  deal_count: number;
  total_value: number;
  probability: number;
  weighted_value: number;
}

export interface RevenueForecast {
  closing_before: string;
  total_deals: number;
  total_pipeline_value: number;
  weighted_forecast: number;
  by_stage: RevenueForecastItem[];
}
