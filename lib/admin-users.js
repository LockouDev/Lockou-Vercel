import {
  getAdminRoleLabel,
  getPermissionsForRole,
  isValidAdminRole,
  listAdminRoles
} from "./admin-roles.js";
import { appendAdminAuditEvent } from "./admin-audit.js";
import { hasRedisConfig, runRedisCommand } from "./redis-rest.js";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 120;
const PASSWORD_ITERATIONS = 210000;

const USER_KEY_PREFIX = "lockou:admin:user:";
const USERNAME_KEY_PREFIX = "lockou:admin:username:";
const USERS_ALL_SET_KEY = "lockou:admin:users:all";
const USERS_PENDING_SET_KEY = "lockou:admin:users:pending";
const USERS_ACTIVE_SET_KEY = "lockou:admin:users:active";
const USERS_REJECTED_SET_KEY = "lockou:admin:users:rejected";

function createAdminError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function safeCompare(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }

  return bytes;
}

function createRandomHex(size = 16) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function derivePasswordHash(
  password,
  saltHex,
  iterations = PASSWORD_ITERATIONS
) {
  const saltBytes = hexToBytes(saltHex);

  if (!saltBytes) {
    throw createAdminError("Invalid password salt", 500);
  }

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256"
    },
    passwordKey,
    256
  );

  return bytesToHex(derivedBits);
}

function userKey(userId) {
  return `${USER_KEY_PREFIX}${userId}`;
}

function usernameKey(normalizedUsername) {
  return `${USERNAME_KEY_PREFIX}${normalizedUsername}`;
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function readBootstrapConfig() {
  return {
    username: String(process.env.ADMIN_BOOTSTRAP_USERNAME || "").trim(),
    password: String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "")
  };
}

async function moveUserStatus(userId, nextStatus) {
  await runRedisCommand(["srem", USERS_PENDING_SET_KEY, userId]);
  await runRedisCommand(["srem", USERS_ACTIVE_SET_KEY, userId]);
  await runRedisCommand(["srem", USERS_REJECTED_SET_KEY, userId]);

  if (nextStatus === "pending") {
    await runRedisCommand(["sadd", USERS_PENDING_SET_KEY, userId]);
  }

  if (nextStatus === "active") {
    await runRedisCommand(["sadd", USERS_ACTIVE_SET_KEY, userId]);
  }

  if (nextStatus === "rejected") {
    await runRedisCommand(["sadd", USERS_REJECTED_SET_KEY, userId]);
  }
}

async function storeUser(user) {
  await runRedisCommand(["set", userKey(user.id), JSON.stringify(user)]);
  await runRedisCommand(["set", usernameKey(user.usernameNormalized), user.id]);
  await runRedisCommand(["sadd", USERS_ALL_SET_KEY, user.id]);
  await moveUserStatus(user.id, user.status);
}

async function readUserPayload(userId) {
  if (!userId) {
    return null;
  }

  const payload = await runRedisCommand(["get", userKey(userId)]).catch(
    () => null
  );

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function sortUsersByDate(users) {
  return [...users].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || 0);
    const rightTime = Date.parse(right.createdAt || 0);
    return rightTime - leftTime;
  });
}

async function listUsersFromSet(setKey) {
  const userIds = (await runRedisCommand(["smembers", setKey])) || [];
  const users = await Promise.all(userIds.map((userId) => readUserPayload(userId)));
  return sortUsersByDate(users.filter(Boolean));
}

async function countActiveSupremeUsers() {
  const users = await listUsersFromSet(USERS_ACTIVE_SET_KEY);
  return users.filter((user) => user.role === "supreme").length;
}

export function sanitizeAdminUser(user, permissions = []) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    status: user.status,
    role: user.role,
    roleLabel: getAdminRoleLabel(user.role),
    permissions,
    createdAt: user.createdAt,
    approvedAt: user.approvedAt || "",
    approvedBy: user.approvedBy || "",
    lastLoginAt: user.lastLoginAt || "",
    robloxUserId: user.robloxUserId || "",
    robloxUsername: user.robloxUsername || "",
    robloxDisplayName: user.robloxDisplayName || "",
    robloxAvatarUrl: user.robloxAvatarUrl || "",
    robloxProfileUrl: user.robloxProfileUrl || ""
  };
}

export async function buildSafeAdminUser(user) {
  if (!user) {
    return null;
  }

  const permissions = await getPermissionsForRole(user.role);
  return sanitizeAdminUser(user, permissions);
}

export function validateAdminUsername(username) {
  const value = String(username || "").trim();
  const normalized = normalizeUsername(value);

  if (!value) {
    throw createAdminError("Username is required");
  }

  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    throw createAdminError("Username must have between 3 and 24 characters");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw createAdminError(
      "Username can only use letters, numbers, underscore and hyphen"
    );
  }

  return {
    value,
    normalized
  };
}

