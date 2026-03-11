import {
  createAdminSession,
  createJsonResponse,
  createSessionCookie
} from "../../lib/admin-auth.js";
import {
  buildSafeAdminUser,
  ensureBootstrapAdmin,
  markAdminLastLogin,
  readAdminUserByUsername,
  verifyAdminPassword
} from "../../lib/admin-users.js";

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

    if (!username || !password) {
      return createJsonResponse(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    try {
      await ensureBootstrapAdmin(username, password);
      let user = await readAdminUserByUsername(username);

      if (!user) {
        return createJsonResponse(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      if (user.status === "pending") {
        return createJsonResponse(
          { error: "Your access request is still pending approval" },
          { status: 403 }
        );
      }

      if (user.status !== "active") {
        return createJsonResponse(
          { error: "This account is not allowed to sign in" },
          { status: 403 }
        );
      }

      const passwordMatches = await verifyAdminPassword(user, password);

      if (!passwordMatches) {
        return createJsonResponse(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      user = await markAdminLastLogin(user);
      const sessionToken = await createAdminSession(user);

      return createJsonResponse(
        {
          ok: true,
          user: await buildSafeAdminUser(user)
        },
        {
          status: 200,
          headers: {
            "set-cookie": createSessionCookie(sessionToken)
          }
        }
      );
    } catch (error) {
      return createJsonResponse(
        {
          error: error.message || "Login failed"
        },
        { status: error.status || 500 }
      );
    }
  }
};
