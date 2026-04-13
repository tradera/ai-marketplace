---
name: tradera-publish
description: >
  Publish an item for sale on Tradera using the REST API (v4). Walks through
  creating a listing with title, description, pricing, category, shipping, and
  optional images. Use when the user wants to list/sell an item on Tradera.
argument-hint: "[appId] [appKey] [userId] [userToken]"
allowed-tools: ["Bash", "Read"]
---

# Tradera Publish Item

Publishes a new item listing on Tradera via the v4 REST API.

## Credentials

This skill needs **appId**, **appKey**, **userId**, and **userToken**. They can be provided via environment variables (recommended) or as arguments.

**Environment variables (recommended):**
- `TRADERA_APP_ID` — Tradera API application ID
- `TRADERA_APP_KEY` — Tradera API application key
- `TRADERA_USER_ID` — Tradera user ID
- `TRADERA_USER_TOKEN` — Tradera user authentication token

**As arguments:** `/tradera-publish <appId> <appKey> <userId> <userToken>`

## Resolving Credentials

Before making any API calls, resolve credentials in this order:

1. Check if env vars are set: `[ -n "$TRADERA_APP_ID" ] && [ -n "$TRADERA_APP_KEY" ] && [ -n "$TRADERA_USER_ID" ] && [ -n "$TRADERA_USER_TOKEN" ]` (do NOT echo secrets)
2. If all four are set, use them directly in curl headers — no arguments needed
3. If not set, parse them from the arguments
4. If still missing, tell the user to either set env vars or provide them as arguments

## Workflow

### Step 1: Gather listing details from the user

Ask the user for the following (use AskUserQuestion or plain questions). Collect all info before making any API calls:

**Required:**
- **Title** — short description / listing title (string)
- **Description** — full item description (string, can contain HTML like `<br>`)
- **Category ID** — Tradera category ID (integer). If the user doesn't know it, help them by suggesting they check tradera.com or provide a keyword to search for.
- **Start price** — opening bid in SEK (integer)
- **Duration** — listing duration in days (integer, typically 1-10)

**Optional (ask about these):**
- **Buy It Now price** — fixed price in SEK (integer, 0 or omit if not wanted). To make an auction with Buy It Now, use itemType 1 and set a buyItNowPrice.
- **Reserve price** — minimum acceptable price in SEK (integer, 0 or omit if not wanted)
- **Item type** — 1=Auction (default), 3=Fixed Price (Buy Now Only), 4=Shop Item. There is NO separate "Auction with Buy It Now" type — use type 1 with a buyItNowPrice set.
- **Shipping options** — list of shipping provider/cost pairs
- **Accepts pickup** — whether local pickup is available (use shippingOptionId 8 for Pickup)
- **Buyer region** — acceptedBidderId: 1=Within Sweden (default), 3=International, 4=Within EU. **This field is REQUIRED.**
- **Images** — local file paths to images to upload
- **Condition attribute** — e.g. attribute ID 2 = Used (Begagnad), 1 = New (Ny)

### Step 2: Create the listing request

Build the JSON body and POST it:

```bash
curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  -H "X-User-Id: {userId}" \
  -H "X-User-Token: {userToken}" \
  -d '{json_body}' \
  "https://api.tradera.com/v4/listings/items"
```

**JSON body structure (`ItemRequest`):**
```json
{
  "title": "Item title",
  "description": "Full HTML description",
  "categoryId": 12345,
  "startPrice": 100,
  "duration": 7,
  "restarts": 0,
  "itemType": 1,
  "buyItNowPrice": 100,
  "acceptedBidderId": 1,
  "autoCommit": false,
  "shippingOptions": [
    {
      "shippingOptionId": 12,
      "cost": 42,
      "shippingWeight": 1.0,
      "shippingWeightSpecified": true
    }
  ],
  "paymentOptionIds": [],
  "itemAttributes": [],
  "attributeValues": {
    "terms": [],
    "numbers": []
  },
  "shippingCondition": "",
  "paymentCondition": ""
}
```

**Field notes:**
- `itemType`: 1=Auction, 3=Fixed Price (Buy Now Only), 4=Shop Item. No type 5 — for "Auction with Buy It Now", use type 1 with a `buyItNowPrice`.
- `acceptedBidderId`: **REQUIRED**. 1=Within Sweden, 3=International, 4=Within EU. Default to 1 if not specified.
- `duration`: number of days the listing runs
- `startPrice`, `buyItNowPrice`, `reservePrice`: integers in SEK
- `autoCommit`: set to `false` so we can add images before committing. Set to `true` if no images needed and user wants immediate publish.
- `shippingOptions`: use EITHER `shippingOptionId` OR `shippingProviderId`, NOT both. Use `shippingOptionId`.
- Only include `buyItNowPrice` and `reservePrice` if the user wants them (non-zero)

**Shipping option IDs (shippingOptionId):**
- 1 = Posten (Swedish postal service)
- 2 = DHL
- 6 = Other (Annat fraktsätt)
- 7 = Schenker
- 8 = Pickup (Avhämtning)
- 12 = PostNord Parcel (PostNord Paket)
- 13 = PostNord Stamp (PostNord Frimärke)
- 20 = DHL Express

**Payment option IDs (paymentOptionIds):**
- 4 = Bank transfer (Banköverföring)
- 8 = PlusGiro / Bankgiro
- 16 = Cash on delivery (Postförskott)
- 32 = Cash (Kontant)
- 4096 = Swish
- 16384 = Swish / Card / PayPal

**Response:** `QueuedRequestResponse` with `requestId` and `itemId`.

Check the HTTP status. If not 200, report the error.

### Step 3: Upload images (if provided)

For each image file the user provided, base64-encode it and POST:

```bash
IMAGE_B64=$(base64 < "{image_path}" | tr -d '\n')
curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  -H "X-User-Id: {userId}" \
  -H "X-User-Token: {userToken}" \
  -d "{\"imageData\": \"$IMAGE_B64\", \"imageFormat\": 0, \"hasMega\": true}" \
  "https://api.tradera.com/v4/listings/items/{requestId}/images"
```

- `imageFormat`: 0=JPEG, 1=GIF, 2=PNG
- Detect format from file extension
- Upload images one at a time

### Step 4: Commit the listing

```bash
curl -s -w "\n%{http_code}" \
  -X POST \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  -H "X-User-Id: {userId}" \
  -H "X-User-Token: {userToken}" \
  "https://api.tradera.com/v4/listings/items/{requestId}/commit"
```

### Step 5: Confirm to the user

Present a summary:
```
## Listing Published

**Title:** {title}
**Item ID:** {itemId}
**Type:** {itemType name}
**Start Price:** {startPrice} SEK
**Duration:** {duration} days
**Images:** {count} uploaded
**Link:** https://www.tradera.com/item/{categoryId}/{itemId}
```

## Error Handling

- **401/403**: Invalid or expired credentials — tell the user to check their app key and user token.
- **400**: Bad request — show the response body, it usually contains field-level validation errors.
- **404**: Endpoint not found — check the URL.
- **500**: Server error — suggest retrying.

If the create request (step 2) fails, do NOT proceed to image upload or commit.
If an image upload fails, warn the user but continue with remaining images and still commit.
If commit fails, tell the user the requestId so they can retry manually.
