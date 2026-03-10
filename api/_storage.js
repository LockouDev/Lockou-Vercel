const memoryStore = globalThis.__robloxMemoryStore || new Map();
globalThis.__robloxMemoryStore = memoryStore;

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const isVercelRuntime = process.env.VERCEL === "1";

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
  return `roblox:user:${userId}`;
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${kvToken}`,
  };
}

function getBaseUrl() {
  return kvUrl.replace(/\/$/, "");
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

  const response = await fetch(
    `${getBaseUrl()}/get/${encodeURIComponent(key)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`KV get failed with status ${response.status}`);
  }

  const body = await response.json();

  if (!body || body.result == null) {
    return null;
  }

  return JSON.parse(body.result);
}

export function storageProvider() {
  return hasKvConfig() ? "kv" : "memory";
}
