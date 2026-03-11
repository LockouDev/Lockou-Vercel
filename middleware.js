import {
  createJsonResponse,
  getAuthenticatedSession
} from "./lib/admin-auth.js";

export const config = {
  matcher: ["/admin", "/admin.html", "/api/admin/:path*"]
};

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/admin/login" || pathname === "/api/admin/register") {
    return;
  }

  const session = await getAuthenticatedSession(request);

  if (session) {
    return;
  }

  if (pathname.startsWith("/api/admin/")) {
    return createJsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin-login", request.url);
  loginUrl.searchParams.set("next", pathname === "/admin.html" ? "/admin" : pathname);

  return Response.redirect(loginUrl, 307);
}
