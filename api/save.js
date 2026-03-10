import { hasUserData, saveUserData, storageProvider } from "./_storage.js";
import { hasImportantTemplateData, isPlayerTemplateEmpty } from "./_template.js";
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

function parseDateBoundary(value, endOfDay = false) {
  if (value === undefined || value === null) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const brDateMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDateMatch) {
    const day = Number(brDateMatch[1]);
    const month = Number(brDateMatch[2]);
    const year = Number(brDateMatch[3]);
    return Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
  }

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    return Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
  }

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

function parseTimestampValue(value) {
  if (value === undefined || value === null) return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) return Math.trunc(value);
    if (value > 1e9) return Math.trunc(value * 1000);
    return Math.trunc(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    if (numeric > 1e12) return Math.trunc(numeric);
    if (numeric > 1e9) return Math.trunc(numeric * 1000);
    return Math.trunc(numeric);
  }

  const timestamp = Date.parse(text);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

function isTimestampInRange(timestamp, fromTs, toTs) {
  if (timestamp === null) return false;
  if (fromTs !== null && timestamp < fromTs) return false;
  if (toTs !== null && timestamp > toTs) return false;
  return true;
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
  const skipEmptyTemplates =
    body.skipEmptyTemplates === undefined
      ? true
      : toBoolean(body.skipEmptyTemplates);
  const requireImportantData =
    body.requireImportantData === undefined
      ? true
      : toBoolean(body.requireImportantData);
  const dateField = String(body.dateField || "LastSessionTime").trim() || "LastSessionTime";
  const hasFrom = body.from !== undefined && String(body.from ?? "").trim() !== "";
  const hasTo = body.to !== undefined && String(body.to ?? "").trim() !== "";
  const dateFilterApplied = hasFrom || hasTo;
  const fromTs = parseDateBoundary(body.from, false);
  const toTs = parseDateBoundary(body.to, true);

  if (hasFrom && fromTs === null) {
    return res.status(400).json({
      error: "Invalid 'from' date. Use DD/MM/YYYY, YYYY-MM-DD, or ISO date.",
    });
  }

  if (hasTo && toTs === null) {
    return res.status(400).json({
      error: "Invalid 'to' date. Use DD/MM/YYYY, YYYY-MM-DD, or ISO date.",
    });
  }

  if (fromTs !== null && toTs !== null && fromTs > toTs) {
    return res.status(400).json({
      error: "Invalid date range: 'from' cannot be greater than 'to'.",
    });
  }

  if (entries.length === 0) {
    return res.status(400).json({
      error:
        "No valid player payload found. Send userId + data/template or players.",
    });
  }

  try {
    let entriesAfterDate = entries;
    const ignoredOutOfRangeUsers = [];

    if (dateFilterApplied) {
      entriesAfterDate = [];
      for (const entry of entries) {
        const timestamp = parseTimestampValue(entry.data?.[dateField]);
        if (!isTimestampInRange(timestamp, fromTs, toTs)) {
          ignoredOutOfRangeUsers.push(entry.userId);
          continue;
        }
        entriesAfterDate.push(entry);
      }
    }

    let entriesAfterImportance = entriesAfterDate;
    const ignoredNoImportantUsers = [];

    if (requireImportantData) {
      entriesAfterImportance = [];
      for (const entry of entriesAfterDate) {
        if (!hasImportantTemplateData(entry.data)) {
          ignoredNoImportantUsers.push(entry.userId);
          continue;
        }
        entriesAfterImportance.push(entry);
      }
    }

    let entriesToCheck = entriesAfterImportance;
    const ignoredEmptyUsers = [];
    let existingSkippedUsers = [];

    if (skipEmptyTemplates) {
      entriesToCheck = [];
      for (const entry of entriesAfterImportance) {
        if (isPlayerTemplateEmpty(entry.data)) {
          ignoredEmptyUsers.push(entry.userId);
          continue;
        }
        entriesToCheck.push(entry);
      }
    }

    let entriesToSave = entriesToCheck;

    if (skipExisting) {
      const checks = await Promise.all(
        entriesToCheck.map(async (entry) => {
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
      existingSkippedUsers = entriesToCheck
        .filter((entry) => existingSet.has(entry.userId))
        .map((entry) => entry.userId);
      entriesToSave = entriesToCheck.filter(
        (entry) => !existingSet.has(entry.userId)
      );
    }

    const skippedUsers = [
      ...ignoredOutOfRangeUsers,
      ...ignoredNoImportantUsers,
      ...ignoredEmptyUsers,
      ...existingSkippedUsers,
    ];

    if (entriesToSave.length === 0) {
      return res.status(200).json({
        success: true,
        savedUsers: [],
        totalSaved: 0,
        failedUsers: [],
        totalFailed: 0,
        skippedUsers,
        totalSkipped: skippedUsers.length,
        ignoredOutOfRangeUsers,
        totalIgnoredOutOfRange: ignoredOutOfRangeUsers.length,
        ignoredNoImportantUsers,
        totalIgnoredNoImportant: ignoredNoImportantUsers.length,
        ignoredEmptyUsers,
        totalIgnoredEmpty: ignoredEmptyUsers.length,
        totalReceived: entries.length,
        totalChecked: entriesToCheck.length,
        skipExisting,
        skipEmptyTemplates,
        requireImportantData,
        dateFilterApplied,
        dateField: dateFilterApplied ? dateField : null,
        from: fromTs !== null ? new Date(fromTs).toISOString() : null,
        to: toTs !== null ? new Date(toTs).toISOString() : null,
        provider: storageProvider(),
        kvFailed: 0,
        fileSync: {
          success: false,
          skipped: true,
          reason: "No users eligible to save",
          filePath: getStepMusicDataFilePath(),
          totalPlayers: null,
          updatedAt: null,
        },
      });
    }

    const kvResults = await Promise.allSettled(
      entriesToSave.map((entry) => saveUserData(entry.userId, entry.data))
    );
    const savedUsers = [];
    const failedUsers = [];

    for (let index = 0; index < kvResults.length; index += 1) {
      const result = kvResults[index];
      const userId = entriesToSave[index]?.userId;
      if (!userId) continue;

      if (result.status === "fulfilled") {
        savedUsers.push(userId);
      } else {
        failedUsers.push(userId);
      }
    }

    const kvSucceeded = savedUsers.length;
    const kvFailed = failedUsers.length;

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

    if (kvSucceeded === 0 && !fileSync.success) {
      return res.status(500).json({
        error: "Failed to persist data in KV and StepMusic/Data.js",
        savedUsers,
        totalSaved: 0,
        failedUsers,
        totalFailed: kvFailed,
        skippedUsers,
        totalSkipped: skippedUsers.length,
        ignoredOutOfRangeUsers,
        totalIgnoredOutOfRange: ignoredOutOfRangeUsers.length,
        ignoredNoImportantUsers,
        totalIgnoredNoImportant: ignoredNoImportantUsers.length,
        ignoredEmptyUsers,
        totalIgnoredEmpty: ignoredEmptyUsers.length,
        totalReceived: entries.length,
        totalChecked: entriesToCheck.length,
        skipExisting,
        skipEmptyTemplates,
        requireImportantData,
        dateFilterApplied,
        dateField: dateFilterApplied ? dateField : null,
        from: fromTs !== null ? new Date(fromTs).toISOString() : null,
        to: toTs !== null ? new Date(toTs).toISOString() : null,
        provider: storageProvider(),
        kvFailed,
        fileSync,
      });
    }

    return res.status(200).json({
      success: kvSucceeded > 0 || fileSync.success,
      savedUsers,
      totalSaved: kvSucceeded,
      failedUsers,
      totalFailed: kvFailed,
      skippedUsers,
      totalSkipped: skippedUsers.length,
      ignoredOutOfRangeUsers,
      totalIgnoredOutOfRange: ignoredOutOfRangeUsers.length,
      ignoredNoImportantUsers,
      totalIgnoredNoImportant: ignoredNoImportantUsers.length,
      ignoredEmptyUsers,
      totalIgnoredEmpty: ignoredEmptyUsers.length,
      totalReceived: entries.length,
      totalChecked: entriesToCheck.length,
      skipExisting,
      skipEmptyTemplates,
      requireImportantData,
      dateFilterApplied,
      dateField: dateFilterApplied ? dateField : null,
      from: fromTs !== null ? new Date(fromTs).toISOString() : null,
      to: toTs !== null ? new Date(toTs).toISOString() : null,
      provider: storageProvider(),
      kvFailed,
      fileSync,
    });
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return res.status(500).json({ error: "Failed to save data" });
  }
}
