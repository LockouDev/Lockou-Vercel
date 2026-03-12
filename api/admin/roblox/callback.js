import {
  completeRobloxOauthCallback,
  markRobloxOauthDenied
} from "../../../lib/admin-roblox-oauth.js";
import { isRobloxOauthEnabled } from "../../../lib/admin-roblox-config.js";

export default {
  async fetch(request) {
    if (!isRobloxOauthEnabled()) {
      return Response.redirect(new URL("/admin", request.url), 302);
    }

    const url = new URL(request.url);
    const code = String(url.searchParams.get("code") || "").trim();
    const state = String(url.searchParams.get("state") || "").trim();
    const oauthError = String(url.searchParams.get("error") || "").trim();
    const redirectUrl = new URL("/admin", request.url);

    if (oauthError) {
      if (oauthError === "access_denied") {
        try {
          const denied = await markRobloxOauthDenied(state);
          return Response.redirect(
            new URL(denied.nextPath || "/admin", request.url),
            302
          );
        } catch {
          return Response.redirect(redirectUrl, 302);
        }
      } else {
        redirectUrl.searchParams.set("oauth_error", oauthError);
      }

      return Response.redirect(redirectUrl, 302);
    }

    try {
      const result = await completeRobloxOauthCallback(code, state);
      return Response.redirect(
        new URL(result.nextPath || "/admin", request.url),
        302
      );
    } catch (error) {
      redirectUrl.searchParams.set(
        "oauth_error",
        error.message || "Roblox OAuth failed"
      );
      return Response.redirect(redirectUrl, 302);
    }
  }
};
