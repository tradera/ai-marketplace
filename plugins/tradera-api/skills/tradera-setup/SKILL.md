---
name: tradera-setup
description: >
  Guide the user through registering as a Tradera API developer and creating
  an application to get API credentials. Use when the user needs to set up
  a Tradera API account from scratch or create a new application.
allowed-tools: ["Bash"]
---

# Tradera API Setup

Guides the user through registering at the Tradera developer portal and creating an API application.

**Important:** This skill cannot create accounts or fill in registration forms on behalf of the user. It opens the right pages and tells the user what to do at each step.

## Workflow

### Step 1: Register as a developer

Open the developer registration portal:
```bash
URL="https://api.tradera.com/register"
if command -v xdg-open &>/dev/null; then xdg-open "$URL"
elif command -v open &>/dev/null; then open "$URL"
elif command -v wslview &>/dev/null; then wslview "$URL"
else echo "Please open this URL manually: $URL"
fi
```

Tell the user:
> **A browser window has opened to the Tradera developer registration page.**
> Please fill in the registration form and submit it. This creates your developer account which is separate from your regular Tradera account.
> Come back here when you're done.

Wait for the user to confirm they've registered.

### Step 2: Create an API application

Once registered, the user should be able to create an application in the developer portal. Tell them:

> Now you need to create an API application in the developer portal. Look for a "Create Application" or "New Application" option. You'll need to provide:
> - **Application name** — a descriptive name for your app
> - **Description** — what you'll use the API for
> - **Accept URL** and **Reject URL** — can be left empty for now (used for token login redirects)

Tell them to come back with their credentials once the application is created.

### Step 3: Collect and verify credentials

Ask the user for their three credentials:
1. **Application ID** (integer)
2. **App Key** (GUID)
3. **Public Key** (GUID)

Once provided, verify the credentials work by making a simple API call:

```bash
curl -s -w "\n%{http_code}" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  "https://api.tradera.com/v4/reference-data/time"
```

- **200**: Credentials are valid. Tell the user they're all set.
- **401/403**: Credentials are invalid. Ask the user to double-check them.

### Step 4: Present next steps

Once credentials are verified, recommend the user set environment variables so they don't need to pass credentials as arguments every time:

```
## Setup Complete!

Your Tradera API credentials are:
- **App ID:** {appId}
- **App Key:** {appKey}
- **Public Key:** {publicKey}

### Recommended: Set environment variables

Add these to your shell environment so all Tradera skills pick them up automatically. Claude Code runs non-interactive shells, so use the right file:
- **zsh:** `~/.zshenv` (not `~/.zshrc`)
- **bash:** `~/.profile` (not `~/.bashrc`)

  export TRADERA_APP_ID={appId}
  export TRADERA_APP_KEY={appKey}
  export TRADERA_PUBLIC_KEY={publicKey}

After getting a user token, also add:
  export TRADERA_USER_ID={userId}
  export TRADERA_USER_TOKEN={userToken}

### What you can do now:

**Look up items (app credentials only):**
  /tradera-get-item <itemId>

**Get a user token (needed for publishing/ending listings):**
  /tradera-user-token

**Publish a listing (needs user token):**
  /tradera-publish

**End a listing (needs user token):**
  /tradera-end-listing <itemId>

### Rate limits
The API allows 100 calls per 24 hours by default.
Contact apiadmin@tradera.com to request higher limits.
```
