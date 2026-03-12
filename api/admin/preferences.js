import {
  createJsonResponse,
  requireAdminSession
} from "../../lib/admin-auth.js";
import {
  listAdminLanguages,
  listAdminThemes,
  readAdminPreferences,
  saveAdminPreferences
} from "../../lib/admin-preferences.js";

export default {
  async fetch(request) {
    const { session, response } = await requireAdminSession(request);

    if (response) {
      return response;
    }

    if (request.method === "GET") {
      const preferences = await readAdminPreferences(session.user.id);

      return createJsonResponse({
        preferences,
        availableThemes: listAdminThemes(),
        availableLanguages: listAdminLanguages()
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
};
