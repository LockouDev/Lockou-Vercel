import { requireAdminSession } from "../../../lib/admin-auth.js";
import {
  buildRobloxAuthorizeUrl,
  createRobloxOauthState
} from "../../../lib/admin-roblox-oauth.js";

export default {
  async fetch(request) {
    const { session, response } = await requireAdminSession(request);

    if (response) {
      return response;
    }

    try {
      const url = new URL(request.url);
      const nextPath = String(url.searchParams.get("next") || "/admin");
      const state = await createRobloxOauthState(session.user.id, nextPath);
      return Response.redirect(buildRobloxAuthorizeUrl(state), 302);
    } catch (error) {
      const url = new URL("/admin", request.url);
      url.searchParams.set("oauth_error", error.message || "Roblox OAuth failed");
      return Response.redirect(url, 302);
    }
  }
};
