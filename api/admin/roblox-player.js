import {
  createJsonResponse,
  getSessionTokenFromRequest,
  verifySessionToken
} from "../../lib/admin-auth.js";

const OPEN_CLOUD_BASE_URL =
  "https://apis.roblox.com/datastores/v1/universes";
const DEFAULT_SCOPE = "global";

function readRobloxConfig() {
  return {
    apiKey: process.env.ROBLOX_OPEN_CLOUD_API_KEY || "",
    universeId: process.env.ROBLOX_UNIVERSE_ID || "",
    datastoreName: process.env.ROBLOX_DATASTORE_NAME || "",
    datastoreScope: process.env.ROBLOX_DATASTORE_SCOPE || DEFAULT_SCOPE
  };
}

function parseRobloxBody(bodyText) {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

export default {
  async fetch(request) {
    const session = await verifySessionToken(getSessionTokenFromRequest(request));

    if (!session) {
      return createJsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, universeId, datastoreName, datastoreScope } = readRobloxConfig();

    if (!apiKey || !universeId || !datastoreName) {
      return createJsonResponse(
        {
          error:
            "Missing Roblox Open Cloud environment variables. Check ROBLOX_OPEN_CLOUD_API_KEY, ROBLOX_UNIVERSE_ID and ROBLOX_DATASTORE_NAME."
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const playerId = (url.searchParams.get("playerId") || "").trim();

    if (!playerId) {
      return createJsonResponse(
        { error: "playerId query parameter is required." },
        { status: 400 }
      );
    }

    const robloxUrl = new URL(
      `${OPEN_CLOUD_BASE_URL}/${encodeURIComponent(
        universeId
      )}/standard-datastores/datastore/entries/entry`
    );

    robloxUrl.searchParams.set("datastoreName", datastoreName);
    robloxUrl.searchParams.set("entryKey", playerId);
    robloxUrl.searchParams.set("scope", datastoreScope);

    const robloxResponse = await fetch(robloxUrl, {
      method: "GET",
      headers: {
        "x-api-key": apiKey
      }
    });

    const robloxText = await robloxResponse.text();
    const robloxPayload = parseRobloxBody(robloxText);

    if (!robloxResponse.ok) {
      return createJsonResponse(
        {
          error: "Roblox Open Cloud request failed.",
          playerId,
          entryKeyUsed: playerId,
          datastoreName,
          datastoreScope,
          robloxStatus: robloxResponse.status,
          robloxPayload
        },
        {
          status:
            robloxResponse.status === 404
              ? 404
              : robloxResponse.status >= 400 && robloxResponse.status < 600
                ? robloxResponse.status
                : 502
        }
      );
    }

    return createJsonResponse({
      ok: true,
      playerId,
      entryKeyUsed: playerId,
      datastoreName,
      datastoreScope,
      data: robloxPayload
    });
  }
};
