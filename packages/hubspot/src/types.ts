/**
 * Type definitions for HubSpot CRM API v3 responses.
 */

// ── API response envelopes ──────────────────────────────────

export interface HubSpotObject<P = Record<string, string>> {
  id: string;
  properties: P;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface HubSpotSearchResponse<P = Record<string, string>> {
  total: number;
  results: HubSpotObject<P>[];
  paging?: {
    next?: { after: string };
  };
}

export interface HubSpotListResponse<P = Record<string, string>> {
  results: HubSpotObject<P>[];
  paging?: {
    next?: { after: string };
  };
}

export interface HubSpotBatchReadResponse<P = Record<string, string>> {
  status: string;
  results: HubSpotObject<P>[];
}

export interface HubSpotMutationResponse<P = Record<string, string>> {
  id: string;
  properties: P;
  createdAt: string;
  updatedAt: string;
}

// ── Engagement types ────────────────────────────────────────

export interface HubSpotEngagement {
  id: string;
  properties: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// ── Aggregation types (computed, not from API) ──────────────

export interface PipelineStageSummary {
  stage_id: string;
  stage_label: string;
  deal_count: number;
  total_value: number;
  weighted_value: number;
}

export interface HubSpotPipelineSummary {
  pipeline_id: string;
  pipeline_label: string;
  stages: PipelineStageSummary[];
  total_deals: number;
  total_pipeline_value: number;
  weighted_value: number;
}

export interface DealForecastItem {
  stage_label: string;
  deal_count: number;
  total_value: number;
  probability: number;
  weighted_value: number;
}

export interface DealForecast {
  pipeline_id: string;
  total_deals: number;
  total_pipeline_value: number;
  weighted_forecast: number;
  by_stage: DealForecastItem[];
}

// ── Pipeline definitions (from HubSpot settings API) ────────

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: {
    probability?: string;
    [key: string]: unknown;
  };
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  stages: HubSpotPipelineStage[];
}
