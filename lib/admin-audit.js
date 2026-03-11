import { getAdminRoleLabel } from "./admin-roles.js";
import { hasRedisConfig, runRedisCommand } from "./redis-rest.js";

const AUDIT_LIST_KEY = "lockou:admin:audit";
const AUDIT_LIST_LIMIT = 120;

function createAuditSubject(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    status: user.status || "",
    role: user.role || "",
    roleLabel: getAdminRoleLabel(user.role)
  };
}

function normalizeAuditLimit(limit) {
  const parsed = Number.parseInt(limit, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, AUDIT_LIST_LIMIT);
}

export async function appendAdminAuditEvent({
  type,
  actorUser,
  targetUser,
  details = {}
}) {
  if (!hasRedisConfig()) {
    return null;
  }

  const event = {
    id: crypto.randomUUID(),
    type: String(type || "").trim(),
    actor: createAuditSubject(actorUser),
    target: createAuditSubject(targetUser),
    details,
    createdAt: new Date().toISOString()
  };

  if (!event.type) {
    return null;
  }

  await runRedisCommand(["lpush", AUDIT_LIST_KEY, JSON.stringify(event)]);
  await runRedisCommand([
    "ltrim",
    AUDIT_LIST_KEY,
    "0",
    String(AUDIT_LIST_LIMIT - 1)
  ]).catch(() => null);

  return event;
}

export async function listAdminAuditEvents(limit = 20) {
  if (!hasRedisConfig()) {
    return [];
  }

  const normalizedLimit = normalizeAuditLimit(limit);
  const entries = await runRedisCommand([
    "lrange",
    AUDIT_LIST_KEY,
    "0",
    String(normalizedLimit - 1)
  ]).catch(() => []);

  return entries.reduce((events, entry) => {
    try {
      const parsed = JSON.parse(entry);

      if (parsed?.id && parsed?.type) {
        events.push(parsed);
      }
    } catch {
      return events;
    }

    return events;
  }, []);
}
