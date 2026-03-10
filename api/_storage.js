const memoryStore = globalThis.__robloxMemoryStore || new Map();
globalThis.__robloxMemoryStore = memoryStore;

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const isVercelRuntime = process.env.VERCEL === "1";
const USER_KEY_PREFIX = "roblox:user:";
const USER_INDEX_KEY = "roblox:user_ids";

function hasKvConfig() {
  return Boolean(kvUrl && kvToken);
}

function ensurePersistentStorage() {
  if (!hasKvConfig() && isVercelRuntime) {
    throw new Error(
      "KV not configured in Vercel. Set KV_REST_API_URL and KV_REST_API_TOKEN."
    );
  }
}

function getKey(userId) {
  return `${USER_KEY_PREFIX}${userId}`;
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${kvToken}`,
  };
}

function getBaseUrl() {
  return kvUrl.replace(/\/$/, "");
}

async function kvRequest(path, { method = "GET", body } = {}) {
  const headers = {
    ...getAuthHeaders(),
  };

  if (body != null) {
    headers["Content-Type"] = "text/plain";
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`KV request failed (${method} ${path}) with ${response.status}`);
  }

  return response;
}

async function addUserIdToKvIndex(userId) {
  try {
    await kvRequest(
      `/sadd/${encodeURIComponent(USER_INDEX_KEY)}/${encodeURIComponent(userId)}`,
      { method: "POST" }
    );
  } catch {
    // Index is best-effort; data save should still succeed.
  }
}

export async function saveUserData(userId, data) {
  ensurePersistentStorage();

  const key = getKey(userId);
  const payload = JSON.stringify({
    data,
    updatedAt: new Date().toISOString(),
  });

  if (!hasKvConfig()) {
    memoryStore.set(key, payload);
    return { provider: "memory" };
  }

  const response = await fetch(
    `${getBaseUrl()}/set/${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "text/plain",
      },
      body: payload,
    }
  );

  if (!response.ok) {
    throw new Error(`KV set failed with status ${response.status}`);
  }

  await addUserIdToKvIndex(String(userId));

  return { provider: "kv" };
}

export async function loadUserData(userId) {
  ensurePersistentStorage();

  const key = getKey(userId);

  if (!hasKvConfig()) {
    const raw = memoryStore.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  const response = await kvRequest(`/get/${encodeURIComponent(key)}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`KV get failed with status ${response.status}`);
  }

  const body = await response.json();

  if (!body || body.result == null) {
    return null;
  }

  return JSON.parse(body.result);
}

export async function listSavedUserIds() {
  ensurePersistentStorage();

  if (!hasKvConfig()) {
    const ids = [];
    for (const key of memoryStore.keys()) {
      if (String(key).startsWith(USER_KEY_PREFIX)) {
        ids.push(String(key).slice(USER_KEY_PREFIX.length));
      }
    }
    return ids;
  }

  try {
    const response = await kvRequest(
      `/smembers/${encodeURIComponent(USER_INDEX_KEY)}`,
      { method: "GET" }
    );
    const body = await response.json();
    if (Array.isArray(body?.result) && body.result.length > 0) {
      return body.result.map((value) => String(value));
    }
  } catch {
    // Fall back to key pattern listing.
  }

  const fallback = await kvRequest(
    `/keys/${encodeURIComponent(`${USER_KEY_PREFIX}*`)}`,
    { method: "GET" }
  );
  const fallbackBody = await fallback.json();
  const keys = Array.isArray(fallbackBody?.result) ? fallbackBody.result : [];

  return keys
    .map((key) => String(key))
    .filter((key) => key.startsWith(USER_KEY_PREFIX))
    .map((key) => key.slice(USER_KEY_PREFIX.length));
}

export function storageProvider() {
  return hasKvConfig() ? "kv" : "memory";
}
