// ── GSTIN validation types ──

export interface GstinBreakdown {
  gstin: string;
  is_valid: boolean;
  state_code: string;
  state_name: string;
  pan: string;
  entity_number: string;
  check_digit: string;
  error?: string;
}

export interface StateInfo {
  code: string;
  name: string;
  type: "state" | "ut";
}

export interface InvoiceValidation {
  invoice_number: string;
  is_valid: boolean;
  length: number;
  errors: string[];
}

// ── Tax calculation types ──

export interface TaxBreakdown {
  base_amount: number;
  gst_rate: number;
  supply_type: "intra" | "inter";
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
}

export interface ReverseCalculation {
  inclusive_amount: number;
  gst_rate: number;
  supply_type: "intra" | "inter";
  base_amount: number;
  total_tax: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
}

export interface SupplyTypeDetermination {
  supplier_gstin: string;
  recipient_gstin: string;
  supplier_state: string;
  recipient_state: string;
  supply_type: "intra" | "inter";
  applicable_taxes: string;
}

// ── HSN/SAC types ──

export interface HsnEntry {
  code: string;
  description: string;
  rate: number;
  chapter: string;
  schedule: string;
}

export interface SacEntry {
  code: string;
  description: string;
  rate: number;
  group: string;
}

export interface RateSlab {
  rate: number;
  schedule: string;
  description: string;
  example_categories: string[];
}
