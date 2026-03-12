import { runRedisCommand } from "./redis-rest.js";

const PREFERENCES_KEY_PREFIX = "lockou:admin:preferences:";
const DEFAULT_THEME = "galaxy-blue";
const DEFAULT_LANGUAGE = "en";
const ALLOWED_THEMES = [
  "galaxy-blue",
  "ocean-cyan",
  "solar-amber",
  "rose-bloom"
];
const ALLOWED_LANGUAGES = ["en", "pt-BR", "es"];

function preferencesKey(userId) {
  return `${PREFERENCES_KEY_PREFIX}${userId}`;
}

export function listAdminThemes() {
  return [...ALLOWED_THEMES];
}

export function listAdminLanguages() {
  return [...ALLOWED_LANGUAGES];
}

export function getDefaultAdminPreferences() {
  return {
    theme: DEFAULT_THEME,
    language: DEFAULT_LANGUAGE
  };
}

export function normalizeAdminPreferences(value = {}) {
  const nextTheme = ALLOWED_THEMES.includes(value.theme)
    ? value.theme
    : DEFAULT_THEME;
  const nextLanguage = ALLOWED_LANGUAGES.includes(value.language)
    ? value.language
    : DEFAULT_LANGUAGE;

  return {
    theme: nextTheme,
    language: nextLanguage
  };
}

export async function readAdminPreferences(userId) {
  if (!userId) {
    return getDefaultAdminPreferences();
  }

  const payload = await runRedisCommand(["get", preferencesKey(userId)]).catch(
    () => null
  );

  if (!payload) {
    return getDefaultAdminPreferences();
  }

  try {
    return normalizeAdminPreferences(JSON.parse(payload));
  } catch {
    return getDefaultAdminPreferences();
  }
}

export async function saveAdminPreferences(userId, preferences) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const normalized = normalizeAdminPreferences(preferences);
  await runRedisCommand([
    "set",
    preferencesKey(userId),
    JSON.stringify(normalized)
  ]);

  return normalized;
}
