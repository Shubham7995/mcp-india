# @mcp-india/airtable

## 0.1.0

### Minor Changes

- Initial release of Airtable MCP server
- 12 tools across 3 domains:
  - **Records**: list, get, create, update, delete, search (formula-based)
  - **Schema**: list bases, list tables, get table field definitions
  - **Bulk**: create/update up to 10 records at once, table summary
- Native fetch client with PAT auth (no heavy SDK)
- Rate limiting at 5 req/s (Airtable's limit)
- Per-tool `base_id` override for multi-base workflows
