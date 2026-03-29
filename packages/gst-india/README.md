# @mcp-india/gst-india

[![npm version](https://img.shields.io/npm/v/@mcp-india/gst-india.svg)](https://www.npmjs.com/package/@mcp-india/gst-india)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Offline MCP server for Indian GST — validate GSTINs, calculate taxes, and look up HSN/SAC codes through AI assistants like Claude. **No API keys required.**

## Installation

```bash
npx -y @mcp-india/gst-india
```

No configuration needed. Works instantly.

## Configuration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gst-india": {
      "command": "npx",
      "args": ["-y", "@mcp-india/gst-india"]
    }
  }
}
```

That's it — no environment variables needed.

## Available Tools

### Validation

| Tool | Description |
|------|-------------|
| `gst_validate_gstin` | Validate GSTIN format, check digit, and extract state/PAN/entity info |
| `gst_validate_invoice_number` | Validate GST invoice number format (max 16 chars, Rule 46) |
| `gst_get_state_info` | Get state/UT name from a 2-digit code or GSTIN |

### Calculation

| Tool | Description |
|------|-------------|
| `gst_calculate_tax` | Calculate CGST/SGST/IGST breakdown for a given amount and rate |
| `gst_determine_supply_type` | Determine intra-state or inter-state from two GSTINs |
| `gst_reverse_calculate` | Extract base amount from a GST-inclusive price |

### HSN & Rates

| Tool | Description |
|------|-------------|
| `gst_search_hsn` | Search 500+ HSN and 120+ SAC codes by keyword or code number |
| `gst_get_hsn_details` | Get full details and GST rate for a specific HSN/SAC code |
| `gst_list_rate_slabs` | List all GST rate slabs (0%, 5%, 12%, 18%, 28%) with examples |

## Example Conversations

**Validate a GSTIN:**
> "Is GSTIN 27AABCU9603R1ZN valid? What state and PAN does it belong to?"

**Calculate GST:**
> "Calculate 18% GST on Rs 50,000 for an intra-state sale in Maharashtra."

**Reverse-calculate from inclusive price:**
> "I paid Rs 11,800 including GST at 18%. What was the base price?"

**Look up HSN code:**
> "What's the HSN code and GST rate for laptops?"

**Check supply type:**
> "Is a sale from Maharashtra (27) to Karnataka (29) intra-state or inter-state?"

## Bundled Data

This package includes curated, offline datasets:

- **500+ HSN codes** covering goods across all major chapters (food, textiles, electronics, metals, vehicles, etc.)
- **120+ SAC codes** covering services (IT, finance, transport, construction, consulting, etc.)
- **38 state/UT codes** with names and state/UT classification
- **6 GST rate slabs** (0%, 5%, 12%, 18%, 28%, and special 3% for precious metals)

All data is bundled into the package at build time. No network requests are made.

## Troubleshooting

**Server fails to start**
Ensure you have Node.js 20+ installed. Run `node --version` to check.

**HSN/SAC search returns no results**
Try a broader keyword (e.g., "computer" instead of "Dell laptop"). The search matches against official code descriptions.

**Rate information seems outdated**
GST rates change when the GST Council issues new notifications (2-4 times per year). Please open an issue if you notice outdated rates.

## License

MIT
