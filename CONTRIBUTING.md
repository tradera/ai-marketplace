# Contributing

Thanks for your interest in contributing to the Tradera AI Marketplace!

## Adding a Plugin

1. Create a directory under `plugins/<plugin-name>/`.
2. Add the required files:
   - `.claude-plugin/plugin.json` — plugin metadata for Claude Code
   - `.cursor-plugin/plugin.json` — plugin metadata for Cursor
   - `mcp.json` — MCP server configuration (can be empty: `{"mcpServers": {}}`)
   - `hooks/hooks.json` — hooks configuration (can be empty: `{"version": 1, "hooks": {}}`)
   - `README.md` — plugin documentation
3. Add skills under `plugins/<plugin-name>/skills/<skill-name>/SKILL.md`.
4. Register the plugin in both marketplace manifests:
   - `.claude-plugin/marketplace.json`
   - `.cursor-plugin/marketplace.json`
5. Run `node scripts/validate-template.mjs` to verify the structure.

## Skill Format

Skills are Markdown files with YAML frontmatter:

```yaml
---
name: my-skill
description: >
  What this skill does and when to use it.
argument-hint: "[optional] <required>"
allowed-tools: ["Bash"]
---

# Skill Title

Instructions for the AI assistant...
```

## Plugin Metadata (`plugin.json`)

```json
{
  "name": "plugin-name",
  "displayName": "Human Readable Name",
  "version": "1.0.0",
  "description": "Brief description.",
  "author": { "name": "Your Name" },
  "license": "MIT",
  "keywords": ["relevant", "tags"]
}
```

## Naming Conventions

- Plugin names: lowercase, alphanumeric, hyphens only (e.g. `tradera-api`)
- Skill names: lowercase, alphanumeric, hyphens only (e.g. `tradera-get-item`)
- Skill files must be named `SKILL.md`

## Versioning

Every plugin is versioned with [semver](https://semver.org/). The version
lives in **both** `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json`
and the two must stay in sync.

**When you change a plugin, bump its version in the same commit** so existing
users see the update available:

- **Patch** (`1.2.0` → `1.2.1`) — bug fixes, doc-only changes, internal
  refactors with no user-visible behavior change.
- **Minor** (`1.2.0` → `1.3.0`) — additive, backwards-compatible changes:
  new skills, new MCP tools, new hooks, new optional env vars.
- **Major** (`1.2.0` → `2.0.0`) — breaking changes: renamed/removed
  skills or tools, changed credential names, new hard runtime requirements
  that would break existing users.

Don't forget either manifest — if only one is bumped, Claude Code and Cursor
users will end up on different versions of the same plugin.

## Pull Requests

1. Fork the repo and create a feature branch.
2. Make your changes.
3. Run validation: `node scripts/validate-template.mjs`
4. Open a pull request with a clear description of what you're adding.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
