import { getAdminCapabilities } from "./admin-roles.js";
import { buildSafeAdminUser, readAdminUserById } from "./admin-users.js";
import { runRedisCommand } from "./redis-rest.js";

const SESSION_COOKIE_NAME = "__Host-lksid";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_KEY_PREFIX = "lockou:admin:session:";

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function createRandomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function sessionKey(sessionToken) {
  return `${SESSION_KEY_PREFIX}${sessionToken}`;
}

async function readStoredSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const payload = await runRedisCommand(["get", sessionKey(sessionToken)]).catch(
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

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((accumulator, item) => {
    const [rawName, ...rawValue] = item.trim().split("=");

    if (!rawName) {
      return accumulator;
    }

    accumulator[rawName] = rawValue.join("=");
    return accumulator;
  }, {});
}

export function getSessionTokenFromRequest(request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies[SESSION_COOKIE_NAME] || "";
}

export function createSessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Priority=High; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Priority=High; Max-Age=0`;
}

export async function createAdminSession(user) {
  const sessionToken = createRandomToken();
  const payload = {
    id: sessionToken,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  };

  await runRedisCommand([
    "set",
    sessionKey(sessionToken),
    JSON.stringify(payload),
    "EX",
    SESSION_TTL_SECONDS
  ]);

  return sessionToken;
}

export async function deleteAdminSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  await runRedisCommand(["del", sessionKey(sessionToken)]).catch(() => null);
}

export async function readAuthenticatedSessionFromToken(sessionToken) {
  const storedSession = await readStoredSession(sessionToken);

  if (!storedSession || storedSession.expiresAt <= Date.now()) {
    await deleteAdminSession(sessionToken);
    return null;
  }

  const user = await readAdminUserById(storedSession.userId);

  if (!user || user.status !== "active") {
    await deleteAdminSession(sessionToken);
    return null;
  }

  const safeUser = await buildSafeAdminUser(user);
  const capabilities = await getAdminCapabilities(user, safeUser.permissions);

  return {
    token: sessionToken,
    expiresAt: storedSession.expiresAt,
    user,
    safeUser,
    capabilities
  };
}

export async function getAuthenticatedSession(request) {
  return readAuthenticatedSessionFromToken(getSessionTokenFromRequest(request));
}

export async function verifySessionToken(sessionToken) {
  return readAuthenticatedSessionFromToken(sessionToken);
}

export async function isAuthenticatedRequest(request) {
  return Boolean(await getAuthenticatedSession(request));
}

export function hasSessionPermission(session, permission) {
  return Boolean(session?.safeUser?.permissions?.includes(permission));
}

export async function requireAdminSession(request, permission = "") {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return {
      session: null,
      response: createJsonResponse({ error: "Unauthorized" }, { status: 401 })
    };
  }

  if (permission && !hasSessionPermission(session, permission)) {
    return {
      session: null,
      response: createJsonResponse({ error: "Forbidden" }, { status: 403 })
    };
  }

  return {
    session,
    response: null
  };
}

export function createJsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}
