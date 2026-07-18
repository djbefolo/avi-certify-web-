import { NextRequest, NextResponse } from "next/server";
import { verifyAdminGuardValue } from "@/lib/admin/admin-session-guard";

const ADMIN_NOINDEX_HEADER = "noindex, nofollow, noarchive";

function withAdminNoindex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", ADMIN_NOINDEX_HEADER);

  return response;
}

function clearAdminCookies(response: NextResponse) {
  response.cookies.set("avi_admin_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("avi_admin_guard", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

function isPlausibleFirebaseSessionCookie(value: string | undefined) {
  if (!value) return false;

  const parts = value.split(".");

  return parts.length === 3 && parts.every((part) => part.length >= 20);
}

function redirectToAdminLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return clearAdminCookies(withAdminNoindex(NextResponse.redirect(loginUrl)));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return withAdminNoindex(NextResponse.next());
  }

  const hasAdminSession = isPlausibleFirebaseSessionCookie(
    request.cookies.get("avi_admin_session")?.value,
  );
  const adminGuard = await verifyAdminGuardValue(
    request.cookies.get("avi_admin_guard")?.value,
  );

  if (!hasAdminSession || !adminGuard) {
    return redirectToAdminLogin(request);
  }

  return withAdminNoindex(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
