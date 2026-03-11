const OPEN_CLOUD_BASE_URL =
  "https://apis.roblox.com/datastores/v1/universes";
const DEFAULT_SCOPE = "global";

function parseRobloxBody(bodyText) {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

export function readRobloxSourceConfig() {
  return {
    apiKey: process.env.ROBLOX_OPEN_CLOUD_API_KEY || "",
    universeId: process.env.ROBLOX_UNIVERSE_ID || "",
    datastoreName: process.env.ROBLOX_DATASTORE_NAME || "",
    datastoreScope: process.env.ROBLOX_DATASTORE_SCOPE || DEFAULT_SCOPE
  };
}

export function validateRobloxSourceConfig() {
  const { apiKey, universeId, datastoreName } = readRobloxSourceConfig();
  return Boolean(apiKey && universeId && datastoreName);
}

export async function readDatastoreEntry(entryKey) {
  const { apiKey, universeId, datastoreName, datastoreScope } =
    readRobloxSourceConfig();

  if (!apiKey || !universeId || !datastoreName) {
    return {
      ok: false,
      kind: "config",
      status: 500,
      error:
        "Missing Roblox Open Cloud environment variables, check ROBLOX_OPEN_CLOUD_API_KEY, ROBLOX_UNIVERSE_ID and ROBLOX_DATASTORE_NAME"
    };
  }

  const robloxUrl = new URL(
    `${OPEN_CLOUD_BASE_URL}/${encodeURIComponent(
      universeId
    )}/standard-datastores/datastore/entries/entry`
  );

  robloxUrl.searchParams.set("datastoreName", datastoreName);
  robloxUrl.searchParams.set("entryKey", entryKey);
  robloxUrl.searchParams.set("scope", datastoreScope);

  const robloxResponse = await fetch(robloxUrl, {
    method: "GET",
    headers: {
      "x-api-key": apiKey
    }
  });

  const robloxText = await robloxResponse.text();
  const robloxPayload = parseRobloxBody(robloxText);

  if (!robloxResponse.ok) {
    return {
      ok: false,
      kind: robloxResponse.status === 404 ? "not_found" : "request",
      status:
        robloxResponse.status >= 400 && robloxResponse.status < 600
          ? robloxResponse.status
          : 502,
      robloxStatus: robloxResponse.status,
      robloxPayload,
      datastoreName,
      datastoreScope
    };
  }

  return {
    ok: true,
    status: 200,
    data: robloxPayload,
    datastoreName,
    datastoreScope
  };
}
