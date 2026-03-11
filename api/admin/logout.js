import {
  clearSessionCookie,
  createJsonResponse,
  deleteAdminSession,
  getSessionTokenFromRequest
} from "../../lib/admin-auth.js";

export default {
  async fetch(request) {
    await deleteAdminSession(getSessionTokenFromRequest(request));

    return createJsonResponse(
      { ok: true },
      {
        status: 200,
        headers: {
          "set-cookie": clearSessionCookie()
        }
      }
    );
  }
};
