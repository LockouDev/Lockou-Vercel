import { completeRobloxOauthCallback } from "../../../lib/admin-roblox-oauth.js";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const code = String(url.searchParams.get("code") || "").trim();
    const state = String(url.searchParams.get("state") || "").trim();
    const oauthError = String(url.searchParams.get("error") || "").trim();
    const redirectUrl = new URL("/admin", request.url);

    if (oauthError) {
      redirectUrl.searchParams.set("oauth_error", oauthError);
      return Response.redirect(redirectUrl, 302);
    }

    try {
      await completeRobloxOauthCallback(code, state);
      redirectUrl.searchParams.set("oauth_success", "roblox_connected");
      return Response.redirect(redirectUrl, 302);
    } catch (error) {
      redirectUrl.searchParams.set(
        "oauth_error",
        error.message || "Roblox OAuth failed"
      );
      return Response.redirect(redirectUrl, 302);
    }
  }
};
