---
name: tradera-category
description: >
  Look up Tradera categories. Works in both directions: pass a category ID to
  get its full path (e.g. 344481 → "Övrigt > Testauktioner > Endast för
  Tradera"), or pass a search term to find matching categories with their IDs
  and paths. Use when the user needs to find the right categoryId for a listing,
  or wants to know what a categoryId maps to.
argument-hint: "<categoryId | search term>"
allowed-tools: ["mcp__tradera__tradera_find_category"]
---

# Tradera Category Lookup

Bidirectional category lookup using the `tradera_find_category` MCP tool.

## Usage

The user will provide either:
- A **number** (category ID) — look up its name and breadcrumb path.
- A **string** (search term) — find all categories whose name contains it.

## Workflow

### If the argument looks like an integer

Call the MCP tool with `categoryId`:

```
mcp__tradera__tradera_find_category({ categoryId: <the number> })
```

Present the result:

```
## Category 344481

**Path:** Övrigt > Testauktioner > Endast för Tradera
```

If the ID isn't found, say so and suggest searching by name instead.

### If the argument is a string (or not a number)

Call the MCP tool with `query`:

```
mcp__tradera__tradera_find_category({ query: "<the string>" })
```

Present the results as a table:

```
## Categories matching "Testauktioner"

| ID     | Name              | Full path                                      |
|--------|-------------------|-------------------------------------------------|
| 344480 | Testauktioner     | Övrigt > Testauktioner                          |
| 344481 | Endast för Tradera| Övrigt > Testauktioner > Endast för Tradera     |
```

If no matches are found, suggest trying a broader or different search term.

## Notes

- The category tree is cached in the MCP server for the session, so repeat
  lookups are fast.
- Category names are in Swedish. If the user searches in English, suggest the
  Swedish equivalent (e.g. "Electronics" → try "Elektronik").
