import {
  clearSessionCookie,
  createJsonResponse
} from "../../lib/admin-auth.js";

export default {
  fetch() {
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
