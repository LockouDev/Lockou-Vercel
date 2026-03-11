import { isGameMigrationEnabled as readGameMigrationEnabled } from "./admin-settings.js";

export function readGameMigrationSecret() {
  return process.env.GAME_MIGRATION_SECRET || "";
}

export async function isGameMigrationEnabled() {
  return readGameMigrationEnabled();
}

export function safeCompareSecrets(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}