export function validateAdminPassword(password) {
  const value = String(password || "");

  if (!value) {
    throw createAdminError("Password is required");
  }

  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    throw createAdminError("Password must have between 8 and 120 characters");
  }

  return value;
}

export async function verifyAdminPassword(user, password) {
  const normalizedPassword = String(password || "");

  if (!normalizedPassword) {
    return false;
  }

  const hash = await derivePasswordHash(
    normalizedPassword,
    user.passwordSalt,
    user.passwordIterations || PASSWORD_ITERATIONS
  );

  return safeCompare(hash, user.passwordHash);
}

export async function readAdminUserById(userId) {
  if (!hasRedisConfig()) {
    return null;
  }

  return readUserPayload(userId);
}

export async function readAdminUserByUsername(username) {
  if (!hasRedisConfig()) {
    return null;
  }

  const normalized = normalizeUsername(username);

  if (!normalized) {
    return null;
  }

  const userId = await runRedisCommand(["get", usernameKey(normalized)]).catch(
    () => null
  );
  return readUserPayload(userId);
}

export async function listPendingAdminUsers() {
  return Promise.all(
    (await listUsersFromSet(USERS_PENDING_SET_KEY)).map((user) =>
      buildSafeAdminUser(user)
    )
  );
}

export async function listActiveAdminUsers() {
  return Promise.all(
    (await listUsersFromSet(USERS_ACTIVE_SET_KEY)).map((user) =>
      buildSafeAdminUser(user)
    )
  );
}

export async function hasAnyActiveAdminUsers() {
  if (!hasRedisConfig()) {
    return false;
  }

  const activeUsers = await runRedisCommand(["smembers", USERS_ACTIVE_SET_KEY]).catch(
    () => []
  );
  return Array.isArray(activeUsers) && activeUsers.length > 0;
}

export async function createPendingAdminUser({ username, password }) {
  if (!hasRedisConfig()) {
    throw createAdminError(
      "Admin database is not configured, connect Upstash Redis on Vercel first",
      500
    );
  }

  const usernameValue = validateAdminUsername(username);
  const passwordValue = validateAdminPassword(password);
  const existingUser = await readAdminUserByUsername(usernameValue.value);

  if (existingUser) {
    throw createAdminError("This username is already in use", 409);
  }

  const user = {
    id: crypto.randomUUID(),
    username: usernameValue.value,
    usernameNormalized: usernameValue.normalized,
    passwordSalt: createRandomHex(16),
    passwordHash: "",
    passwordIterations: PASSWORD_ITERATIONS,
    status: "pending",
    role: "reader",
    createdAt: new Date().toISOString(),
    approvedAt: "",
    approvedBy: "",
    lastLoginAt: ""
  };

  user.passwordHash = await derivePasswordHash(
    passwordValue,
    user.passwordSalt,
    user.passwordIterations
  );

  await storeUser(user);
  return buildSafeAdminUser(user);
}

export async function ensureBootstrapAdmin(username, password) {
  if (!hasRedisConfig()) {
    throw createAdminError(
      "Admin database is not configured, connect Upstash Redis on Vercel first",
      500
    );
  }

  const hasActiveUsers = await hasAnyActiveAdminUsers();

  if (hasActiveUsers) {
    return null;
  }

  const bootstrap = readBootstrapConfig();

  if (!bootstrap.username || !bootstrap.password) {
    return null;
  }

  const usernameValue = validateAdminUsername(username);
  const passwordValue = String(password || "");

  if (!passwordValue) {
    return null;
  }

  if (
    usernameValue.normalized !== normalizeUsername(bootstrap.username) ||
    !safeCompare(passwordValue, bootstrap.password)
  ) {
    return null;
  }

  const existingUser = await readAdminUserByUsername(bootstrap.username);

  if (existingUser) {
    if (existingUser.status !== "active" || existingUser.role !== "supreme") {
      const nextUser = {
        ...existingUser,
        status: "active",
        role: "supreme",
        approvedAt: existingUser.approvedAt || new Date().toISOString(),
        approvedBy: existingUser.approvedBy || "bootstrap"
      };
      await storeUser(nextUser);
      return nextUser;
    }

    return existingUser;
  }

  const user = {
    id: crypto.randomUUID(),
    username: bootstrap.username.trim(),
    usernameNormalized: normalizeUsername(bootstrap.username),
    passwordSalt: createRandomHex(16),
    passwordHash: "",
    passwordIterations: PASSWORD_ITERATIONS,
    status: "active",
    role: "supreme",
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: "bootstrap",
    lastLoginAt: ""
  };

  user.passwordHash = await derivePasswordHash(
    passwordValue,
    user.passwordSalt,
    user.passwordIterations
  );

  await storeUser(user);
  return user;
}

export async function markAdminLastLogin(user) {
  const nextUser = {
    ...user,
    lastLoginAt: new Date().toISOString()
  };

  await storeUser(nextUser);
  return nextUser;
}

