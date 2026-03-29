import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatToolError, ApiNotFoundError, ApiValidationError } from "@mcp-india/shared";
import { GST_STATE_CODES } from "../data/state-codes.js";
import type { GstinBreakdown, InvoiceValidation } from "../types.js";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
const CHAR_SET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Compute the check digit (15th character) of a GSTIN.
 * Uses weighted modulo-36 algorithm with alternating factors 1 and 2.
 */
export function computeGstinCheckDigit(gstin14: string): string {
  let sum = 0;
  let factor = 1;

  for (let i = 0; i < 14; i++) {
    const charValue = CHAR_SET.indexOf(gstin14[i]);
    let product = charValue * factor;
    product = Math.floor(product / 36) + (product % 36);
    sum += product;
    factor = factor === 1 ? 2 : 1;
  }

  const checkDigitValue = (36 - (sum % 36)) % 36;
  return CHAR_SET[checkDigitValue];
}

export function registerValidationTools(server: McpServer): void {
  // Tool 1: gst_validate_gstin
  server.tool(
    "gst_validate_gstin",
    "Validate a GSTIN (Goods and Services Tax Identification Number) — checks format, computes check digit, and extracts state, PAN, and entity information. No API call needed.",
    { gstin: z.string().describe("The 15-character GSTIN to validate") },
    async ({ gstin }) => {
      try {
        const upper = gstin.toUpperCase().trim();

        if (upper.length !== 15) {
          throw new ApiValidationError("GSTIN must be exactly 15 characters");
        }

        if (!GSTIN_REGEX.test(upper)) {
          throw new ApiValidationError(
            "GSTIN format is invalid. Expected: 2-digit state code + 10-char PAN + entity number + Z + check digit",
          );
        }

        const stateCode = upper.substring(0, 2);
        const pan = upper.substring(2, 12);
        const entityNumber = upper[12];
        const checkDigit = upper[14];

        const stateInfo = GST_STATE_CODES[stateCode];
        const stateName = stateInfo ? stateInfo.name : "Unknown";

        const expectedCheckDigit = computeGstinCheckDigit(upper.substring(0, 14));
        const isValid = checkDigit === expectedCheckDigit;

        const breakdown: GstinBreakdown = {
          gstin: upper,
          is_valid: isValid,
          state_code: stateCode,
          state_name: stateName,
          pan,
          entity_number: entityNumber,
          check_digit: checkDigit,
        };

        if (!isValid) {
          breakdown.error = `Invalid check digit: expected '${expectedCheckDigit}', got '${checkDigit}'`;
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(breakdown, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // Tool 2: gst_validate_invoice_number
  server.tool(
    "gst_validate_invoice_number",
    "Validate a GST invoice number against Rule 46 requirements — checks length (max 16), allowed characters (alphanumeric, /, -), and format constraints.",
    { invoice_number: z.string().describe("The invoice number to validate") },
    async ({ invoice_number }) => {
      try {
        const errors: string[] = [];

        if (invoice_number.length > 16) {
          errors.push("Invoice number must not exceed 16 characters");
        }

        if (invoice_number.length === 0) {
          errors.push("Invoice number must not be empty");
        }

        if (/\s/.test(invoice_number)) {
          errors.push("Invoice number must not contain spaces");
        }

        if (!/^[A-Za-z0-9/\-]*$/.test(invoice_number)) {
          errors.push("Invoice number may only contain alphanumeric characters, '/', and '-'");
        }

        if (invoice_number.length > 0 && /^[0/\-]/.test(invoice_number)) {
          errors.push("Invoice number must not start with '0', '/', or '-'");
        }

        const validation: InvoiceValidation = {
          invoice_number,
          is_valid: errors.length === 0,
          length: invoice_number.length,
          errors,
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(validation, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // Tool 3: gst_get_state_info
  server.tool(
    "gst_get_state_info",
    "Get Indian state or union territory information from a 2-digit state code or from a GSTIN. Returns state name, code, and whether it is a state or union territory.",
    { input: z.string().describe("A 2-digit state code (e.g. '27') or a 15-character GSTIN") },
    async ({ input }) => {
      try {
        const trimmed = input.trim().toUpperCase();
        const stateCode = trimmed.length === 15 ? trimmed.substring(0, 2) : trimmed;

        if (!/^[0-9]{2}$/.test(stateCode)) {
          throw new ApiValidationError(
            "Input must be a 2-digit state code or a 15-character GSTIN",
          );
        }

        const stateInfo = GST_STATE_CODES[stateCode];
        if (!stateInfo) {
          throw new ApiNotFoundError("state/UT", stateCode);
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(stateInfo, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}
