import { saveUserData, storageProvider } from "./_storage.js";
import {
  getStepMusicDataFilePath,
  upsertPlayersInFile,
} from "./_stepMusicFile.js";

function normalizeBody(body) {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (body && typeof body === "object") {
    return body;
  }

  return null;
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function buildEntriesFromPayload(body) {
  const entries = [];

  if (Array.isArray(body.players)) {
    for (const player of body.players) {
      if (!isRecord(player)) continue;
      const userId = String(player.userId || "").trim();
      const data =
        isRecord(player.data) || isRecord(player.template)
          ? player.data || player.template
          : null;
      if (!userId || !data) continue;
      entries.push({ userId, data });
    }
  } else if (isRecord(body.players)) {
    for (const [userId, data] of Object.entries(body.players)) {
      if (!isRecord(data)) continue;
      entries.push({ userId: String(userId).trim(), data });
    }
  }

  if (entries.length > 0) {
    return entries;
  }

  const userId = String(body.userId || "").trim();
  if (!userId) {
    return [];
  }

  const data =
    isRecord(body.data) || isRecord(body.template)
      ? body.data || body.template
      : Object.fromEntries(
          Object.entries(body).filter(
            ([key]) => !["userId", "players", "datastoreName"].includes(key)
          )
        );

  if (!isRecord(data)) {
    return [];
  }

  return [{ userId, data }];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expectedApiKey = String(process.env.ROBLOX_API_KEY || "").trim();
  if (expectedApiKey) {
    const rawHeaderKey =
      req.headers["x-api-key"] ||
      req.headers["X-API-KEY"] ||
      req.headers.authorization ||
      req.headers.Authorization ||
      "";

    const receivedRaw = Array.isArray(rawHeaderKey)
      ? rawHeaderKey[0]
      : rawHeaderKey;
    const receivedTrimmed = String(receivedRaw || "").trim();
    const receivedApiKey = receivedTrimmed.toLowerCase().startsWith("bearer ")
      ? receivedTrimmed.slice(7).trim()
      : receivedTrimmed;

    if (receivedApiKey !== expectedApiKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }
  }

  const body = normalizeBody(req.body);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const entries = buildEntriesFromPayload(body).filter(
    (entry) => entry.userId && isRecord(entry.data)
  );

  if (entries.length === 0) {
    return res.status(400).json({
      error:
        "No valid player payload found. Send userId + data/template or players.",
    });
  }

  try {
    const kvResults = await Promise.allSettled(
      entries.map((entry) => saveUserData(entry.userId, entry.data))
    );
    const kvFailed = kvResults.filter(
      (result) => result.status === "rejected"
    ).length;

    let fileSync = {
      success: false,
      filePath: getStepMusicDataFilePath(),
      totalPlayers: null,
      updatedAt: null,
    };

    try {
      const fileResult = await upsertPlayersInFile(entries);
      fileSync = {
        success: true,
        filePath: fileResult.filePath,
        totalPlayers: fileResult.totalPlayers,
        updatedAt: fileResult.updatedAt,
      };
    } catch (fileError) {
      console.error("Erro ao sincronizar StepMusic/Data.js:", fileError);
    }

    const kvSucceeded = entries.length - kvFailed;
    if (kvSucceeded === 0 && !fileSync.success) {
      return res.status(500).json({
        error: "Failed to persist data in KV and StepMusic/Data.js",
        savedUsers: [],
        totalSaved: 0,
        provider: storageProvider(),
        kvFailed,
        fileSync,
      });
    }

    return res.status(200).json({
      success: kvSucceeded > 0 || fileSync.success,
      savedUsers: entries.map((entry) => entry.userId),
      totalSaved: entries.length,
      provider: storageProvider(),
      kvFailed,
      fileSync,
    });
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return res.status(500).json({ error: "Failed to save data" });
  }
}
