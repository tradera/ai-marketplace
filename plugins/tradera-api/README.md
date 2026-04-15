# Tradera API

Skills for interacting with the [Tradera](https://www.tradera.com) public REST API (v4). Look up items, publish listings, and manage active listings — all from Claude Code.

## Quick Start

```bash
# 1. Add the marketplace (one-time)
claude plugin marketplace add tradera/ai-marketplace

# 2. Install the plugin
claude plugin install tradera-api@tradera-ai-marketplace

# 3. Set up your developer account
/tradera-setup
```

## Skills

| Skill | Description | Auth needed |
|-------|-------------|-------------|
| `/tradera-setup` | One-stop setup & health check — diagnoses the environment and guides the user through whatever's missing (Node, credentials, dev-portal registration) | None |
| `/tradera-user-token` | Obtain a user token via browser login | App credentials |
| `/tradera-get-item <itemId>` | Look up a listing by ID | App credentials |
| `/tradera-publish` | Create and publish a new listing (interactive) | App + User credentials |
| `/tradera-publish-csv <file>` | Bulk-publish every row of a CSV (uses MCP) | App + User credentials |
| `/tradera-end-listing <itemId>` | End an active listing | App + User credentials |

## MCP server

This plugin also ships an MCP server (`mcp/server.mjs`) that exposes the
Tradera v4 API as callable tools. It's what the `/tradera-publish-csv` skill
(and any non-dev bulk workflow) uses under the hood. No `npm install` is
required — the server is a single zero-dependency Node 18+ script.

Tools exposed:

- `tradera_get_item`
- `tradera_publish_listing` — create + upload images + commit in one call
- `tradera_create_listing_request` / `tradera_upload_listing_image` / `tradera_commit_listing` (low-level)
- `tradera_end_listing`

Credentials are read from the same env vars as the skills (`TRADERA_APP_ID`,
`TRADERA_APP_KEY`, `TRADERA_USER_ID`, `TRADERA_USER_TOKEN`). The MCP server is
registered automatically by the plugin via `mcp.json`.

### Node.js requirement

The MCP server (and therefore the bulk/CSV workflow) requires Node.js 18 or
newer. If you installed Claude Code via `npm install -g @anthropic-ai/claude-code`,
Node is already installed and you're done.

If Node is missing, the plugin's `SessionStart` hook will print platform-specific
install instructions at the start of your next session. You can also run
`/tradera-setup` at any time to check your environment and get guidance.

## Authentication

Each Tradera API application has three credentials:
- **App ID** (integer) — identifies your application
- **App Key** (GUID, secret) — authenticates API calls
- **Public Key** (GUID) — used in browser login URLs (less sensitive)

Write operations (publish, end listing) additionally require:
- **User ID** (integer) — your Tradera user ID
- **User Token** (GUID) — obtained via `/tradera-user-token`

### Environment Variables (recommended)

Set these in your shell environment so all skills pick them up automatically — no need to pass credentials as arguments.

**Important:** Claude Code runs non-interactive shells, so use files that are sourced in that context:
- **zsh:** `~/.zshenv` (not `~/.zshrc`)
- **bash:** `~/.profile` or set `BASH_ENV=~/.bashrc` in your login profile (not `~/.bashrc` directly — it's only sourced by interactive bash)

```bash
export TRADERA_APP_ID=your_app_id
export TRADERA_APP_KEY=your_app_key
export TRADERA_PUBLIC_KEY=your_public_key
export TRADERA_USER_ID=your_user_id
export TRADERA_USER_TOKEN=your_user_token
```

All skills check these env vars first, then fall back to command arguments.

## API Reference

- Base URL: `https://api.tradera.com/v4/`
- Documentation: `https://api.tradera.com`
- Rate limit: 100 calls/24 hours (contact apiadmin@tradera.com for increases)

## Platform Support

These skills work on macOS, Linux, and WSL. Browser-based flows (setup, user-token) automatically detect the right command to open URLs (`open`, `xdg-open`, or `wslview`).
