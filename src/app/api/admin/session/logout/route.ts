import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );

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
