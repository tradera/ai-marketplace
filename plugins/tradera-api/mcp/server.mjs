#!/usr/bin/env node
// Tradera MCP server.
//
// Exposes the Tradera v4 REST API as MCP tools so Claude (or any MCP client)
// can call them directly instead of re-deriving HTTP requests each turn.
//
// Transport: stdio, newline-delimited JSON-RPC 2.0 (MCP spec 2024-11-05).
// Zero runtime dependencies — uses Node 18+ built-in fetch and readline.

import { createInterface } from "node:readline";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const SERVER_NAME = "tradera-api";
const SERVER_VERSION = "0.1.0";
const PROTOCOL_VERSION = "2024-11-05";
const API_BASE = process.env.TRADERA_API_BASE || "https://api.tradera.com/v4";

// ---------- credential helpers ---------------------------------------------

function appHeaders() {
  const appId = process.env.TRADERA_APP_ID;
  const appKey = process.env.TRADERA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error(
      "TRADERA_APP_ID and TRADERA_APP_KEY must be set in the environment."
    );
  }
  return { "X-App-Id": appId, "X-App-Key": appKey };
}

function userHeaders() {
  const userId = process.env.TRADERA_USER_ID;
  const userToken = process.env.TRADERA_USER_TOKEN;
  if (!userId || !userToken) {
    throw new Error(
      "TRADERA_USER_ID and TRADERA_USER_TOKEN must be set for write operations."
    );
  }
  return {
    ...appHeaders(),
    "X-User-Id": userId,
    "X-User-Token": userToken,
  };
}

// ---------- HTTP helper -----------------------------------------------------

