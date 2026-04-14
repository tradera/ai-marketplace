# Tradera AI Marketplace

AI plugins for the [Tradera](https://www.tradera.com) marketplace. Works with both **Claude Code** and **Cursor**.

## Quick Start

### Claude Code

**CLI**

```bash
# Add the marketplace
claude plugin marketplace add tradera/ai-marketplace

# Install a plugin
claude plugin install tradera-api@tradera-ai-marketplace
```

**Desktop app**

Run these slash commands in any Claude Code session:

```
/plugin marketplace add tradera/ai-marketplace
/plugin install tradera-api@tradera-ai-marketplace
```

### Cursor

Add this repository as a marketplace in Cursor's plugin settings.

## Plugins

| Plugin | Description |
|--------|-------------|
| **[tradera-api](plugins/tradera-api/)** | Skills for interacting with the Tradera public REST API (v4) — look up items, publish listings, and manage active listings. |

## Tradera API

The included skills use the [Tradera REST API (v4)](https://api.tradera.com) at `api.tradera.com`. The API is open for anyone to use — register as a developer at [api.tradera.com/register](https://api.tradera.com/register) to get your credentials.

The current skills cover the basics (item lookup, publishing, and deletion), but the API supports much more. You can build your own skills on top of it — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new skills to this marketplace.

## Repository Structure

```
.claude-plugin/marketplace.json        # Claude Code marketplace manifest
.cursor-plugin/marketplace.json        # Cursor marketplace manifest
plugins/<plugin>/
  .claude-plugin/plugin.json           # Plugin metadata (Claude Code)
  .cursor-plugin/plugin.json           # Plugin metadata (Cursor)
  skills/<skill-name>/SKILL.md         # Skill definitions
  mcp.json                             # MCP server configuration
  hooks/hooks.json                     # Hooks configuration
  README.md                            # Plugin documentation
scripts/validate-template.mjs          # Marketplace structure validator
```

## Validate

```bash
node scripts/validate-template.mjs
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding plugins.

## License

[MIT](LICENSE)