export async function updateAdminRobloxProfile(userId, profile) {
  const user = await readAdminUserById(userId);

  if (!user) {
    throw createAdminError("User was not found", 404);
  }

  const nextUser = {
    ...user,
    robloxUserId: String(profile?.robloxUserId || ""),
    robloxUsername: String(profile?.robloxUsername || ""),
    robloxDisplayName: String(profile?.robloxDisplayName || ""),
    robloxAvatarUrl: String(profile?.robloxAvatarUrl || ""),
    robloxProfileUrl: String(profile?.robloxProfileUrl || "")
  };

  await storeUser(nextUser);
  return nextUser;
}

export async function approveAdminUser({ targetUserId, role, actedByUser }) {
  if (!isValidAdminRole(role)) {
    throw createAdminError("Role is invalid");
  }

  if (role === "supreme" && actedByUser?.role !== "supreme") {
    throw createAdminError("Only a supreme admin can assign the supreme role", 403);
  }

  const targetUser = await readAdminUserById(targetUserId);

  if (!targetUser) {
    throw createAdminError("User was not found", 404);
  }

  if (targetUser.status !== "pending") {
    throw createAdminError("Only pending users can be approved");
  }

  const approvedAt = new Date().toISOString();
  const nextUser = {
    ...targetUser,
    status: "active",
    role,
    approvedAt,
    approvedBy: actedByUser.username
  };

  await storeUser(nextUser);
  await appendAdminAuditEvent({
    type: "user.approved",
    actorUser: actedByUser,
    targetUser: nextUser,
    details: {
      previousStatus: targetUser.status,
      nextStatus: nextUser.status,
      previousRole: targetUser.role,
      previousRoleLabel: getAdminRoleLabel(targetUser.role),
      nextRole: nextUser.role,
      nextRoleLabel: getAdminRoleLabel(nextUser.role)
    }
  });
  return buildSafeAdminUser(nextUser);
}

export async function rejectAdminUser({ targetUserId, actedByUser }) {
  const targetUser = await readAdminUserById(targetUserId);

  if (!targetUser) {
    throw createAdminError("User was not found", 404);
  }

  if (targetUser.status !== "pending") {
    throw createAdminError("Only pending users can be rejected");
  }

  const nextUser = {
    ...targetUser,
    status: "rejected"
  };

  await storeUser(nextUser);
  await appendAdminAuditEvent({
    type: "user.rejected",
    actorUser: actedByUser,
    targetUser: nextUser,
    details: {
      previousStatus: targetUser.status,
      nextStatus: nextUser.status,
      previousRole: targetUser.role,
      previousRoleLabel: getAdminRoleLabel(targetUser.role),
      nextRole: nextUser.role,
      nextRoleLabel: getAdminRoleLabel(nextUser.role)
    }
  });
  return buildSafeAdminUser(nextUser);
}

export async function updateAdminUserRole({ targetUserId, role, actedByUser }) {
  if (!isValidAdminRole(role)) {
    throw createAdminError("Role is invalid");
  }

  const targetUser = await readAdminUserById(targetUserId);

  if (!targetUser) {
    throw createAdminError("User was not found", 404);
  }

  if (targetUser.status !== "active") {
    throw createAdminError("Only active users can change role");
  }

  if (targetUser.id === actedByUser.id) {
    throw createAdminError("You cannot change your own role", 409);
  }

  if (
    actedByUser?.role !== "supreme" &&
    (targetUser.role === "supreme" || role === "supreme")
  ) {
    throw createAdminError("Only a supreme admin can change the supreme role", 403);
  }

  if (targetUser.role === "supreme" && role !== "supreme") {
    const activeSupremeUsers = await countActiveSupremeUsers();

    if (activeSupremeUsers <= 1) {
      throw createAdminError("At least one supreme admin must stay active", 409);
    }
  }

  const approvedAt = new Date().toISOString();
  const nextUser = {
    ...targetUser,
    role,
    approvedBy: actedByUser.username,
    approvedAt
  };

  await storeUser(nextUser);
  await appendAdminAuditEvent({
    type: "user.role_changed",
    actorUser: actedByUser,
    targetUser: nextUser,
    details: {
      previousRole: targetUser.role,
      previousRoleLabel: getAdminRoleLabel(targetUser.role),
      nextRole: nextUser.role,
      nextRoleLabel: getAdminRoleLabel(nextUser.role),
      previousStatus: targetUser.status,
      nextStatus: nextUser.status
    }
  });
  return buildSafeAdminUser(nextUser);
}

export function getAvailableAdminRoles(actedByUser = null) {
  const roles = listAdminRoles();

  if (!actedByUser || actedByUser.role === "supreme") {
    return roles;
  }

  return roles.filter((role) => role.value !== "supreme");
}
