const fs = require("node:fs");
const path = require("node:path");
const { once } = require("node:events");

function getArg(flagName, fallbackValue) {
  const index = process.argv.indexOf(`--${flagName}`);
  if (index >= 0 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return fallbackValue;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function toPositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  if (Number.isFinite(max)) {
    return Math.min(parsed, max);
  }
  return parsed;
}

function buildOutputPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join("backups", `redis-export-${stamp}.json`);
}

async function writeOrDrain(stream, text) {
  if (stream.write(text)) {
    return;
  }
  await once(stream, "drain");
}

async function fetchPage({
  baseUrl,
  limit,
  offset,
  accurate,
  coreOnly,
  apiKey,
  from,
  to,
}) {
  const url = new URL("/api/data", baseUrl);
  url.searchParams.set("meta", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("accurate", accurate ? "1" : "0");
  url.searchParams.set("coreOnly", coreOnly ? "1" : "0");
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  const headers = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Falha ao buscar ${url.toString()} | status=${response.status} | body=${body}`
    );
  }

  const payload = await response.json();
  return payload;
}

async function run() {
  const baseUrl = getArg(
    "base",
    process.env.EXPORT_BASE_URL || "https://lockou.vercel.app"
  );
  const outputPath = getArg("out", process.env.EXPORT_OUT || buildOutputPath());
  const limit = toPositiveInt(
    getArg("limit", process.env.EXPORT_LIMIT || "2000"),
    2000,
    2000
  );
  const accurate = toBool(
    getArg("accurate", process.env.EXPORT_ACCURATE || "1"),
    true
  );
  const coreOnly = toBool(
    getArg("core-only", process.env.EXPORT_CORE_ONLY || "1"),
    true
  );
  const apiKey = getArg("api-key", process.env.ROBLOX_API_KEY || "");
  const from = getArg("from", process.env.EXPORT_FROM || "");
  const to = getArg("to", process.env.EXPORT_TO || "");

  const absoluteOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });

  const firstPage = await fetchPage({
    baseUrl,
    limit,
    offset: 0,
    accurate,
    coreOnly,
    apiKey,
    from,
    to,
  });

  const writeStream = fs.createWriteStream(absoluteOutputPath, {
    encoding: "utf8",
  });

  writeStream.on("error", (error) => {
    throw error;
  });

  let totalWrittenPlayers = 0;
  let firstPlayer = true;

  await writeOrDrain(
    writeStream,
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: baseUrl,
      accurate,
      coreOnly,
      totalPlayersExpected: Number(firstPage.totalPlayers) || 0,
      from: firstPage.from || from || null,
      to: firstPage.to || to || null,
      players: {},
    }).replace(/\{\}$/, "")
  );
  await writeOrDrain(writeStream, "{");

  async function writePlayers(players) {
    const entries = Object.entries(players || {});
    for (const [userId, data] of entries) {
      if (!firstPlayer) {
        await writeOrDrain(writeStream, ",");
      }
      firstPlayer = false;
      await writeOrDrain(
        writeStream,
        `${JSON.stringify(userId)}:${JSON.stringify(data)}`
      );
      totalWrittenPlayers += 1;
    }
  }

  await writePlayers(firstPage.players);

  let hasMore = firstPage.hasMore === true;
  let offset = limit;
  let pages = 1;

  console.log(
    `[export] pagina=${pages} offset=0 retornados=${
      firstPage.returnedPlayers ?? Object.keys(firstPage.players || {}).length
    } esperado=${firstPage.totalPlayers ?? 0}`
  );

  while (hasMore) {
    const page = await fetchPage({
      baseUrl,
      limit,
      offset,
      accurate,
      coreOnly,
      apiKey,
      from,
      to,
    });

    await writePlayers(page.players);

    pages += 1;
    console.log(
      `[export] pagina=${pages} offset=${offset} retornados=${
        page.returnedPlayers ?? Object.keys(page.players || {}).length
      }`
    );

    hasMore = page.hasMore === true;
    offset += limit;
  }

  await writeOrDrain(
    writeStream,
    `},"totalPlayersExported":${totalWrittenPlayers}}\n`
  );

  await new Promise((resolve, reject) => {
    writeStream.end(resolve);
    writeStream.on("error", reject);
  });

  console.log(
    `[export] concluido | players=${totalWrittenPlayers} | arquivo=${absoluteOutputPath}`
  );
}

run().catch((error) => {
  console.error("[export] erro:", error?.message || error);
  process.exit(1);
});
