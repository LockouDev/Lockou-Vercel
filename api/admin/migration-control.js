import {
  createJsonResponse,
  requireAdminSession
} from "../../lib/admin-auth.js";
import {
  getMigrationControlState,
  setMigrationControlState
} from "../../lib/admin-settings.js";

export default {
  async fetch(request) {
    const { response } = await requireAdminSession(
      request,
      "migration.control.write"
    );

    if (response) {
      return response;
    }

    if (request.method === "GET") {
      const state = await getMigrationControlState();

      return createJsonResponse({
        ok: true,
        ...state
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

    if (typeof payload?.enabled !== "boolean") {
      return createJsonResponse(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    try {
      const state = await setMigrationControlState(payload.enabled);

      return createJsonResponse({
        ok: true,
        ...state
      });
    } catch (error) {
      return createJsonResponse(
        {
          error: error.message || "Failed to update the migration control setting"
        },
        { status: error.status || 409 }
      );
    }
  }
};
