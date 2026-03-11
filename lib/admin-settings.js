const MIGRATION_SETTING_KEY = "lockou:settings:game_migration_enabled";

function readBooleanEnv(name, fallback = false) {
  const value = (process.env[name] || "").trim().toLowerCase();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function readRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

  return {
    url: url.trim(),
    token: token.trim()
  };
}

function hasRedisConfig() {
  const config = readRedisConfig();
  return Boolean(config.url && config.token);
}

async function runRedisRestCommand(commandSegments) {
  const { url, token } = readRedisConfig();

  if (!url || !token) {
    throw new Error(
      "Redis REST credentials are not configured, connect Redis on Vercel first"
    );
  }

  const endpoint = `${url.replace(/\/+$/, "")}/${commandSegments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/")}`;

  const response = await fetch(endpoint, {
    headers: {
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || "Redis REST request failed"
    );
  }

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return payload?.result;
}

function readMigrationFlagFromEnv() {
  return readBooleanEnv("GAME_MIGRATION_ENABLED", false);
}

export async function getMigrationControlState() {
  const envEnabled = readMigrationFlagFromEnv();

  if (!hasRedisConfig()) {
    return {
      enabled: envEnabled,
      writable: false,
      source: "env",
      storage: "Environment Variable",
      note:
        "Read-only, connect Redis on Vercel to change this live from the admin panel"
    };
  }

  try {
    const storedValue = await runRedisRestCommand(["get", MIGRATION_SETTING_KEY]);
    const hasStoredValue = typeof storedValue === "string" && storedValue.length > 0;
    const enabled = hasStoredValue ? storedValue === "true" : envEnabled;

    return {
      enabled,
      writable: true,
      source: hasStoredValue ? "redis" : "env_fallback",
      storage: hasStoredValue ? "Redis" : "Environment Variable",
      note: hasStoredValue
        ? "Live toggle persisted in Redis"
        : "Using the environment default until the first admin change is saved"
    };
  } catch (error) {
    return {
      enabled: envEnabled,
      writable: false,
      source: "env_error",
      storage: "Environment Variable",
      note:
        error.message ||
        "Redis is unavailable right now, falling back to the environment default"
    };
  }
}

export async function isGameMigrationEnabled() {
  const state = await getMigrationControlState();
  return state.enabled;
}

export async function setMigrationControlState(enabled) {
  if (!hasRedisConfig()) {
    throw new Error(
      "Live changes require Redis on Vercel, connect Redis to enable admin toggles"
    );
  }

  const normalizedValue = enabled ? "true" : "false";

  await runRedisRestCommand(["set", MIGRATION_SETTING_KEY, normalizedValue]);

  return getMigrationControlState();
}
