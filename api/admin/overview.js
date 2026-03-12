import {
  createJsonResponse,
  requireAdminSession
} from "../../lib/admin-auth.js";
import { listAdminAuditEvents } from "../../lib/admin-audit.js";
import {
  listAdminLanguages,
  listAdminThemes,
  readAdminPreferences,
  saveAdminPreferences
} from "../../lib/admin-preferences.js";
import {
  listAdminPermissions,
  listRolePermissionConfigs
} from "../../lib/admin-roles.js";
import { getMigrationControlState } from "../../lib/admin-settings.js";
import {
  getAvailableAdminRoles,
  listActiveAdminUsers,
  listPendingAdminUsers
} from "../../lib/admin-users.js";
import { isRobloxOauthEnabled } from "../../lib/admin-roblox-config.js";

function buildActivityList(capabilities) {
  const activity = [];

  if (capabilities.canManageUsers) {
    activity.push("Approve new admin requests");
    activity.push("Adjust roles for the team");
    activity.push("Review recent permission changes");
  }

  if (capabilities.canManageRolePermissions) {
    activity.push("Customize what each admin role can access");
  }

  if (capabilities.canControlMigration) {
    activity.push("Control the Roblox migration flow");
  }

  if (capabilities.canReadRobloxData) {
    activity.push("Read Roblox DataStore entries");
  }

  return activity;
}

export default {
  async fetch(request) {
    const { session, response } = await requireAdminSession(request);

    if (response) {
      return response;
    }

    if (request.method === "POST") {
      let payload;

      try {
        payload = await request.json();
      } catch {
        return createJsonResponse({ error: "Invalid JSON body" }, { status: 400 });
      }

      const preferences = await saveAdminPreferences(session.user.id, {
        theme: String(payload?.theme || "").trim(),
        language: String(payload?.language || "").trim()
      });

      return createJsonResponse({
        ok: true,
        preferences,
        availableThemes: listAdminThemes(),
        availableLanguages: listAdminLanguages()
      });
    }

    if (request.method !== "GET") {
      return createJsonResponse(
        { error: "Method not allowed" },
        { status: 405, headers: { allow: "GET, POST" } }
      );
    }

    const migrationControl = session.capabilities.canControlMigration
      ? await getMigrationControlState()
      : null;

    const pendingUsers = session.capabilities.canManageUsers
      ? await listPendingAdminUsers()
      : [];

    const activeUsers = session.capabilities.canManageUsers
      ? await listActiveAdminUsers()
      : [];

    const auditEvents = session.capabilities.canManageUsers
      ? await listAdminAuditEvents(18)
      : [];

    const rolePermissions = session.capabilities.canManageRolePermissions
      ? await listRolePermissionConfigs()
      : [];

    const preferences = await readAdminPreferences(session.user.id);

    return createJsonResponse({
      heading: "Lockou Admin",
      environment: session.safeUser.roleLabel,
      updatedAt: new Date().toISOString(),
      currentUser: session.safeUser,
      robloxOauthEnabled: isRobloxOauthEnabled(),
      preferences,
      availableThemes: listAdminThemes(),
      availableLanguages: listAdminLanguages(),
      capabilities: session.capabilities,
      availableRoles: getAvailableAdminRoles(session.user),
      overviewCards: [
        {
          label: "Signed in as",
          value: session.safeUser.username
        },
        {
          label: "Role",
          value: session.safeUser.roleLabel
        },
        {
          label: "Pending requests",
          value: session.capabilities.canManageUsers
            ? String(pendingUsers.length)
            : "Hidden"
        },
        {
          label: "Game migration",
          value: migrationControl
            ? migrationControl.enabled
              ? "Enabled"
              : "Disabled"
            : "Hidden"
        }
      ],
      migrationControl,
      availablePermissions: session.capabilities.canManageRolePermissions
        ? listAdminPermissions()
        : [],
      rolePermissions,
      pendingUsers,
      activeUsers,
      auditEvents,
      activity: buildActivityList(session.capabilities)
    });
  }
};
