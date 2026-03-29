# @mcp-india/hubspot

[![npm version](https://img.shields.io/npm/v/@mcp-india/hubspot.svg)](https://www.npmjs.com/package/@mcp-india/hubspot)

MCP server that exposes HubSpot CRM operations as AI-callable tools. Enables AI assistants to manage contacts, companies, deals, engagements, and pipeline reports through the Model Context Protocol.

## Quick Start

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "npx",
      "args": ["-y", "@mcp-india/hubspot"],
      "env": {
        "HUBSPOT_ACCESS_TOKEN": "pat-na1-..."
      }
    }
  }
}
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `HUBSPOT_ACCESS_TOKEN` | Yes | HubSpot Private App access token ([Settings → Integrations → Private Apps](https://app.hubspot.com)) |

## Tools (18)

### Contacts (4 tools)

| Tool | Description |
|------|-------------|
| `hubspot_search_contacts` | Search contacts by name, email, or phone |
| `hubspot_get_contact` | Get contact details by ID |
| `hubspot_create_contact` | Create a new contact |
| `hubspot_update_contact` | Update contact properties |

### Companies (4 tools)

| Tool | Description |
|------|-------------|
| `hubspot_search_companies` | Search companies by name or domain |
| `hubspot_get_company` | Get company details by ID |
| `hubspot_create_company` | Create a new company |
| `hubspot_update_company` | Update company properties |

### Deals (4 tools)

| Tool | Description |
|------|-------------|
| `hubspot_search_deals` | Search deals by name, stage, or pipeline |
| `hubspot_get_deal` | Get deal details by ID |
| `hubspot_create_deal` | Create a new deal |
| `hubspot_update_deal` | Update deal properties (including stage) |

### Engagements (4 tools)

| Tool | Description |
|------|-------------|
| `hubspot_create_note` | Create a note on any CRM record |
| `hubspot_create_task` | Create a follow-up task with due date |
| `hubspot_log_email` | Log email activity on a record |
| `hubspot_list_activities` | List recent engagements for a record |

### Reports (2 tools)

| Tool | Description |
|------|-------------|
| `hubspot_pipeline_summary` | Pipeline overview: deals per stage, totals, weighted values |
| `hubspot_deal_forecast` | Revenue forecast from weighted pipeline |

## Examples

**Search for a contact:**
> "Find the HubSpot contact for alice@acme.com"

**Create a deal:**
> "Create a deal called 'Enterprise Renewal' for $50,000 in the Sales Pipeline"

**Pipeline overview:**
> "Show me the HubSpot pipeline summary"

**Log activity:**
> "Create a follow-up task for next Friday: review proposal with client"

## Rate Limits

The server enforces 10 requests/second (HubSpot Private App rate limit). Requests exceeding this are queued automatically.

## License

MIT
