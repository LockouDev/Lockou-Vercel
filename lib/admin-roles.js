import { hasRedisConfig, runRedisCommand } from "./redis-rest.js";

const ROLE_PERMISSIONS_KEY_PREFIX = "lockou:admin:role:permissions:";

export const ADMIN_PERMISSION_DEFINITIONS = {
  "admin.users.manage": {
    label: "Manage admin accounts",
    description: "Approve requests and change admin roles"
  },
  "migration.control.write": {
    label: "Control Roblox migration",
    description: "Enable or disable the Roblox data migration flow"
  },
  "roblox.data.read": {
    label: "Read Roblox DataStore data",
    description: "Read player data from Roblox Open Cloud"
  }
};

export const ADMIN_ROLES = {
  supreme: {
    label: "Supreme",
    editable: false,
    note: "Supreme stays fixed to prevent lockout",
    defaultPermissions: [
      "admin.users.manage",
      "migration.control.write",
      "roblox.data.read"
    ]
  },
  moderator: {
    label: "Moderator",
    editable: true,
    note: "Use this role for trusted admins that need live controls",
    defaultPermissions: ["migration.control.write", "roblox.data.read"]
  },
  reader: {
    label: "Basic Admin",
    editable: true,
    note: "Use this role for low risk admin access",
    defaultPermissions: ["roblox.data.read"]
  }
};

const ADMIN_PERMISSION_ORDER = Object.keys(ADMIN_PERMISSION_DEFINITIONS);

function createRoleError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function rolePermissionsKey(role) {
  return `${ROLE_PERMISSIONS_KEY_PREFIX}${role}`;
}

function isValidAdminPermission(permission) {
  return Object.prototype.hasOwnProperty.call(
    ADMIN_PERMISSION_DEFINITIONS,
    permission
  );
}

function normalizePermissions(permissions) {
  const uniquePermissions = Array.from(
    new Set(
      (Array.isArray(permissions) ? permissions : [])
        .map((permission) => String(permission || "").trim())
        .filter(Boolean)
        .filter((permission) => isValidAdminPermission(permission))
    )
  );

  return ADMIN_PERMISSION_ORDER.filter((permission) =>
    uniquePermissions.includes(permission)
  );
}

function arePermissionsEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((permission, index) => permission === right[index]);
}

function parseStoredRolePermissions(payload) {
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload);

    if (Array.isArray(parsed)) {
      return {
        permissions: normalizePermissions(parsed),
        updatedAt: "",
        updatedBy: ""
      };
    }

    if (Array.isArray(parsed?.permissions)) {
      return {
        permissions: normalizePermissions(parsed.permissions),
        updatedAt: String(parsed.updatedAt || ""),
        updatedBy: String(parsed.updatedBy || "")
      };
    }
  } catch {
    return null;
  }

  return null;
}

function buildRolePermissionConfig(role, storedPermissions = null) {
  const definition = ADMIN_ROLES[role];
  const defaultPermissions = normalizePermissions(
    definition?.defaultPermissions || []
  );
  const configuredPermissions = storedPermissions?.permissions || defaultPermissions;
  const permissions = normalizePermissions(configuredPermissions);
  const usesDefault = arePermissionsEqual(permissions, defaultPermissions);

  return {
    role,
    label: definition?.label || "Unknown",
    editable: Boolean(definition?.editable),
    note: definition?.note || "",
    defaultPermissions,
    permissions: usesDefault ? defaultPermissions : permissions,
    usesDefault,
    updatedAt: usesDefault ? "" : String(storedPermissions?.updatedAt || ""),
    updatedBy: usesDefault ? "" : String(storedPermissions?.updatedBy || "")
  };
}

export function listAdminPermissions() {
  return ADMIN_PERMISSION_ORDER.map((value) => ({
    value,
    label: ADMIN_PERMISSION_DEFINITIONS[value].label,
    description: ADMIN_PERMISSION_DEFINITIONS[value].description
  }));
}

export function listAdminRoles() {
  return Object.entries(ADMIN_ROLES).map(([value, definition]) => ({
    value,
    label: definition.label
  }));
}

export function isValidAdminRole(role) {
  return Object.prototype.hasOwnProperty.call(ADMIN_ROLES, role);
}

export function getAdminRoleLabel(role) {
  return ADMIN_ROLES[role]?.label || "Unknown";
}

export function getAdminPermissionLabel(permission) {
  return ADMIN_PERMISSION_DEFINITIONS[permission]?.label || permission;
}

export async function getRolePermissionConfig(role) {
  if (!isValidAdminRole(role)) {
    return null;
  }

  if (!hasRedisConfig() || !ADMIN_ROLES[role].editable) {
    return buildRolePermissionConfig(role);
  }

  const payload = await runRedisCommand(["get", rolePermissionsKey(role)]).catch(
    () => null
  );

  return buildRolePermissionConfig(role, parseStoredRolePermissions(payload));
}

export async function listRolePermissionConfigs() {
  return Promise.all(
    Object.keys(ADMIN_ROLES).map((role) => getRolePermissionConfig(role))
  );
}

export async function getPermissionsForRole(role) {
  const config = await getRolePermissionConfig(role);
  return config?.permissions || [];
}

export async function setRolePermissions(role, permissions, actedByUser) {
  if (!isValidAdminRole(role)) {
    throw createRoleError("Role is invalid");
  }

  if (!ADMIN_ROLES[role].editable) {
    throw createRoleError("This role stays fixed and cannot be edited", 409);
  }

  if (!Array.isArray(permissions)) {
    throw createRoleError("permissions must be an array");
  }

  const invalidPermission = permissions
    .map((permission) => String(permission || "").trim())
    .find((permission) => permission && !isValidAdminPermission(permission));

  if (invalidPermission) {
    throw createRoleError(`Unknown permission: ${invalidPermission}`);
  }

  const normalizedPermissions = normalizePermissions(permissions);
  const defaultPermissions = normalizePermissions(
    ADMIN_ROLES[role].defaultPermissions
  );

  if (!hasRedisConfig()) {
    throw createRoleError(
      "Role permissions need Redis to be configured on Vercel",
      500
    );
  }

  if (arePermissionsEqual(normalizedPermissions, defaultPermissions)) {
    await runRedisCommand(["del", rolePermissionsKey(role)]).catch(() => null);
    return buildRolePermissionConfig(role);
  }

  const storedPermissions = {
    permissions: normalizedPermissions,
    updatedAt: new Date().toISOString(),
    updatedBy: actedByUser?.username || ""
  };

  await runRedisCommand([
    "set",
    rolePermissionsKey(role),
    JSON.stringify(storedPermissions)
  ]);

  return buildRolePermissionConfig(role, storedPermissions);
}

export async function hasPermission(user, permission, resolvedPermissions = null) {
  if (!user || user.status !== "active") {
    return false;
  }

  const permissions = Array.isArray(resolvedPermissions)
    ? resolvedPermissions
    : await getPermissionsForRole(user.role);

  return permissions.includes(permission);
}

export async function getAdminCapabilities(user, resolvedPermissions = null) {
  const permissions = Array.isArray(resolvedPermissions)
    ? resolvedPermissions
    : await getPermissionsForRole(user?.role);

  const isActive = Boolean(user && user.status === "active");

  return {
    permissions,
    canManageUsers: isActive && permissions.includes("admin.users.manage"),
    canControlMigration:
      isActive && permissions.includes("migration.control.write"),
    canReadRobloxData: isActive && permissions.includes("roblox.data.read"),
    canManageRolePermissions: isActive && user?.role === "supreme"
  };
}
