# Tradera AI Marketplace

AI plugins for the [Tradera](https://www.tradera.com) marketplace. Works with both **Claude Code** and **Cursor**.

## Quick Start

### Claude Code

```bash
# Add the marketplace
claude plugin marketplace add tradera/ai-marketplace

# Install a plugin
claude plugin install tradera-api@tradera-ai-marketplace
```

### Cursor

Add this repository as a marketplace in Cursor's plugin settings.

## Plugins

| Plugin | Description |
|--------|-------------|
| **[tradera-api](plugins/tradera-api/)** | Skills for interacting with the Tradera public REST API (v4) — look up items, publish listings, and manage active listings. |

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
