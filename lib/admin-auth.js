const SESSION_COOKIE_NAME = "lockou_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function safeCompare(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function readAccessCodes() {
  return (process.env.ADMIN_ACCESS_CODES || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

async function getSigningKey() {
  const secret = readSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is missing");
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
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

async function signValue(value) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return bytesToHex(signature);
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getAccessCodeState() {
  return {
    ready: readAccessCodes().length > 0 && Boolean(readSecret())
  };
}

export function hasValidAccessCode(accessCode) {
  const normalizedCode = typeof accessCode === "string" ? accessCode.trim() : "";

  if (!normalizedCode) {
    return false;
  }

  return readAccessCodes().some((allowedCode) =>
    safeCompare(normalizedCode, allowedCode)
  );
}

export async function createSessionToken() {
  const payload = {
    scope: "admin",
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  const payloadValue = encodeURIComponent(JSON.stringify(payload));
  const signature = await signValue(payloadValue);

  return `${payloadValue}.${signature}`;
}

export async function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payloadValue, signatureValue] = token.split(".");
  const signatureBytes = hexToBytes(signatureValue);

  if (!payloadValue || !signatureBytes) {
    return null;
  }

  const key = await getSigningKey();
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(payloadValue)
  );

  if (!isValid) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeURIComponent(payloadValue));

    if (payload.scope !== "admin" || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
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
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function isAuthenticatedRequest(request) {
  const token = getSessionTokenFromRequest(request);
  return Boolean(await verifySessionToken(token));
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
