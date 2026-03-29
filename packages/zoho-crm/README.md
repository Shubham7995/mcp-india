# @mcp-india/zoho-crm

[![npm version](https://img.shields.io/npm/v/@mcp-india/zoho-crm.svg)](https://www.npmjs.com/package/@mcp-india/zoho-crm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

MCP server for [Zoho CRM](https://www.zoho.com/crm/) — search contacts, manage deals, log calls, create tasks, and get pipeline analytics through AI assistants like Claude.

## Installation

```bash
npx -y @mcp-india/zoho-crm
```

## Configuration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zoho-crm": {
      "command": "npx",
      "args": ["-y", "@mcp-india/zoho-crm"],
      "env": {
        "ZOHO_CLIENT_ID": "your_client_id",
        "ZOHO_CLIENT_SECRET": "your_client_secret",
        "ZOHO_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ZOHO_CLIENT_ID` | Yes | OAuth2 Client ID from Zoho API Console |
| `ZOHO_CLIENT_SECRET` | Yes | OAuth2 Client Secret |
| `ZOHO_REFRESH_TOKEN` | Yes | OAuth2 Refresh Token |
| `ZOHO_API_DOMAIN` | No | API domain (default: `zohoapis.com`, use `zohoapis.in` for India, `zohoapis.eu` for EU) |
| `ZOHO_ACCOUNTS_DOMAIN` | No | Accounts domain (default: `accounts.zoho.com`, use `accounts.zoho.in` for India) |

### OAuth2 Setup (Getting Your Credentials)

1. Go to [Zoho API Console](https://api-console.zoho.com/) and create a **Self Client**
2. Note down your **Client ID** and **Client Secret**
3. Generate a **grant token** with these scopes:
   ```
   ZohoCRM.modules.ALL,ZohoCRM.settings.ALL
   ```
4. Exchange the grant token for a refresh token:
   ```bash
   curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=YOUR_GRANT_TOKEN"
   ```
5. Copy the `refresh_token` from the response — this is your `ZOHO_REFRESH_TOKEN`

> **India users**: Replace `accounts.zoho.com` with `accounts.zoho.in` in step 4, and set `ZOHO_API_DOMAIN=zohoapis.in` and `ZOHO_ACCOUNTS_DOMAIN=accounts.zoho.in` in your config.

## Available Tools

### Contacts

| Tool | Description |
|------|-------------|
| `zoho_search_contacts` | Search contacts by email, phone, or keyword |
| `zoho_create_contact` | Create a new contact |
| `zoho_update_contact` | Update fields on an existing contact |
| `zoho_get_contact` | Get a contact by ID |

### Deals

| Tool | Description |
|------|-------------|
| `zoho_list_deals` | List deals with sorting and pagination |
| `zoho_create_deal` | Create a new deal |
| `zoho_update_deal_stage` | Move a deal to a new stage |
| `zoho_get_deal` | Get a deal by ID |

### Activities

| Tool | Description |
|------|-------------|
| `zoho_create_task` | Create a follow-up task linked to a contact or deal |
| `zoho_list_tasks` | List tasks with pagination |
| `zoho_log_call` | Log a call activity |
| `zoho_create_note` | Add a note to a contact, deal, or other record |

### Reports

| Tool | Description |
|------|-------------|
| `zoho_sales_pipeline_summary` | Pipeline summary grouped by stage with weighted values |
| `zoho_revenue_forecast` | Revenue forecast for deals closing before a given date |

## Example Conversations

**Find a contact by email:**
> "Find Priya Sharma's contact details in Zoho CRM"

**Check the sales pipeline:**
> "What does our sales pipeline look like? Break it down by stage."

**Forecast Q2 revenue:**
> "What revenue can we expect from deals closing before July 2026 with at least 50% probability?"

## Troubleshooting

**Server fails to start / Missing environment variables**
Ensure `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, and `ZOHO_REFRESH_TOKEN` are all set in your MCP configuration.

**401 Authentication errors**
Your refresh token may have expired. Regenerate it from the Zoho API Console using the Self Client flow above.

**Wrong data returned / Empty results**
If you're using Zoho's India data center (`.zoho.in`), set `ZOHO_API_DOMAIN=zohoapis.in` and `ZOHO_ACCOUNTS_DOMAIN=accounts.zoho.in`.

**Rate limiting errors**
Zoho CRM has daily API limits (5,000/day on free plan). The server includes built-in rate limiting, but high-volume usage may still hit daily caps.

## License

MIT
