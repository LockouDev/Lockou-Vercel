import { loadUserData, storageProvider } from "./_storage.js";
import { readPlayerFromFile } from "./_stepMusicFile.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = String(req.query.userId || "").trim();
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const record = await loadUserData(userId);

    if (record) {
      return res.status(200).json({
        userId,
        data: record.data || {},
        updatedAt: record.updatedAt || null,
        provider: storageProvider(),
      });
    }

    const fileRecord = await readPlayerFromFile(userId);
    if (fileRecord) {
      return res.status(200).json({
        userId,
        data: fileRecord.data || {},
        updatedAt: fileRecord.updatedAt || null,
        provider: "stepmusic-file",
        datastoreName: fileRecord.datastoreName,
      });
    }

    return res.status(404).json({ error: "User data not found", userId });
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    return res.status(500).json({ error: "Failed to load data" });
  }
}
