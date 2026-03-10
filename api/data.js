import {
  countSavedUsers,
  listSavedUserIds,
  loadUserData,
  storageProvider,
} from "./_storage.js";
import { readAllPlayersFromFile } from "./_stepMusicFile.js";
import { normalizePlayerData } from "./_template.js";

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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = Math.min(toPositiveInt(req.query.limit, 250), 2000);
    const offset = Math.max(
      0,
      Number.parseInt(String(req.query.offset ?? "0"), 10) || 0
    );
    const includeMeta = isEnabled(req.query.meta);
    const accurate = resolveAccurateFlag(req.query.accurate);

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
          players[item.userId] = normalizePlayerData(item.userId, item.record.data);

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
        players,
      });
    }

    const doc = await readAllPlayersFromFile();
    const ids = Object.keys(doc.players).sort((a, b) =>
      String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
    const selectedIds = ids.slice(offset, offset + limit);
    const players = {};

    for (const userId of selectedIds) {
      players[userId] = normalizePlayerData(userId, doc.players[userId]);
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
      players,
    });
  } catch (error) {
    console.error("Erro ao gerar dados completos:", error);
    return res.status(500).json({ error: "Failed to build player data output" });
  }
}
