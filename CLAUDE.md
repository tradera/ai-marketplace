# Repository guidance for AI assistants

This repo is the Tradera AI marketplace — a collection of plugins (skills,
MCP servers, hooks) for Claude Code and Cursor. See `CONTRIBUTING.md` for the
full human-facing contribution guide; this file captures the rules that are
easy to miss when an AI assistant edits things.

## When you change a plugin, bump its version

**This is the rule that gets forgotten most often.** Every plugin under
`plugins/<name>/` has its semver in two files that must stay in sync:

- `plugins/<name>/.claude-plugin/plugin.json`
- `plugins/<name>/.cursor-plugin/plugin.json`

Bump both in the same commit as any behavior change, even small ones.
Without the bump, existing users' `claude plugin update` / Cursor update
won't know there's anything new to fetch.

Use semver:

| Kind of change | Bump |
|---|---|
| New skill, new MCP tool, new hook, new optional env var | Minor (`1.2.0` → `1.3.0`) |
| Bug fix, doc-only change, internal refactor | Patch (`1.2.0` → `1.2.1`) |
| Renamed/removed skill or tool, changed credential names, new hard runtime requirement | Major (`1.2.0` → `2.0.0`) |

The full table is in `CONTRIBUTING.md#versioning`.

## Before opening a PR

Run `node scripts/validate-template.mjs` — it catches missing files, broken
references, and mismatched plugin names across the marketplace manifests.

## Plugin scaffolding

See `CONTRIBUTING.md` for the required files when creating a new plugin.
Don't invent new file locations — the validator checks the expected paths.

## Style

- Don't add comments, docstrings, or type annotations to code you didn't
  change unless the user asked for them.
- Don't create documentation files (READMEs, CHANGELOGs) unless the user
  asked for them.
- Don't use emojis in committed files unless the user asked for them.
