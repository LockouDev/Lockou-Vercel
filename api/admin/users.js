import {
  createJsonResponse,
  requireAdminSession
} from "../../lib/admin-auth.js";
import {
  approveAdminUser,
  listActiveAdminUsers,
  listPendingAdminUsers,
  rejectAdminUser,
  updateAdminUserRole
} from "../../lib/admin-users.js";

async function buildUsersPayload() {
  return {
    pendingUsers: await listPendingAdminUsers(),
    activeUsers: await listActiveAdminUsers()
  };
}

export default {
  async fetch(request) {
    const { session, response } = await requireAdminSession(
      request,
      "admin.users.manage"
    );

    if (response) {
      return response;
    }

    if (request.method === "GET") {
      return createJsonResponse({
        ok: true,
        ...(await buildUsersPayload())
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

    const action = String(payload?.action || "").trim();
    const userId = String(payload?.userId || "").trim();
    const role = String(payload?.role || "").trim();

    if (!action || !userId) {
      return createJsonResponse(
        { error: "action and userId are required" },
        { status: 400 }
      );
    }

    try {
      if (action === "approve") {
        await approveAdminUser({
          targetUserId: userId,
          role,
          actedByUser: session.user
        });
      } else if (action === "reject") {
        await rejectAdminUser({ targetUserId: userId, actedByUser: session.user });
      } else if (action === "set_role") {
        await updateAdminUserRole({
          targetUserId: userId,
          role,
          actedByUser: session.user
        });
      } else {
        return createJsonResponse({ error: "Unknown action" }, { status: 400 });
      }

      return createJsonResponse({
        ok: true,
        ...(await buildUsersPayload())
      });
    } catch (error) {
      return createJsonResponse(
        { error: error.message || "User action failed" },
        { status: error.status || 400 }
      );
    }
  }
};
