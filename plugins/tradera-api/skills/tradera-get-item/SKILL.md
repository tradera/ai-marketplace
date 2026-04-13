---
name: tradera-get-item
description: >
  Fetch and display details about a Tradera listing using the public REST API (v4).
  Use when the user wants to look up an item on Tradera by its item ID.
argument-hint: "<itemId> [appId] [appKey]"
allowed-tools: ["Bash"]
---

# Tradera Item Lookup

Fetches item details from `GET https://api.tradera.com/v4/items/{itemId}` and presents a formatted summary.

## Credentials

This skill needs **appId** and **appKey**. They can be provided via environment variables (recommended) or as arguments.

**Environment variables (recommended):**
- `TRADERA_APP_ID` — Tradera API application ID
- `TRADERA_APP_KEY` — Tradera API application key

**As arguments:** `/tradera-get-item <itemId> <appId> <appKey>`

## Resolving Credentials

Before making any API calls, resolve credentials in this order:

1. Check if env vars are set: `[ -n "$TRADERA_APP_ID" ] && [ -n "$TRADERA_APP_KEY" ]` (do NOT echo secrets)
2. If both are set, use them directly in curl headers — the user only needs to provide `<itemId>`
3. If not set, parse appId and appKey from the arguments
4. If still missing, tell the user to either set env vars or provide them as arguments

## Workflow

1. **Parse arguments** from the user input into `itemId`, `appId`, and `appKey`.

2. **Fetch the item** by running:

```bash
curl -s -w "\n%{http_code}" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  "https://api.tradera.com/v4/items/{itemId}"
```

3. **Check for errors**:
   - If the HTTP status is not 200, report the error to the user (e.g. 404 = item not found, 401/403 = invalid credentials).

4. **Parse the JSON** and present a formatted summary with these sections:

### Output Format

```
## {shortDescription}

**Status:** {status} | **Type:** {itemType mapped to name}
**Category ID:** {categoryId}
**Listed:** {startDate} → {endDate}

### Pricing
- Current highest bid: {maxBid} SEK ({totalBids} bids)
- Opening bid: {openingBid} SEK
- Buy It Now: {buyItNowPrice} SEK (if buyItNowPriceSpecified)
- Reserve price: {reached/not reached/not set}

### Seller
- {seller.alias} (ID: {seller.userId})

### Shipping & Payment
- Pickup: {yes/no based on acceptsPickup}
- Payment: {paymentCondition}
- Shipping: {shippingCondition}
- Options: {list shippingOptions if present}

### Images
{list first 3 imageLinks}

**Link:** {itemLink}
```

### Item Type Mapping
- 1 = Auction (may also have a Buy It Now price — check `buyItNowPriceSpecified`)
- 3 = Fixed Price (Endast Köp Nu / Buy Now Only)
- 4 = Shop Item

Omit sections where data is absent or fields are marked as unspecified (e.g. skip "Buy It Now" if `buyItNowPriceSpecified` is false). Keep the output concise.
