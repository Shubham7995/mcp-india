import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatToolError, ApiValidationError } from "@mcp-india/shared";
import { GST_STATE_CODES } from "../data/state-codes.js";
import type { TaxBreakdown, ReverseCalculation, SupplyTypeDetermination } from "../types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function registerCalculationTools(server: McpServer): void {
  // Tool 4: gst_calculate_tax
  server.tool(
    "gst_calculate_tax",
    "Calculate GST breakdown (CGST/SGST or IGST) for a given amount, rate, and supply type. Intra-state splits into CGST + SGST. Inter-state applies IGST.",
    {
      amount: z.number().positive().describe("Base amount in INR (before GST)"),
      gst_rate: z.number().min(0).max(28).describe("GST rate percentage (0, 3, 5, 12, 18, or 28)"),
      supply_type: z.enum(["intra", "inter"]).describe("'intra' for same-state (CGST+SGST), 'inter' for different-state (IGST)"),
    },
    async ({ amount, gst_rate, supply_type }) => {
      try {
        let cgst_rate = 0;
        let sgst_rate = 0;
        let igst_rate = 0;

        if (supply_type === "intra") {
          cgst_rate = gst_rate / 2;
          sgst_rate = gst_rate / 2;
        } else {
          igst_rate = gst_rate;
        }

        const cgst_amount = round2(amount * cgst_rate / 100);
        const sgst_amount = round2(amount * sgst_rate / 100);
        const igst_amount = round2(amount * igst_rate / 100);
        const total_tax = round2(cgst_amount + sgst_amount + igst_amount);

        const breakdown: TaxBreakdown = {
          base_amount: amount,
          gst_rate,
          supply_type,
          cgst_rate,
          sgst_rate,
          igst_rate,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total_tax,
          total_amount: round2(amount + total_tax),
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(breakdown, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // Tool 5: gst_determine_supply_type
  server.tool(
    "gst_determine_supply_type",
    "Determine if a transaction is intra-state (CGST + SGST) or inter-state (IGST) based on the supplier and recipient GSTINs. Compares the first 2 digits (state codes) of each GSTIN.",
    {
      supplier_gstin: z.string().describe("Supplier's 15-character GSTIN"),
      recipient_gstin: z.string().describe("Recipient's 15-character GSTIN"),
    },
    async ({ supplier_gstin, recipient_gstin }) => {
      try {
        const sup = supplier_gstin.trim().toUpperCase();
        const rec = recipient_gstin.trim().toUpperCase();

        if (sup.length < 15) {
          throw new ApiValidationError("Supplier GSTIN must be 15 characters");
        }
        if (rec.length < 15) {
          throw new ApiValidationError("Recipient GSTIN must be 15 characters");
        }

        const supState = sup.substring(0, 2);
        const recState = rec.substring(0, 2);

        const supInfo = GST_STATE_CODES[supState];
        const recInfo = GST_STATE_CODES[recState];

        if (!supInfo) {
          throw new ApiValidationError(`Invalid supplier state code: ${supState}`);
        }
        if (!recInfo) {
          throw new ApiValidationError(`Invalid recipient state code: ${recState}`);
        }

        const isIntra = supState === recState;

        const determination: SupplyTypeDetermination = {
          supplier_gstin: sup,
          recipient_gstin: rec,
          supplier_state: supInfo.name,
          recipient_state: recInfo.name,
          supply_type: isIntra ? "intra" : "inter",
          applicable_taxes: isIntra ? "CGST + SGST" : "IGST",
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(determination, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // Tool 6: gst_reverse_calculate
  server.tool(
    "gst_reverse_calculate",
    "Reverse-calculate the base amount and tax breakdown from a GST-inclusive amount. Given a total amount that includes GST, extracts the base price and individual tax components.",
    {
      inclusive_amount: z.number().positive().describe("Total amount including GST (in INR)"),
      gst_rate: z.number().min(0).max(28).describe("GST rate percentage (0, 3, 5, 12, 18, or 28)"),
      supply_type: z.enum(["intra", "inter"]).describe("'intra' for same-state (CGST+SGST), 'inter' for different-state (IGST)"),
    },
    async ({ inclusive_amount, gst_rate, supply_type }) => {
      try {
        const base_amount = round2(inclusive_amount / (1 + gst_rate / 100));
        const total_tax = round2(inclusive_amount - base_amount);

        let cgst_amount = 0;
        let sgst_amount = 0;
        let igst_amount = 0;

        if (supply_type === "intra") {
          cgst_amount = round2(total_tax / 2);
          sgst_amount = round2(total_tax / 2);
        } else {
          igst_amount = total_tax;
        }

        const result: ReverseCalculation = {
          inclusive_amount,
          gst_rate,
          supply_type,
          base_amount,
          total_tax,
          cgst_amount,
          sgst_amount,
          igst_amount,
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
