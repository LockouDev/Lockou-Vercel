import { hasUserData, saveUserData, storageProvider } from "./_storage.js";
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

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
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
  const skipExisting = toBoolean(body.skipExisting);

  if (entries.length === 0) {
    return res.status(400).json({
      error:
        "No valid player payload found. Send userId + data/template or players.",
    });
  }

  try {
    let entriesToSave = entries;
    let skippedUsers = [];

    if (skipExisting) {
      const checks = await Promise.all(
        entries.map(async (entry) => {
          try {
            const exists = await hasUserData(entry.userId);
            return { userId: entry.userId, exists };
          } catch {
            return { userId: entry.userId, exists: false };
          }
        })
      );

      const existingSet = new Set(
        checks.filter((item) => item.exists).map((item) => item.userId)
      );
      skippedUsers = entries
        .filter((entry) => existingSet.has(entry.userId))
        .map((entry) => entry.userId);
      entriesToSave = entries.filter((entry) => !existingSet.has(entry.userId));
    }

    if (entriesToSave.length === 0) {
      return res.status(200).json({
        success: true,
        savedUsers: [],
        totalSaved: 0,
        skippedUsers,
        totalSkipped: skippedUsers.length,
        provider: storageProvider(),
        kvFailed: 0,
        fileSync: {
          success: false,
          skipped: true,
          reason: "All users already existed",
          filePath: getStepMusicDataFilePath(),
          totalPlayers: null,
          updatedAt: null,
        },
      });
    }

    const kvResults = await Promise.allSettled(
      entriesToSave.map((entry) => saveUserData(entry.userId, entry.data))
    );
    const kvFailed = kvResults.filter(
      (result) => result.status === "rejected"
    ).length;

    const isVercelRuntime = process.env.VERCEL === "1";
    let fileSync = {
      success: false,
      filePath: getStepMusicDataFilePath(),
      totalPlayers: null,
      updatedAt: null,
      skipped: false,
    };

    if (!isVercelRuntime) {
      try {
        const fileResult = await upsertPlayersInFile(entriesToSave);
        fileSync = {
          success: true,
          filePath: fileResult.filePath,
          totalPlayers: fileResult.totalPlayers,
          updatedAt: fileResult.updatedAt,
          skipped: false,
        };
      } catch (fileError) {
        console.error("Erro ao sincronizar StepMusic/Data.js:", fileError);
      }
    } else {
      fileSync = {
        ...fileSync,
        skipped: true,
      };
    }

    const kvSucceeded = entriesToSave.length - kvFailed;
    if (kvSucceeded === 0 && !fileSync.success) {
      return res.status(500).json({
        error: "Failed to persist data in KV and StepMusic/Data.js",
        savedUsers: [],
        totalSaved: 0,
        skippedUsers,
        totalSkipped: skippedUsers.length,
        provider: storageProvider(),
        kvFailed,
        fileSync,
      });
    }

    return res.status(200).json({
      success: kvSucceeded > 0 || fileSync.success,
      savedUsers: entriesToSave.map((entry) => entry.userId),
      totalSaved: entriesToSave.length,
      skippedUsers,
      totalSkipped: skippedUsers.length,
      totalReceived: entries.length,
      skipExisting,
      provider: storageProvider(),
      kvFailed,
      fileSync,
    });
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return res.status(500).json({ error: "Failed to save data" });
  }
}
