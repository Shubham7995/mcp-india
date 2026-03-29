# @mcp-india/airtable

[![npm version](https://img.shields.io/npm/v/@mcp-india/airtable.svg)](https://www.npmjs.com/package/@mcp-india/airtable)

MCP server that exposes Airtable bases, tables, and records as AI-callable tools. Enables AI assistants to read, write, and search Airtable data through the Model Context Protocol.

## Quick Start

```json
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "@mcp-india/airtable"],
      "env": {
        "AIRTABLE_ACCESS_TOKEN": "pat...",
        "AIRTABLE_BASE_ID": "appXXXXXXXXXXXX"
      }
    }
  }
}
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_ACCESS_TOKEN` | Yes | Airtable Personal Access Token ([Create token](https://airtable.com/create/tokens)) |
| `AIRTABLE_BASE_ID` | Yes | Default base ID (starts with `app`, found in the base URL) |

## Tools (12)

### Records (6 tools)

| Tool | Description |
|------|-------------|
| `airtable_list_records` | List records with view, sort, and filter formula |
| `airtable_get_record` | Get a record by ID |
| `airtable_create_record` | Create a record with field values |
| `airtable_update_record` | Update fields on a record |
| `airtable_delete_record` | Delete a record |
| `airtable_search_records` | Search using Airtable formula syntax |

### Schema (3 tools)

| Tool | Description |
|------|-------------|
| `airtable_list_bases` | List all accessible bases |
| `airtable_list_tables` | List tables in a base with field counts |
| `airtable_get_table_schema` | Get full field definitions (name, type, options) |

### Bulk & Summary (3 tools)

| Tool | Description |
|------|-------------|
| `airtable_bulk_create` | Create up to 10 records at once |
| `airtable_bulk_update` | Update up to 10 records at once |
| `airtable_table_summary` | Record count, field types, sample records |

## Multi-Base Support

Every tool accepts an optional `base_id` parameter to override the default base. This enables working with multiple bases without reconfiguring the server.

## Examples

**List records with a filter:**
> "Show me all tasks in the Projects table where Status is Active"

**Search by formula:**
> "Search the Contacts table for records where Email contains @acme.com"

**Explore schema:**
> "What tables are in my Airtable base and what fields do they have?"

**Bulk create:**
> "Add these 5 items to my Inventory table: ..."

## Rate Limits

The server enforces 5 requests/second (Airtable's rate limit). Bulk operations are capped at 10 records per call (Airtable's API limit).

## License

MIT
