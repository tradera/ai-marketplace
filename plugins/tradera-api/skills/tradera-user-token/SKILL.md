---
name: tradera-user-token
description: >
  Obtain a Tradera user token by opening a browser login flow and polling for
  the resulting token. Use when the user needs to authenticate with Tradera to
  get a user token for API operations like publishing or deleting listings.
argument-hint: "[appId] [appKey] [publicKey] [userId]"
allowed-tools: ["Bash"]
---

# Tradera User Token

Obtains a user token through Tradera's token-login browser flow.

## Credentials

This skill needs **appId**, **appKey**, **publicKey**, and **userId**. They can be provided via environment variables (recommended) or as arguments.

**Environment variables (recommended):**
- `TRADERA_APP_ID` — Tradera API application ID
- `TRADERA_APP_KEY` — Tradera API application key (secret — used for FetchToken call)
- `TRADERA_PUBLIC_KEY` — Tradera API public key (less sensitive — used in browser login URL)
- `TRADERA_USER_ID` — Tradera user ID

**As arguments:** `/tradera-user-token <appId> <appKey> <publicKey> <userId>`

Each Tradera API application has three credentials: Application ID, App Key, and Public Key. The public key is safe to expose in browser URLs.

## Resolving Credentials

Before making any API calls, resolve credentials in this order:

1. Check if env vars are set: `[ -n "$TRADERA_APP_ID" ] && [ -n "$TRADERA_APP_KEY" ] && [ -n "$TRADERA_PUBLIC_KEY" ] && [ -n "$TRADERA_USER_ID" ]` (do NOT echo secrets)
2. If all four are set, use them directly in curl headers / URL — no arguments needed
3. If not set, parse them from the arguments
4. If still missing, tell the user to either set env vars or provide them as arguments

## Workflow

### Step 1: Generate a secret key

Generate a random UUID to use as the session secret:

```bash
SKEY=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Secret key: $SKEY"
```

The `skey` is a single-use session secret used to fetch the token after login.

### Step 2: Open browser for login

Open the Tradera token-login page in the user's browser. The `pkey` parameter is the application's public key (NOT the app key):

```bash
URL="https://api.tradera.com/token-login?appId={appId}&pkey={publicKey}&skey=$SKEY"
if command -v xdg-open &>/dev/null; then xdg-open "$URL"
elif command -v open &>/dev/null; then open "$URL"
elif command -v wslview &>/dev/null; then wslview "$URL"
else echo "Please open this URL manually: $URL"
fi
```

Tell the user:
> **A browser window has opened.** Please log in to Tradera and authorize the application. Come back here and tell me when you're done.

### Step 3: Wait for user confirmation

Wait until the user confirms they have completed the login in the browser. Do NOT poll before they confirm.

### Step 4: Fetch the token

Once the user confirms, call the FetchToken endpoint:

```bash
curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  -d "{\"userId\": {userId}, \"secretKey\": \"$SKEY\"}" \
  "https://api.tradera.com/v4/auth/token"
```

### Step 5: Present the token

The response contains:
- `authToken` — the user token string
- `hardExpirationTime` — when the token expires (ISO 8601 datetime)

If a userId is returned (from SOAP), include that too.

Present to the user:

```
## Tradera User Token

**User ID:** {userId}
**Token:** {authToken}
**Expires:** {hardExpirationTime}

You can now use these credentials with other Tradera skills:
  /tradera-publish {appId} {appKey} {userId} {authToken}
  /tradera-delete <itemId> {appId} {appKey} {userId} {authToken}
```

**Important:** Tell the user to store the token securely. It grants API access to their account until it expires.

## Error Handling

- **401/403**: The secret key session may have expired or the user didn't complete authorization. Ask them to try again.
- **400**: Bad request — the secret key may be invalid or already used.
- **Token not ready**: If the user says they authorized but FetchToken fails, wait a moment and retry once. The authorization may take a few seconds to propagate.
