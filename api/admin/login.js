import {
  createJsonResponse,
  createSessionCookie,
  createSessionToken,
  getAccessCodeState,
  hasValidAccessCode
} from "../../lib/admin-auth.js";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return createJsonResponse(
        { error: "Method not allowed" },
        { status: 405, headers: { allow: "POST" } }
      );
    }

    if (!getAccessCodeState().ready) {
      return createJsonResponse(
        { error: "Admin access is not configured on the server yet" },
        { status: 500 }
      );
    }

    let payload;

    try {
      payload = await request.json();
    } catch {
      return createJsonResponse({ error: "Invalid JSON body" }, { status: 400 });
    }

    const accessCode = payload?.accessCode;

    if (!hasValidAccessCode(accessCode)) {
      return createJsonResponse(
        { error: "Invalid access code" },
        { status: 401 }
      );
    }

    const sessionToken = await createSessionToken();

    return createJsonResponse(
      { ok: true },
      {
        status: 200,
        headers: {
          "set-cookie": createSessionCookie(sessionToken)
        }
      }
    );
  }
};
