import {
  listSavedUserIds,
  loadUserData,
  storageProvider,
} from "./_storage.js";
import { readAllPlayersFromFile } from "./_stepMusicFile.js";

const DATASTORE_NAME = "21/07/2024";
const LOAD_CHUNK = 25;

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const provider = storageProvider();
    if (provider === "kv") {
      const limit = Math.min(toPositiveInt(req.query.limit, 1000), 5000);
      const ids = await listSavedUserIds();
      const limitedIds = ids.slice(0, limit);

      const players = {};
      let latestUpdatedAt = null;

      for (let i = 0; i < limitedIds.length; i += LOAD_CHUNK) {
        const chunk = limitedIds.slice(i, i + LOAD_CHUNK);
        const records = await Promise.all(
          chunk.map(async (id) => {
            try {
              return { id, record: await loadUserData(id) };
            } catch {
              return { id, record: null };
            }
          })
        );

        for (const item of records) {
          if (!item.record?.data) continue;
          players[item.id] = item.record.data;

          const current = item.record.updatedAt || null;
          if (current && (!latestUpdatedAt || current > latestUpdatedAt)) {
            latestUpdatedAt = current;
          }
        }
      }

      return res.status(200).json({
        datastoreName: DATASTORE_NAME,
        updatedAt: latestUpdatedAt,
        totalPlayers: Object.keys(players).length,
        source: "kv",
        players,
      });
    }

    const doc = await readAllPlayersFromFile();
    const totalPlayers = Object.keys(doc.players).length;

    return res.status(200).json({
      datastoreName: doc.datastoreName,
      updatedAt: doc.updatedAt,
      totalPlayers,
      source: "file",
      players: doc.players,
    });
  } catch (error) {
    console.error("Erro ao listar dados do StepMusic:", error);
    return res.status(500).json({ error: "Failed to list StepMusic data" });
  }
}
