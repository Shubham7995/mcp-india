# Configuration

Add any combination of the 6 servers to your MCP client. Each server runs independently — you only need credentials for the ones you use.

## All servers — full config block

The JSON below includes all 6 servers. Copy the block, remove the ones you don't need, and fill in your credentials.

```json
{
  "mcpServers": {
    "razorpay": {
      "command": "npx",
      "args": ["-y", "@mcp-india/razorpay"],
      "env": {
        "RAZORPAY_KEY_ID": "rzp_test_YOUR_KEY_ID",
        "RAZORPAY_KEY_SECRET": "YOUR_KEY_SECRET"
      }
    },
    "zoho-crm": {
      "command": "npx",
      "args": ["-y", "@mcp-india/zoho-crm"],
      "env": {
        "ZOHO_CLIENT_ID": "1000.XXXXXXXXXXXX",
        "ZOHO_CLIENT_SECRET": "XXXXXXXXXXXXXXXX",
        "ZOHO_REFRESH_TOKEN": "1000.XXXXXXXX.XXXXXXXX"
      }
    },
    "gst-india": {
      "command": "npx",
      "args": ["-y", "@mcp-india/gst-india"]
    },
    "stripe": {
      "command": "npx",
      "args": ["-y", "@mcp-india/stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_YOUR_SECRET_KEY"
      }
    },
    "hubspot": {
      "command": "npx",
      "args": ["-y", "@mcp-india/hubspot"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "pat-na1-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }
    },
    "airtable": {
      "command": "npx",
      "args": ["-y", "@mcp-india/airtable"],
      "env": {
        "AIRTABLE_ACCESS_TOKEN": "patXXXXXXXXXXXXXX.XXXXXXXX",
        "AIRTABLE_BASE_ID": "appXXXXXXXXXXXXXX"
      }
    }
  }
}
```

## Client-specific setup

### Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Paste the JSON config above into this file, then restart Claude Desktop.

### Cursor

**Config file**: `~/.cursor/mcp.json`

Same JSON format as above. Restart Cursor after editing.

### Windsurf

**Config file**: `~/.codeium/windsurf/mcp_config.json`

Same JSON format as above. Restart Windsurf after editing.

### VS Code (Copilot MCP)

**Config file**: `.vscode/mcp.json` (per project) or `~/.vscode/mcp.json` (global)

VS Code uses the same JSON structure. Add the `mcpServers` block to your config.

### Claude Code CLI

**Config file**: `.claude/settings.json` (per project) or `~/.claude/settings.json` (global)

```json
{
  "mcpServers": {
    "razorpay": {
      "command": "npx",
      "args": ["-y", "@mcp-india/razorpay"],
      "env": {
        "RAZORPAY_KEY_ID": "rzp_test_YOUR_KEY_ID",
        "RAZORPAY_KEY_SECRET": "YOUR_KEY_SECRET"
      }
    }
  }
}
```

## Environment variables

Each server reads credentials from environment variables set in the `env` block. See the `.env.example` in each package for the full list:

| Server | Required env vars |
|--------|------------------|
| razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| zoho-crm | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` |
| gst-india | _(none — fully offline)_ |
| stripe | `STRIPE_SECRET_KEY` |
| hubspot | `HUBSPOT_ACCESS_TOKEN` |
| airtable | `AIRTABLE_ACCESS_TOKEN`, `AIRTABLE_BASE_ID` |
