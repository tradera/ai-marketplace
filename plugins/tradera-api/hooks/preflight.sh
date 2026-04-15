#!/bin/sh
# Tradera plugin preflight.
#
# Runs at session start. Only speaks up when something's wrong — silent on the
# happy path. Emits SessionStart.additionalContext JSON when it has advice, so
# Claude sees the guidance and can relay it to the user.
#
# Checks:
#   1. Node.js is on PATH
#   2. Node.js is >= 18

set -eu

uname_s=$(uname -s 2>/dev/null || echo unknown)
case "$uname_s" in
  Darwin) os=macos ;;
  Linux)  os=linux ;;
  MINGW*|MSYS*|CYGWIN*) os=windows ;;
  *)      os=unknown ;;
esac

# Build the message as multi-line text, then JSON-encode at emit time.
msg=""

if ! command -v node >/dev/null 2>&1; then
  case "$os" in
    macos)
      if command -v brew >/dev/null 2>&1; then
        msg="The Tradera plugin needs Node.js 18 or newer, but \`node\` isn't on PATH.
You already have Homebrew installed, so run:

    brew install node

Then restart Claude Code."
      else
        msg="The Tradera plugin needs Node.js 18 or newer, but \`node\` isn't on PATH.

Two ways to install it on macOS:

  1. Easiest (recommended for non-developers) — download the macOS installer
     from https://nodejs.org and double-click the downloaded .pkg file.

  2. Via Homebrew — good if you plan to install other developer tools. First
     install Homebrew (one-time):

         /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"

     Then:

         brew install node

Either way, restart Claude Code once Node is installed."
      fi
      ;;
    linux)
      msg="The Tradera plugin needs Node.js 18 or newer, but \`node\` isn't on PATH.
Install it via your distro's package manager (apt, dnf, pacman) or see:
https://nodejs.org/en/download/package-manager
Then restart Claude Code."
      ;;
    windows)
      msg="The Tradera plugin needs Node.js 18 or newer, but \`node\` isn't on PATH.

Install via winget (open PowerShell):

    winget install OpenJS.NodeJS

Or download the installer from https://nodejs.org and run it.
Restart Claude Code once Node is installed."
      ;;
    *)
      msg="The Tradera plugin needs Node.js 18 or newer on PATH. See https://nodejs.org"
      ;;
  esac
else
  node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "${node_major:-0}" -lt 18 ] 2>/dev/null; then
    node_version=$(node -v 2>/dev/null || echo unknown)
    msg="The Tradera plugin requires Node.js 18 or newer, but Node ${node_version} is installed.
Upgrade via your package manager (\`brew upgrade node\` on macOS with Homebrew,
\`winget upgrade OpenJS.NodeJS\` on Windows) or download the latest from
https://nodejs.org — then restart Claude Code."
  fi
fi

if [ -z "$msg" ]; then
  exit 0
fi

# JSON-encode: escape backslashes and quotes, then turn real newlines into
# literal \n. Sed-only (no awk) — awk's printf interprets \n as a real newline
# on POSIX-strict implementations (gawk, bsd-awk), which would produce invalid
# JSON with raw newlines inside the string.
escaped=$(
  printf '%s' "$msg" \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
    | sed -e ':a' -e 'N' -e '$!ba' -e 's/\n/\\n/g'
)
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
exit 0