async function request(method, path, { headers = {}, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const err = new Error(
      `Tradera API ${method} ${path} failed: ${res.status} ${res.statusText}`
    );
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

// ---------- tool implementations -------------------------------------------

const IMAGE_FORMATS = { ".jpg": 0, ".jpeg": 0, ".gif": 1, ".png": 2 };

async function getItem({ itemId }) {
  return request("GET", `/items/${itemId}`, { headers: appHeaders() });
}

async function createListingRequest({ listing }) {
  // `listing` is an ItemRequest body; we pass through so callers can use the
  // full API surface. Required: title, description, categoryId, startPrice,
  // duration, itemType, acceptedBidderId.
  return request("POST", "/listings/items", {
    headers: userHeaders(),
    body: listing,
  });
}

async function uploadListingImage({ requestId, imagePath }) {
  const ext = extname(imagePath).toLowerCase();
  const imageFormat = IMAGE_FORMATS[ext];
  if (imageFormat === undefined) {
    throw new Error(
      `Unsupported image extension "${ext}". Use .jpg, .jpeg, .gif, or .png.`
    );
  }
  const buf = await readFile(imagePath);
  return request("POST", `/listings/items/${requestId}/images`, {
    headers: userHeaders(),
    body: {
      imageData: buf.toString("base64"),
      imageFormat,
      hasMega: true,
    },
  });
}

async function commitListing({ requestId }) {
  return request("POST", `/listings/items/${requestId}/commit`, {
    headers: userHeaders(),
  });
}

async function endListing({ itemId }) {
  return request("DELETE", `/listings/items/${itemId}`, {
    headers: userHeaders(),
  });
}

// High-level convenience tool — the one a CSV-bulk workflow actually wants.
//
// Failure semantics are important for bulk callers: the `create` call is the
// only step that can fail safely-retriable-as-a-whole-row. Once the request is
// created on Tradera's side, retrying the whole publishListing would create a
// duplicate. So once we have a requestId, we never throw from this function —
// we return a structured result whose shape tells the caller exactly which
// stage failed and how to recover (e.g. call tradera_commit_listing with the
// returned requestId instead of re-calling publishListing).
async function publishListing({ listing, images, dryRun = false }) {
  // Fail-fast validation for the two positional inputs. These checks run
  // BEFORE the create step so any thrown TypeError here does NOT violate the
  // invariant that publishListing never throws once a requestId exists.
  if (!listing || typeof listing !== "object" || Array.isArray(listing)) {
    throw new Error(
      "publishListing: `listing` must be an object matching the ItemRequest schema."
    );
  }
  // Destructuring defaults only apply to `undefined`, not `null`. A caller
  // passing `images: null` would otherwise blow up on `for...of null` AFTER
  // the create step — breaking the invariant. Coerce explicitly.
  const imageList = Array.isArray(images) ? images : [];

  if (dryRun) {
    return {
      dryRun: true,
      wouldPublish: { listing, imageCount: imageList.length },
    };
  }
  // Create step — safe to let this throw. Nothing exists on Tradera's side
  // yet, so the caller can retry the whole row.
  const created = await createListingRequest({
    listing: { ...listing, autoCommit: false },
  });
  const requestId = created.requestId;

  const imageResults = [];
  for (const imagePath of imageList) {
    try {
      imageResults.push({
        imagePath,
        ok: true,
        result: await uploadListingImage({ requestId, imagePath }),
      });
    } catch (err) {
      imageResults.push({ imagePath, ok: false, error: String(err.message) });
    }
  }

  // Commit step — retry transient failures internally, then fall back to
  // returning a structured error so the caller can retry the commit alone.
  const commit = await commitWithRetry(requestId);

  return {
    ok: commit.ok,
    requestId,
    itemId: created.itemId,
    images: imageResults,
    commit,
    link:
      commit.ok && created.itemId
        ? `https://www.tradera.com/item/${listing.categoryId}/${created.itemId}`
        : undefined,
    recoveryHint: commit.ok
      ? undefined
      : commit.retryable
      ? "Listing was created but commit failed transiently. Retry with " +
        `tradera_commit_listing({ requestId: ${requestId} }) — do NOT call ` +
        "tradera_publish_listing again (that would create a duplicate)."
      : "Listing was created but commit failed with a non-retryable error " +
        "(e.g. 400). Inspect the error/body and either fix the listing data " +
        `or end the pending request. Do NOT retry — requestId: ${requestId}.`,
  };
}

function isTransient(err) {
  // 429, 5xx, or no status (network/parse error) are worth retrying.
  // Other 4xx won't get better by retrying.
  return (
    err?.status === 429 ||
    (err?.status >= 500 && err?.status < 600) ||
    !err?.status
  );
}

async function commitWithRetry(requestId, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await commitListing({ requestId });
      return { ok: true, result };
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  return {
    ok: false,
    retryable: isTransient(lastErr),
    status: lastErr?.status,
    error: String(lastErr?.message ?? lastErr),
    body: lastErr?.body,
  };
}

// ---------- tool registry ---------------------------------------------------

const TOOLS = [
  {
    name: "tradera_get_item",
    description:
      "Fetch a Tradera listing by itemId. Read-only; requires only app credentials.",
    inputSchema: {
      type: "object",
      properties: { itemId: { type: "integer", description: "Tradera item ID" } },
      required: ["itemId"],
    },
    handler: getItem,
  },
  {
    name: "tradera_publish_listing",
    description:
      "Create a listing, upload images, and commit in one call. This is the " +
      "preferred tool for bulk workflows (e.g. publishing rows from a CSV). " +
      "Set dryRun=true to validate without publishing.",
    inputSchema: {
      type: "object",
      properties: {
        listing: {
          type: "object",
          description:
            "Tradera ItemRequest body. Required: title, description, " +
            "categoryId, startPrice, duration, itemType, acceptedBidderId.",
        },
        images: {
          type: "array",
          items: { type: "string" },
          description: "Local filesystem paths to images (.jpg/.png/.gif).",
        },
        dryRun: { type: "boolean", default: false },
      },
      required: ["listing"],
    },
    handler: publishListing,
  },
  {
    name: "tradera_create_listing_request",
    description:
      "Low-level: POST /listings/items. Creates a pending listing request. " +
      "Use tradera_publish_listing instead unless you need fine-grained control.",
    inputSchema: {
      type: "object",
      properties: { listing: { type: "object" } },
      required: ["listing"],
    },
    handler: createListingRequest,
  },
  {
    name: "tradera_upload_listing_image",
    description:
      "Low-level: upload one image to a pending listing request (by requestId).",
    inputSchema: {
      type: "object",
      properties: {
        requestId: { type: "integer" },
        imagePath: { type: "string" },
      },
      required: ["requestId", "imagePath"],
    },
    handler: uploadListingImage,
  },
  {
    name: "tradera_commit_listing",
    description:
      "Low-level: commit a pending listing request so it goes live.",
    inputSchema: {
      type: "object",
      properties: { requestId: { type: "integer" } },
      required: ["requestId"],
    },
    handler: commitListing,
  },
  {
    name: "tradera_end_listing",
    description: "End an active Tradera listing by itemId.",
    inputSchema: {
      type: "object",
      properties: { itemId: { type: "integer" } },
      required: ["itemId"],
    },
    handler: endListing,
  },
];

// ---------- JSON-RPC plumbing ----------------------------------------------

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message, data) {
  send({ jsonrpc: "2.0", id, error: { code, message, data } });
}

async function handle(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    return reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return; // notification, no response
  }

  if (method === "tools/list") {
    return reply(id, {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params ?? {};
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) return replyError(id, -32601, `Unknown tool: ${name}`);
    try {
      const result = await tool.handler(args);
      return reply(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    } catch (err) {
      return reply(id, {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${err.message}${
              err.body ? `\n${JSON.stringify(err.body, null, 2)}` : ""
            }`,
          },
        ],
      });
    }
  }

  if (method === "ping") return reply(id, {});

  if (id !== undefined) {
    replyError(id, -32601, `Method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (err) {
    return replyError(null, -32700, `Parse error: ${err.message}`);
  }
  Promise.resolve(handle(msg)).catch((err) => {
    replyError(msg?.id ?? null, -32603, `Internal error: ${err.message}`);
  });
});
rl.on("close", () => process.exit(0));
