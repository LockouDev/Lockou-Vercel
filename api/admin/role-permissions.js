import {
  createJsonResponse,
  requireAdminSession
} from "../../lib/admin-auth.js";
import { appendAdminAuditEvent } from "../../lib/admin-audit.js";
import {
  getAdminPermissionLabel,
  getRolePermissionConfig,
  listAdminPermissions,
  listRolePermissionConfigs,
  setRolePermissions
} from "../../lib/admin-roles.js";

function createForbiddenResponse() {
  return createJsonResponse({ error: "Forbidden" }, { status: 403 });
}

async function buildPermissionsPayload() {
  return {
    availablePermissions: listAdminPermissions(),
    rolePermissions: await listRolePermissionConfigs()
  };
}

export default {
  async fetch(request) {
    const { session, response } = await requireAdminSession(request);

    if (response) {
      return response;
    }

    if (!session.capabilities.canManageRolePermissions) {
      return createForbiddenResponse();
    }

    if (request.method === "GET") {
      return createJsonResponse({
        ok: true,
        ...(await buildPermissionsPayload())
      });
    }

    if (request.method !== "POST") {
      return createJsonResponse(
        { error: "Method not allowed" },
        { status: 405, headers: { allow: "GET, POST" } }
      );
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return createJsonResponse({ error: "Invalid JSON body" }, { status: 400 });
    }

    const role = String(payload?.role || "").trim();
    const permissions = payload?.permissions;

    if (!role) {
      return createJsonResponse({ error: "role is required" }, { status: 400 });
    }

    try {
      const previousConfig = await getRolePermissionConfig(role);
      const nextConfig = await setRolePermissions(role, permissions, session.user);

      await appendAdminAuditEvent({
        type: "role.permissions_updated",
        actorUser: session.user,
        targetUser: {
          id: `role:${role}`,
          username: nextConfig.label,
          status: "role_template",
          role
        },
        details: {
          role,
          roleLabel: nextConfig.label,
          previousPermissions: previousConfig?.permissions || [],
          previousPermissionLabels: (previousConfig?.permissions || []).map(
            (permission) => getAdminPermissionLabel(permission)
          ),
          nextPermissions: nextConfig.permissions,
          nextPermissionLabels: nextConfig.permissions.map((permission) =>
            getAdminPermissionLabel(permission)
          )
        }
      });

      return createJsonResponse({
        ok: true,
        ...(await buildPermissionsPayload())
      });
    } catch (error) {
      return createJsonResponse(
        { error: error.message || "Failed to update role permissions" },
        { status: error.status || 400 }
      );
    }
  }
};
