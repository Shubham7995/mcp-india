/**
 * Type definitions for Razorpay API responses.
 * These augment the razorpay npm package types where needed.
 */

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status:
    | "created"
    | "authorized"
    | "captured"
    | "refunded"
    | "failed";
  order_id: string | null;
  method: string;
  description: string | null;
  email: string;
  contact: string;
  created_at: number;
  error_code: string | null;
  error_description: string | null;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: "created" | "attempted" | "paid";
  receipt: string | null;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  status: "pending" | "processed" | "failed";
  created_at: number;
}

export interface RazorpaySettlement {
  id: string;
  entity: "settlement";
  amount: number;
  status: "created" | "processed" | "failed";
  fees: number;
  tax: number;
  utr: string;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: "subscription";
  plan_id: string;
  status:
    | "created"
    | "authenticated"
    | "active"
    | "pending"
    | "halted"
    | "cancelled"
    | "completed"
    | "expired";
  current_start: number | null;
  current_end: number | null;
  created_at: number;
}

export interface RazorpayInvoice {
  id: string;
  entity: "invoice";
  type: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled" | "expired";
  amount: number;
  currency: string;
  customer_id: string;
  created_at: number;
}

export interface RazorpayCustomer {
  id: string;
  entity: "customer";
  name: string;
  email: string;
  contact: string;
  created_at: number;
}

export interface RazorpayCollection<T> {
  entity: "collection";
  count: number;
  items: T[];
}

export interface DashboardSummary {
  date: string;
  total_payments: number;
  captured_payments: number;
  failed_payments: number;
  total_revenue_inr: number;
  total_refunds_inr: number;
  net_revenue_inr: number;
  currency: "INR";
}
