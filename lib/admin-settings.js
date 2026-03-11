import { hasRedisConfig, runRedisCommand } from "./redis-rest.js";

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
    const storedValue = await runRedisCommand(["get", MIGRATION_SETTING_KEY]);
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
    const error = new Error(
      "Live changes require Redis on Vercel, connect Redis to enable admin toggles"
    );
    error.status = 409;
    throw error;
  }

  await runRedisCommand([
    "set",
    MIGRATION_SETTING_KEY,
    enabled ? "true" : "false"
  ]);

  return getMigrationControlState();
}
