import {
  deleteUserData,
  listSavedUserIds,
  loadUserData,
  storageProvider,
} from "./_storage.js";
import { hasImportantTemplateData } from "./_template.js";

function normalizeBody(body) {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  if (body && typeof body === "object") {
    return body;
  }

  return {};
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
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

  try {
    const body = normalizeBody(req.body);
    const dryRun = toBoolean(body.dryRun, true);
    const offset = toPositiveInt(body.offset, 0);
    const limit = Math.min(toPositiveInt(body.limit, 500), 2000);

    const ids = await listSavedUserIds({ forceKeys: true });
    const sortedIds = ids.sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

    const selectedIds = sortedIds.slice(offset, offset + limit);
    const candidates = [];
    const failedLoads = [];

    for (const userId of selectedIds) {
      try {
        const record = await loadUserData(userId);
        if (!record?.data || !hasImportantTemplateData(record.data)) {
          candidates.push(String(userId));
        }
      } catch {
        failedLoads.push(String(userId));
      }
    }

    const deletedUsers = [];
    const deleteFailedUsers = [];

    if (!dryRun) {
      for (const userId of candidates) {
        try {
          await deleteUserData(userId);
          deletedUsers.push(userId);
        } catch {
          deleteFailedUsers.push(userId);
        }
      }
    }

    return res.status(200).json({
      success: true,
      provider: storageProvider(),
      dryRun,
      offset,
      limit,
      totalIds: sortedIds.length,
      processed: selectedIds.length,
      candidates: candidates.length,
      deleted: deletedUsers.length,
      failedLoads: failedLoads.length,
      deleteFailed: deleteFailedUsers.length,
      nextOffset:
        offset + selectedIds.length < sortedIds.length
          ? offset + selectedIds.length
          : null,
      sampleCandidates: candidates.slice(0, 50),
    });
  } catch (error) {
    console.error("Erro ao limpar templates sem dados importantes:", error);
    return res.status(500).json({
      error: "Failed to prune non-important template data",
    });
  }
}
