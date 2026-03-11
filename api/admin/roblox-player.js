import {
  createJsonResponse,
  getSessionTokenFromRequest,
  verifySessionToken
} from "../../lib/admin-auth.js";
import { readDatastoreEntry } from "../../lib/roblox-open-cloud.js";

export default {
  async fetch(request) {
    const session = await verifySessionToken(getSessionTokenFromRequest(request));

    if (!session) {
      return createJsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const playerId = (url.searchParams.get("playerId") || "").trim();

    if (!playerId) {
      return createJsonResponse(
        { error: "playerId query parameter is required" },
        { status: 400 }
      );
    }

    const result = await readDatastoreEntry(playerId);

    if (!result.ok) {
      return createJsonResponse(
        {
          error:
            result.kind === "config"
              ? result.error
              : "Roblox Open Cloud request failed",
          playerId,
          entryKeyUsed: playerId,
          datastoreName: result.datastoreName,
          datastoreScope: result.datastoreScope,
          robloxStatus: result.robloxStatus,
          robloxPayload: result.robloxPayload
        },
        { status: result.status }
      );
    }

    return createJsonResponse({
      ok: true,
      playerId,
      entryKeyUsed: playerId,
      datastoreName: result.datastoreName,
      datastoreScope: result.datastoreScope,
      data: result.data
    });
  }
};
