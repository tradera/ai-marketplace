---
name: tradera-end-listing
description: >
  End an active listing on Tradera using the REST API (v4).
  Use when the user wants to take down, remove, or end a Tradera listing.
argument-hint: "<itemId> [appId] [appKey] [userId] [userToken]"
allowed-tools: ["Bash"]
---

# Tradera End Listing

Ends an active listing on Tradera via `DELETE /v4/listings/items/{itemId}`.

## Credentials

This skill needs **appId**, **appKey**, **userId**, and **userToken**. They can be provided via environment variables (recommended) or as arguments.

**Environment variables (recommended):**
- `TRADERA_APP_ID` — Tradera API application ID
- `TRADERA_APP_KEY` — Tradera API application key
- `TRADERA_USER_ID` — Tradera user ID
- `TRADERA_USER_TOKEN` — Tradera user authentication token

**As arguments:** `/tradera-end-listing <itemId> <appId> <appKey> <userId> <userToken>`

## Resolving Credentials

Before making any API calls, resolve credentials in this order:

1. Check if env vars are set: `[ -n "$TRADERA_APP_ID" ] && [ -n "$TRADERA_APP_KEY" ] && [ -n "$TRADERA_USER_ID" ] && [ -n "$TRADERA_USER_TOKEN" ]` (do NOT echo secrets)
2. If all four are set, use them directly in curl headers — the user only needs to provide `<itemId>`
3. If not set, parse them from the arguments
4. If still missing, tell the user to either set env vars or provide them as arguments

## Workflow

### Step 1: Confirm with the user

Before ending, fetch the item details to show what will be ended:

```bash
curl -s -w "\n%{http_code}" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  "https://api.tradera.com/v4/items/{itemId}"
```

Show the item title and ask the user to confirm.

### Step 2: End the listing

```bash
curl -s -w "\n%{http_code}" \
  -X DELETE \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  -H "X-User-Id: {userId}" \
  -H "X-User-Token: {userToken}" \
  "https://api.tradera.com/v4/listings/items/{itemId}"
```

### Step 3: Confirm result

- **200**: Listing ended successfully. Tell the user.
- **400**: Bad request — item may already be ended or have bids.
- **401/403**: Invalid credentials.
- **404**: Item not found or doesn't belong to the user.
