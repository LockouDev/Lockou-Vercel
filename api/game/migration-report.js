import { createJsonResponse } from "../../lib/admin-auth.js";
import {
  readGameMigrationSecret,
  safeCompareSecrets
} from "../../lib/game-migration-auth.js";

function readDiscordWebhookUrl() {
  return process.env.DISCORD_MIGRATION_WEBHOOK_URL || "";
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function buildDiscordMessage(payload) {
  const playerId = String(payload?.playerId || "").trim();
  const playerName = String(payload?.playerName || "").trim() || "Unknown";
  const source = String(payload?.source || "").trim() || "Experience 2";
  const result = String(payload?.result || "").trim() || "completed";

  return {
    content: truncateText(
      [
        "Migração feita!",
        `Player: ${playerName}`,
        `UserId: ${playerId}`,
        `Source: ${source}`,
        `Resultado: ${result}`
      ].join("\n"),
      1900
    )
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

    const discordWebhookUrl = readDiscordWebhookUrl();

    if (!discordWebhookUrl) {
      return createJsonResponse(
        { error: "DISCORD_MIGRATION_WEBHOOK_URL is not configured." },
        { status: 500 }
      );
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return createJsonResponse({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!payload?.playerId) {
      return createJsonResponse(
        { error: "playerId is required." },
        { status: 400 }
      );
    }

    const discordResponse = await fetch(discordWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(buildDiscordMessage(payload))
    });

    if (!discordResponse.ok) {
      const discordText = await discordResponse.text();

      return createJsonResponse(
        {
          error: "Discord webhook request failed.",
          discordStatus: discordResponse.status,
          discordPayload: discordText
        },
        { status: 502 }
      );
    }

    return createJsonResponse({
      ok: true
    });
  }
};
