# Tradera MCP server

A zero-dependency Node.js MCP server that exposes the Tradera v4 REST API as
callable tools. Used by the `tradera-api` plugin so Claude (or any MCP client)
can publish, look up, and end listings without re-deriving HTTP requests every
turn.

## Requirements

- Node.js 18 or newer (uses the built-in `fetch` and `readline`)
- Tradera API credentials in environment variables:
  - `TRADERA_APP_ID`, `TRADERA_APP_KEY` (required for all tools)
  - `TRADERA_USER_ID`, `TRADERA_USER_TOKEN` (required for write tools)
- Optional: `TRADERA_API_BASE` (defaults to `https://api.tradera.com/v4`)

## Tools

| Tool | Purpose |
|---|---|
| `tradera_get_item` | Read a listing by `itemId` |
| `tradera_publish_listing` | Create + upload images + commit in one call (use this for bulk/CSV workflows) |
| `tradera_create_listing_request` | Low-level: create a pending listing |
| `tradera_upload_listing_image` | Low-level: upload one image to a pending listing |
| `tradera_commit_listing` | Low-level: commit a pending listing |
| `tradera_end_listing` | End an active listing |

## Running locally

```bash
node plugins/tradera-api/mcp/server.mjs
```

It speaks newline-delimited JSON-RPC 2.0 over stdio (MCP spec 2024-11-05).
