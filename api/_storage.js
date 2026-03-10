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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addUserIdToKvIndex(userId) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await kvRequest(
        `/sadd/${encodeURIComponent(USER_INDEX_KEY)}/${encodeURIComponent(
          userId
        )}`,
        { method: "POST" }
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(150 * attempt);
      }
    }
  }

  throw new Error(
    `Failed to index userId ${userId} in KV set: ${lastError?.message || "unknown error"}`
  );
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

export async function hasUserData(userId) {
  ensurePersistentStorage();

  const key = getKey(userId);

  if (!hasKvConfig()) {
    return memoryStore.has(key);
  }

  try {
    const response = await kvRequest(
      `/sismember/${encodeURIComponent(USER_INDEX_KEY)}/${encodeURIComponent(
        String(userId)
      )}`,
      { method: "GET" }
    );
    const body = await response.json();
    const result = body?.result;

    if (result === 1 || result === "1" || result === true) return true;
    if (result === 0 || result === "0" || result === false) return false;
  } catch {
    // Fall back to direct read when set-membership is unavailable.
  }

  const found = await loadUserData(userId);
  return Boolean(found);
}

export async function listSavedUserIds(options = {}) {
  ensurePersistentStorage();
  const forceKeys = options?.forceKeys === true;

  if (!hasKvConfig()) {
    const ids = [];
    for (const key of memoryStore.keys()) {
      if (String(key).startsWith(USER_KEY_PREFIX)) {
        ids.push(String(key).slice(USER_KEY_PREFIX.length));
      }
    }
    return ids;
  }

  if (!forceKeys) {
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

export async function countSavedUsers() {
  ensurePersistentStorage();

  if (!hasKvConfig()) {
    let count = 0;
    for (const key of memoryStore.keys()) {
      if (String(key).startsWith(USER_KEY_PREFIX)) {
        count += 1;
      }
    }
    return count;
  }

  try {
    const response = await kvRequest(
      `/scard/${encodeURIComponent(USER_INDEX_KEY)}`,
      { method: "GET" }
    );
    const body = await response.json();
    const result = Number(body?.result);
    if (Number.isFinite(result) && result >= 0) {
      return result;
    }
  } catch {
    // Fall back to ID listing if SCARD fails.
  }

  const ids = await listSavedUserIds();
  return ids.length;
}

export function storageProvider() {
  return hasKvConfig() ? "kv" : "memory";
}
