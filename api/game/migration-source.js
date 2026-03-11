import { createJsonResponse } from "../../lib/admin-auth.js";
import {
  isGameMigrationEnabled,
  readGameMigrationSecret,
  safeCompareSecrets
} from "../../lib/game-migration-auth.js";
import { readDatastoreEntry } from "../../lib/roblox-open-cloud.js";

function normalizeSourceData(rawData) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return rawData;
  }

  return {
    ...rawData,
    AppliedBackups: rawData.AppliedBackups || {},
    FavoriteDances: {}
  };
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return createJsonResponse(
        { error: "Method not allowed" },
        { status: 405, headers: { allow: "POST" } }
      );
    }

    if (!(await isGameMigrationEnabled())) {
      return createJsonResponse({
        ok: true,
        found: false,
        disabled: true,
        reason: "migration_disabled"
      });
    }

    const expectedSecret = readGameMigrationSecret();
    const providedSecret = request.headers.get("x-game-migration-secret") || "";

    if (!expectedSecret) {
      return createJsonResponse(
        { error: "GAME_MIGRATION_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (!safeCompareSecrets(expectedSecret, providedSecret)) {
      return createJsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return createJsonResponse({ error: "Invalid JSON body" }, { status: 400 });
    }

    const playerId = String(payload?.playerId || "").trim();

    if (!playerId) {
      return createJsonResponse(
        { error: "playerId is required." },
        { status: 400 }
      );
    }

    const result = await readDatastoreEntry(playerId);

    if (!result.ok) {
      if (result.kind === "not_found") {
        return createJsonResponse({
          ok: true,
          found: false,
          playerId,
          reason: "source_data_not_found"
        });
      }

      return createJsonResponse(
        {
          error:
            result.kind === "config"
              ? result.error
              : "Failed to read Roblox source data.",
          playerId,
          robloxStatus: result.robloxStatus,
          robloxPayload: result.robloxPayload
        },
        { status: result.status }
      );
    }

    return createJsonResponse({
      ok: true,
      found: true,
      playerId,
      sourceDatastoreName: result.datastoreName,
      sourceDatastoreScope: result.datastoreScope,
      data: normalizeSourceData(result.data)
    });
  }
};
