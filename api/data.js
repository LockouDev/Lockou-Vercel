import {
  countSavedUsers,
  listSavedUserIds,
  loadUserData,
  storageProvider,
} from "./_storage.js";
import { readAllPlayersFromFile } from "./_stepMusicFile.js";
import { hasImportantTemplateData, normalizePlayerData } from "./_template.js";

const LOAD_CHUNK = 25;

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isEnabled(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function resolveAccurateFlag(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  return isEnabled(value);
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

function isInDateRange(isoDate, fromTs, toTs) {
  if (fromTs === null && toTs === null) {
    return true;
  }

  if (!isoDate) {
    return false;
  }

  const timestamp = Date.parse(String(isoDate));
  if (Number.isNaN(timestamp)) {
    return false;
  }

  if (fromTs !== null && timestamp < fromTs) {
    return false;
  }

  if (toTs !== null && timestamp > toTs) {
    return false;
  }

  return true;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("x-filter-mode", "important-only-v1");

  try {
    const limit = Math.min(toPositiveInt(req.query.limit, 250), 2000);
    const offset = Math.max(
      0,
      Number.parseInt(String(req.query.offset ?? "0"), 10) || 0
    );
    const includeMeta = isEnabled(req.query.meta);
    const accurate = resolveAccurateFlag(req.query.accurate);
    const coreOnly = true;
    const hasFrom = req.query.from !== undefined;
    const hasTo = req.query.to !== undefined;
    const fromTs = parseDateBoundary(req.query.from, false);
    const toTs = parseDateBoundary(req.query.to, true);

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

    if (storageProvider() === "kv") {
      const ids = await listSavedUserIds({ forceKeys: accurate });
      const totalPlayers = accurate ? ids.length : await countSavedUsers();
      const sortedIds = ids.sort((a, b) =>
        String(a).localeCompare(String(b), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
      const selectedIds = sortedIds.slice(offset, offset + limit);

      const players = {};
      let latestUpdatedAt = null;

      for (let i = 0; i < selectedIds.length; i += LOAD_CHUNK) {
        const chunk = selectedIds.slice(i, i + LOAD_CHUNK);
        const records = await Promise.all(
          chunk.map(async (userId) => {
            try {
              return { userId, record: await loadUserData(userId) };
            } catch {
              return { userId, record: null };
            }
          })
        );

        for (const item of records) {
          if (!item.record?.data) continue;
          if (!isInDateRange(item.record.updatedAt, fromTs, toTs)) continue;
          if (!hasImportantTemplateData(item.record.data)) continue;

          players[item.userId] = normalizePlayerData(
            item.userId,
            item.record.data
          );

          const current = item.record.updatedAt || null;
          if (current && (!latestUpdatedAt || current > latestUpdatedAt)) {
            latestUpdatedAt = current;
          }
        }
      }

      if (!includeMeta) {
        return res.status(200).json(players);
      }

      return res.status(200).json({
        totalPlayers,
        returnedPlayers: Object.keys(players).length,
        offset,
        limit,
        hasMore: offset + limit < totalPlayers,
        updatedAt: latestUpdatedAt,
        accurate,
        coreOnly,
        filterMode: "important-only-v1",
        from: fromTs !== null ? new Date(fromTs).toISOString() : null,
        to: toTs !== null ? new Date(toTs).toISOString() : null,
        players,
      });
    }

    const doc = await readAllPlayersFromFile();
    if (!isInDateRange(doc.updatedAt, fromTs, toTs)) {
      if (!includeMeta) {
        return res.status(200).json({});
      }

      return res.status(200).json({
        totalPlayers: 0,
        returnedPlayers: 0,
        offset,
        limit,
        hasMore: false,
        updatedAt: doc.updatedAt || null,
        accurate: true,
        coreOnly,
        filterMode: "important-only-v1",
        from: fromTs !== null ? new Date(fromTs).toISOString() : null,
        to: toTs !== null ? new Date(toTs).toISOString() : null,
        players: {},
      });
    }

    const ids = Object.keys(doc.players).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    const selectedIds = ids.slice(offset, offset + limit);
    const players = {};

    for (const userId of selectedIds) {
      const rawData = doc.players[userId];
      if (!hasImportantTemplateData(rawData)) continue;
      players[userId] = normalizePlayerData(userId, rawData);
    }

    if (!includeMeta) {
      return res.status(200).json(players);
    }

    return res.status(200).json({
      totalPlayers: ids.length,
      returnedPlayers: Object.keys(players).length,
      offset,
      limit,
      hasMore: offset + limit < ids.length,
      updatedAt: doc.updatedAt || null,
      accurate: true,
      coreOnly,
      filterMode: "important-only-v1",
      from: fromTs !== null ? new Date(fromTs).toISOString() : null,
      to: toTs !== null ? new Date(toTs).toISOString() : null,
      players,
    });
  } catch (error) {
    console.error("Erro ao gerar dados completos:", error);
    return res.status(500).json({ error: "Failed to build player data output" });
  }
}
