---
name: tradera-publish-csv
description: >
  Publish a batch of Tradera listings from a CSV file. Use when the user wants
  to bulk-publish multiple items ("publish everything in this csv", "list all
  these items on Tradera"). Reads the CSV, maps columns to listing fields,
  dry-runs for confirmation, then calls the Tradera MCP server to publish.
argument-hint: "<path-to-csv>"
allowed-tools: ["Read", "mcp__tradera__tradera_publish_listing", "mcp__tradera__tradera_commit_listing", "mcp__tradera__tradera_get_item", "mcp__tradera__tradera_find_category"]
---

# Tradera Bulk Publish from CSV

Publishes many Tradera listings in one go by reading a CSV and calling the
`tradera` MCP server for each row. Designed for non-developers who want to hand
Claude a spreadsheet and say "publish all of these".

## Prerequisites

The `tradera` MCP server must be configured and running (it ships with this
plugin — `plugins/tradera-api/mcp.json`). It requires these env vars to be set:

- `TRADERA_APP_ID`, `TRADERA_APP_KEY`
- `TRADERA_USER_ID`, `TRADERA_USER_TOKEN`

If the MCP tools aren't available, tell the user to run `/tradera-setup` and
`/tradera-user-token` first, then restart Claude Code.

## Expected CSV columns

**Required per row:**

| Column | Type | Notes |
|---|---|---|
| `title` | string | Listing title |
| `description` | string | Full description (may contain `<br>`) |
| `categoryId` | integer | Tradera category ID |
| `startPrice` | integer | Opening bid in SEK |
| `duration` | integer | Days, typically 1–10 |

**Optional:**

| Column | Type | Default | Notes |
|---|---|---|---|
| `itemType` | integer | `1` | 1=Auction, 3=Fixed Price, 4=Shop Item |
| `buyItNowPrice` | integer | — | Omit or 0 for none |
| `reservePrice` | integer | — | Omit or 0 for none |
| `acceptedBidderId` | integer | `1` | 1=Sweden, 3=International, 4=EU |
| `shippingOptionId` | integer | — | See main publish skill for IDs |
| `shippingCost` | integer | — | SEK |
| `images` | string | — | Semicolon-separated local file paths |

Extra columns are ignored. Accept reasonable header casing (`Title`, `title`,
`TITLE` should all work).

## Workflow

### Step 1: Read and parse the CSV

Use the `Read` tool to load the file. Parse it yourself (handle quoted values
and commas-in-strings — do not assume a naive split). Report row count back to
the user.

### Step 2: Validate

For every row, check the required columns are present and well-typed. If any
row is invalid, stop and show the user a table of problems — do not publish a
partial batch silently.

### Step 3: Dry-run summary

Before publishing, resolve each unique `categoryId` in the batch to its name
and breadcrumb path by calling `tradera_find_category({ categoryId })`. This
lets the user verify the categories are correct before any listings go live.

Show a table that includes the category:

```
Row | Title            | Category                                  | Price   | Duration | Images
1   | Red wool sweater | Kläder > Damkläder > Tröjor (34521)      | 50 SEK  | 7 days   | 2
2   | Vintage lamp     | Hem & Inredning > Belysning (18432)      | 200 SEK | 10 days  | 0
...
```

Ask the user to confirm. Do **not** publish without explicit confirmation.

### Step 4: Publish each row

For each row, call the MCP tool. Build the `listing` object from the CSV row:

```
mcp__tradera__tradera_publish_listing({
  listing: {
    title, description, categoryId, startPrice, duration,
    itemType: itemType ?? 1,
    acceptedBidderId: acceptedBidderId ?? 1,
    buyItNowPrice,          // only if > 0
    reservePrice,           // only if > 0
    shippingOptions: shippingOptionId ? [{
      shippingOptionId,
      cost: shippingCost ?? 0,
      shippingWeight: 1.0,
      shippingWeightSpecified: true
    }] : [],
    autoCommit: false,
    paymentOptionIds: [],
    itemAttributes: [],
    attributeValues: { terms: [], numbers: [] }
  },
  images: imagesField ? imagesField.split(';').map(s => s.trim()).filter(Boolean) : []
})
```

Keep a running log: row number, itemId (on success), or error message.

### Step 5: Report

Print a final table:

```
## Published 8 of 10 listings

Row | Status    | Item ID    | Link
1   | published | 12345678   | https://www.tradera.com/item/...
2   | FAILED    | —          | Error: Invalid categoryId
...
```

If any row failed, keep the successful ones published (they're already live)
and offer to retry the failures.

## Error handling

The `tradera_publish_listing` tool distinguishes **create** failures from
**commit** failures. This matters a lot for retries:

- If the tool **throws** (MCP response has `isError: true`), the create step
  failed. Nothing exists on Tradera yet — safe to retry the whole row.
- If the tool **returns** a result object with `ok: false` and a `requestId`,
  the listing was created but commit failed. **Do NOT re-call
  `tradera_publish_listing`** — that would create a duplicate. Instead, retry
  the commit alone with `tradera_commit_listing({ requestId })`. The result's
  `recoveryHint` field spells this out.

Specific cases:

- **Missing credentials (401/403)**: Stop the whole batch. Tell the user to
  re-run `/tradera-user-token`.
- **Per-row validation error (400) on create**: Log it, skip that row,
  continue.
- **Rate limit (429) / 5xx on create**: Retry the current row once, then skip
  if still failing.
- **Commit failed (`commit.ok === false` in the result)**: Check
  `commit.retryable`. If `true`, call `tradera_commit_listing({ requestId })`
  up to 2 more times with a short pause. If `false` (e.g. 400 Bad Request),
  do **not** retry — record the `requestId` and the error in the final report
  so the user can investigate manually. In either case, do **not** re-call
  `tradera_publish_listing` for that row.

## Safety

- Always dry-run before publishing. Never skip step 3.
- If the batch has more than 20 rows, explicitly warn the user about the
  Tradera rate limit (100 calls / 24h — each listing uses 2+ calls).
- On any ambiguity in the CSV (missing required field, unparseable number),
  abort before publishing anything.
