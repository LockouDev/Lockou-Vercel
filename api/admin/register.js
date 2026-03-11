import { createJsonResponse } from "../../lib/admin-auth.js";
import { createPendingAdminUser } from "../../lib/admin-users.js";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return createJsonResponse(
        { error: "Method not allowed" },
        { status: 405, headers: { allow: "POST" } }
      );
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return createJsonResponse({ error: "Invalid JSON body" }, { status: 400 });
    }

    const username = String(payload?.username || "").trim();
    const password = String(payload?.password || "");

    try {
      const user = await createPendingAdminUser({ username, password });

      return createJsonResponse(
        {
          ok: true,
          user,
          message: "Access request sent, wait for a supreme admin to approve it"
        },
        { status: 201 }
      );
    } catch (error) {
      return createJsonResponse(
        {
          error: error.message || "Failed to create the access request"
        },
        { status: error.status || 500 }
      );
    }
  }
};
