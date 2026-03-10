import { readAllPlayersFromFile } from "./_stepMusicFile.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const doc = await readAllPlayersFromFile();
    const totalPlayers = Object.keys(doc.players).length;

    return res.status(200).json({
      datastoreName: doc.datastoreName,
      updatedAt: doc.updatedAt,
      totalPlayers,
      players: doc.players,
    });
  } catch (error) {
    console.error("Erro ao listar dados do StepMusic:", error);
    return res.status(500).json({ error: "Failed to list StepMusic data" });
  }
}
