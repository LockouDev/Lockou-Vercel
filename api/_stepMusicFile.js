import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATASTORE_NAME = "21/07/2024";
const STEP_MUSIC_DIR = path.join(process.cwd(), "StepMusic");
const DATA_FILE_PATH = path.join(STEP_MUSIC_DIR, "Data.js");

function createEmptyDocument() {
  return {
    datastoreName: DATASTORE_NAME,
    updatedAt: new Date().toISOString(),
    players: {},
  };
}

function toFileSource(doc) {
  return `module.exports = ${JSON.stringify(doc, null, 2)};\n`;
}

function parseFileSource(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^module\.exports\s*=\s*([\s\S]+);$/);
  const jsonText = match ? match[1] : trimmed;
  return JSON.parse(jsonText);
}

async function ensureDataFile() {
  await mkdir(STEP_MUSIC_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE_PATH, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const empty = createEmptyDocument();
    await writeFile(DATA_FILE_PATH, toFileSource(empty), "utf8");
  }
}

export async function readAllPlayersFromFile() {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE_PATH, "utf8");
  const parsed = parseFileSource(raw);

  return {
    datastoreName: String(parsed?.datastoreName || DATASTORE_NAME),
    updatedAt: parsed?.updatedAt || null,
    players:
      parsed?.players && typeof parsed.players === "object"
        ? parsed.players
        : {},
  };
}

export async function upsertPlayersInFile(entries) {
  const doc = await readAllPlayersFromFile();

  for (const entry of entries) {
    const userId = String(entry.userId).trim();
    if (!userId) continue;
    doc.players[userId] = entry.data;
  }

  doc.datastoreName = DATASTORE_NAME;
  doc.updatedAt = new Date().toISOString();

  await writeFile(DATA_FILE_PATH, toFileSource(doc), "utf8");

  return {
    filePath: DATA_FILE_PATH,
    totalPlayers: Object.keys(doc.players).length,
    updatedAt: doc.updatedAt,
  };
}

export async function readPlayerFromFile(userId) {
  const doc = await readAllPlayersFromFile();
  const key = String(userId).trim();
  const data = doc.players[key];

  if (!data) return null;

  return {
    userId: key,
    data,
    updatedAt: doc.updatedAt,
    datastoreName: doc.datastoreName,
  };
}

export function getStepMusicDataFilePath() {
  return DATA_FILE_PATH;
}
