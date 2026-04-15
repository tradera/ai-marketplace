---
name: tradera-setup
description: >
  Single entry point for setting up or diagnosing the Tradera plugin. Checks
  the environment (Node.js, MCP server, credentials) and either guides the
  user through whatever step is missing — including registering at the
  developer portal — or confirms they're ready. Use when the user first
  installs the plugin, when something isn't working, or when the user asks
  "is everything set up?" or "how do I get started with Tradera?".
allowed-tools: ["Bash"]
---

# Tradera Setup & Doctor

One skill that handles both onboarding ("I just installed this") and
diagnosis ("why doesn't it work?"). It runs a compact environment check, then
branches into whichever fix/guidance the user actually needs.

Do NOT print credential values at any point — only whether they're set.

## Phase 1: environment scan

Run these checks silently (don't narrate each one — only the conclusions).

### 1.1 OS

```bash
uname -s
```

`Darwin` = macOS, `Linux` = Linux, `MINGW*`/`MSYS*`/`CYGWIN*` = Windows
(git-bash/WSL).

### 1.2 Node.js 18+

```bash
command -v node && node -v
```

If `node` is missing, or its major version is below 18, **stop here** — the
MCP server won't start and the rest of the flow depends on it. Jump to the
"Install Node" section below and present platform-specific instructions.
Nothing else matters until this is fixed.

### 1.3 MCP server file

```bash
ls -1 "${CLAUDE_PLUGIN_ROOT:-plugins/tradera-api}/mcp/server.mjs"
```

If missing, the plugin installation is broken. Tell the user to reinstall
the plugin and stop.

### 1.4 MCP server starts

`timeout` isn't installed by default on macOS — use whichever variant is
available and fall back to no timeout if neither is (the server exits on
stdin close anyway). The full `initialize` + `tools/list` response is ~2 KB,
so no truncation is needed; grep directly for a known tool name.

```bash
if command -v timeout >/dev/null 2>&1; then TO="timeout 5"
elif command -v gtimeout >/dev/null 2>&1; then TO="gtimeout 5"
else TO=""
fi
PROBE=$(printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"setup","version":"0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' \
  | $TO node "${CLAUDE_PLUGIN_ROOT:-plugins/tradera-api}/mcp/server.mjs")
if printf '%s' "$PROBE" | grep -q tradera_publish_listing; then
  echo "MCP server: OK"
else
  echo "MCP server: FAILED"
  printf '%s\n' "$PROBE"
fi
```

A `FAILED` result with the raw output is enough to diagnose — it's usually
either a Node version bug or a corrupt install.

### 1.5 Credentials

Check each without printing values:

```bash
for v in TRADERA_APP_ID TRADERA_APP_KEY TRADERA_PUBLIC_KEY TRADERA_USER_ID TRADERA_USER_TOKEN; do
  if [ -n "$(printenv "$v" 2>/dev/null)" ]; then echo "$v: set"; else echo "$v: MISSING"; fi
done
```

Categorize:
- **App creds** = `TRADERA_APP_ID` + `TRADERA_APP_KEY` — required for any API use
- **Public key** = `TRADERA_PUBLIC_KEY` — used by `/tradera-user-token` browser flow
- **User creds** = `TRADERA_USER_ID` + `TRADERA_USER_TOKEN` — required for publish/end-listing

## Phase 2: decide what to do

Now branch based on what you found:

### Branch A — Node missing or too old

Show the appropriate install instructions (see "Install Node" below),
then stop. Nothing else can be fixed until Node is installed and Claude Code
is restarted.

### Branch B — No app credentials

The user might be brand-new, partway through signup, or just missing env
vars. Don't assume — ask, and skip any steps they've already done. Work
through the "Credential onboarding" decision tree below.

### Branch C — App credentials set but never verified (or user asks to re-verify)

Run the verification call. If it succeeds, move on to Branch D or E. If it
fails (401/403), tell the user to double-check the values and offer to run
`/tradera-setup` again after they fix them.

```bash
curl -s -w "\n%{http_code}" \
  -H "X-App-Id: $TRADERA_APP_ID" \
  -H "X-App-Key: $TRADERA_APP_KEY" \
  "https://api.tradera.com/v4/reference-data/time"
```

### Branch D — App creds OK, no user token

The user can look up items right now. Tell them that, and explain that
**publishing** or **ending** listings requires a user token, which they can
get by running `/tradera-user-token`. Do NOT auto-run it.

### Branch E — Everything good

Print a compact green report and a short "what you can do now" menu. Done.

## Phase 3: final report

After any branch above, finish with a concise health summary like:

```
## Tradera plugin health

✅ Node.js 22.12.0
✅ MCP server starts (6 tools)
✅ App credentials valid
⚠️  No user token — needed for publishing

### What you can do now

- Look up a listing:     /tradera-get-item <itemId>
- Get a user token:      /tradera-user-token
- Bulk-publish a CSV:    /tradera-publish-csv <file>   (needs user token)
```

Only include the "what you can do now" menu once everything required for at
least one use case is green. If only some things are green, include just the
skills that will work with the current state.

---

## Install Node

### macOS

Check whether Homebrew is present:

```bash
command -v brew
```

- **brew installed** → `brew install node` (or `brew upgrade node` if it's
  an old version). Then restart Claude Code.
- **brew not installed** → present TWO clearly-labeled options:

  **Option A — easiest, no dev tooling required.**
  Download the macOS installer from https://nodejs.org and double-click the
  `.pkg`. Follow the installer. Restart Claude Code.

  **Option B — install Homebrew first** (useful if the user plans to use
  other developer tools). Homebrew is a Mac package manager. One-time
  install (will ask for password, may install Xcode Command Line Tools —
  takes a few minutes):

  ```
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

  Then: `brew install node`. Restart Claude Code.

### Linux

```
# Debian/Ubuntu
sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs

# Arch
sudo pacman -S nodejs npm
```

If the distro package is older than Node 18, point to
https://nodejs.org/en/download/package-manager for NodeSource / nvm / etc.

### Windows

```
winget install OpenJS.NodeJS
```

Or download the installer from https://nodejs.org and run it.

---

## Credential onboarding

Used when Branch B fires (no app credentials). Don't assume the user is
starting from zero — they may already have some of this done. Ask at each
fork and skip the steps they don't need.

### B.1 — Do you already have credentials in hand?

Ask:

> Do you already have your Tradera API credentials (App ID, App Key, and
> Public Key) written down somewhere? If so, paste them here and I'll
> verify them and help you save them. If not, I'll walk you through
> getting them.

- **Yes, they have them** → jump to "Verify" below.
- **No** → go to B.2.

### B.2 — Do you already have a developer account?

Ask:

> Do you already have a Tradera developer account (an account at
> api.tradera.com, separate from your regular Tradera shopping account)?

- **No (or unsure)** → open the registration portal and wait for the user
  to finish signing up:

  ```bash
  URL="https://api.tradera.com/register"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v wslview >/dev/null 2>&1; then wslview "$URL"
  else echo "Please open this URL manually: $URL"
  fi
  ```

  > A browser window has opened to the Tradera developer registration page.
  > Fill in the form and submit it — this creates a developer account,
  > which is separate from your regular Tradera shopping account. Come
  > back here when you're done.

  When the user confirms, continue to B.3.

- **Yes** → open the developer portal so they can log in:

  ```bash
  URL="https://api.tradera.com/"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v wslview >/dev/null 2>&1; then wslview "$URL"
  else echo "Please open this URL manually: $URL"
  fi
  ```

  > I've opened the Tradera developer portal. Log in with your developer
  > account, then come back here.

  Continue to B.3.

### B.3 — Do you already have an API application?

Ask:

> Once you're logged in to the developer portal, do you already have an API
> application created? Look for a section called "My applications", "Your
> apps", or similar in the portal UI.

- **No** → tell the user how to create one:

  > In the developer portal, find the option to create a new application
  > (usually a "Create application" or "New app" button). You'll be asked
  > for:
  > - **Application name** — anything descriptive (e.g. "My Tradera
  >   automation")
  > - **Description** — what you'll use the API for
  > - **Accept URL** and **Reject URL** — can be left empty for now
  >   (they're only used by the user-token browser login)
  >
  > Submit the form, then open your new application's detail page. Let
  > me know when you're there.

  Continue to B.4.

- **Yes** → continue to B.4.

### B.4 — Read the credentials off the application page

Guide the user to find the three values:

> On your application's detail page in the developer portal, you should
> see three credentials:
> - **Application ID** — an integer
> - **App Key** — a GUID (long string with dashes), this one is a
>   **secret** — treat it like a password
> - **Public Key** — also a GUID, but not as sensitive
>
> Paste them here — one at a time is fine, or all three in one message.

Then jump to "Verify" below.

### Verify

Once the user has given you app ID, app key, and public key, verify them by
calling the reference-data endpoint. Do NOT echo the app key back to the
user.

```bash
curl -s -w "\n%{http_code}" \
  -H "X-App-Id: {appId}" \
  -H "X-App-Key: {appKey}" \
  "https://api.tradera.com/v4/reference-data/time"
```

- **200** → credentials valid, continue to "Persist".
- **401/403** → credentials invalid. Ask the user to re-check them on the
  application's detail page (typos in the GUID are common, especially
  copy-paste from PDFs).

### Persist

Claude Code runs non-interactive shells, so `~/.zshrc` / `~/.bashrc` are
NOT sourced. Use the right file for the user's shell:

- **zsh:** `~/.zshenv`
- **bash:** `~/.profile`

Tell the user exactly what to add (substitute their actual values):

```
export TRADERA_APP_ID=<appId>
export TRADERA_APP_KEY=<appKey>
export TRADERA_PUBLIC_KEY=<publicKey>
```

Once they later run `/tradera-user-token`, they'll also add:

```
export TRADERA_USER_ID=<userId>
export TRADERA_USER_TOKEN=<userToken>
```

Then tell them to restart Claude Code so the MCP server picks them up.

## What NOT to do

- Never `cat`, `echo`, or otherwise print credential values that are already
  set in the environment.
- Never auto-run `brew install`, a `.pkg` installer, or `winget install` —
  always let the user decide.
- Never report a check as green if it failed.
- Don't run `/tradera-user-token` yourself — tell the user what to do; let
  them invoke it.
