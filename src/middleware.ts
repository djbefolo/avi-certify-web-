import { NextRequest, NextResponse } from "next/server";
import { verifyAdminGuardValue } from "@/lib/admin/admin-session-guard";

const ADMIN_NOINDEX_HEADER = "noindex, nofollow, noarchive";

function withAdminNoindex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", ADMIN_NOINDEX_HEADER);

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return withAdminNoindex(NextResponse.next());
  }

  const hasAdminSession = request.cookies.has("avi_admin_session");
  const adminGuard = await verifyAdminGuardValue(
    request.cookies.get("avi_admin_guard")?.value,
  );

  if (!hasAdminSession || !adminGuard) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);

    return withAdminNoindex(NextResponse.redirect(loginUrl));
  }

  return withAdminNoindex(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
