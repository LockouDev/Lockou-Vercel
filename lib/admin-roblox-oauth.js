import {
  readAdminUserById,
  updateAdminRobloxOauthDecision,
  updateAdminRobloxProfile
} from "./admin-users.js";
import { runRedisCommand } from "./redis-rest.js";

const ROBLOX_OAUTH_BASE_URL = "https://apis.roblox.com/oauth";
const OAUTH_STATE_KEY_PREFIX = "lockou:admin:roblox_oauth_state:";
const OAUTH_STATE_TTL_SECONDS = 600;

function createOauthError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createRandomToken(size = 24) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readOauthConfig() {
  return {
    clientId: String(process.env.ROBLOX_OAUTH_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.ROBLOX_OAUTH_CLIENT_SECRET || "").trim(),
    redirectUri: String(process.env.ROBLOX_OAUTH_REDIRECT_URI || "").trim(),
    scopes: String(process.env.ROBLOX_OAUTH_SCOPES || "openid profile").trim()
  };
}

function stateKey(state) {
  return `${OAUTH_STATE_KEY_PREFIX}${state}`;
}

function validateRobloxOauthConfig() {
  const config = readOauthConfig();

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw createOauthError(
      "Roblox OAuth is not configured, add the Roblox OAuth env vars on Vercel",
      500
    );
  }

  return config;
}

export async function createRobloxOauthState(userId, nextPath = "/admin") {
  const state = createRandomToken();

  await runRedisCommand([
    "set",
    stateKey(state),
    JSON.stringify({
      userId,
      nextPath:
        String(nextPath || "").startsWith("/") && !String(nextPath || "").startsWith("//")
          ? String(nextPath)
          : "/admin",
      createdAt: new Date().toISOString()
    }),
    "EX",
    OAUTH_STATE_TTL_SECONDS
  ]);

  return state;
}

export function buildRobloxAuthorizeUrl(state) {
  const config = validateRobloxOauthConfig();
  const url = new URL(`${ROBLOX_OAUTH_BASE_URL}/v1/authorize`);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function consumeRobloxOauthState(state) {
  const payload = await runRedisCommand(["get", stateKey(state)]).catch(() => null);
  await runRedisCommand(["del", stateKey(state)]).catch(() => null);

  if (!payload) {
    throw createOauthError("Roblox OAuth state is invalid or expired", 400);
  }

  try {
    return JSON.parse(payload);
  } catch {
    throw createOauthError("Roblox OAuth state is invalid", 400);
  }
}

async function exchangeCodeForTokens(code) {
  const config = validateRobloxOauthConfig();
  const response = await fetch(`${ROBLOX_OAUTH_BASE_URL}/v1/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.access_token) {
    throw createOauthError(
      payload?.error_description ||
        payload?.error ||
        "Failed to exchange the Roblox OAuth code",
      response.status || 502
    );
  }

  return payload;
}

async function readRobloxUserInfo(accessToken) {
  const response = await fetch(`${ROBLOX_OAUTH_BASE_URL}/v1/userinfo`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.sub) {
    throw createOauthError(
      payload?.error_description ||
        payload?.error ||
        "Failed to read Roblox profile information",
      response.status || 502
    );
  }

  return payload;
}

export async function completeRobloxOauthCallback(code, state) {
  if (!code || !state) {
    throw createOauthError("Missing Roblox OAuth code or state", 400);
  }

  const statePayload = await consumeRobloxOauthState(state);
  const user = await readAdminUserById(statePayload.userId);

  if (!user || user.status !== "active") {
    throw createOauthError("Admin user was not found", 404);
  }

  const tokens = await exchangeCodeForTokens(code);
  const userInfo = await readRobloxUserInfo(tokens.access_token);

  const updatedUser = await updateAdminRobloxProfile(user.id, {
    robloxUserId: String(userInfo.sub || ""),
    robloxUsername: String(
      userInfo.preferred_username || userInfo.name || userInfo.nickname || ""
    ),
    robloxDisplayName: String(userInfo.name || userInfo.nickname || ""),
    robloxAvatarUrl: String(userInfo.picture || ""),
    robloxProfileUrl: String(userInfo.profile || "")
  });

  return {
    user: updatedUser,
    nextPath: statePayload.nextPath || "/admin"
  };
}

export async function markRobloxOauthDenied(state) {
  if (!state) {
    throw createOauthError("Missing Roblox OAuth state", 400);
  }

  const statePayload = await consumeRobloxOauthState(state);
  const user = await readAdminUserById(statePayload.userId);

  if (!user || user.status !== "active") {
    throw createOauthError("Admin user was not found", 404);
  }

  await updateAdminRobloxOauthDecision(user.id, "denied");

  return {
    userId: user.id,
    nextPath: statePayload.nextPath || "/admin"
  };
}
