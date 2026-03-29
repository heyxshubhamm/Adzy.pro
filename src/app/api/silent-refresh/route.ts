import { NextRequest, NextResponse } from "next/server";

// Layer 1: Middleware Synchronization (Silent-Refresh Core)
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/refresh`, {
    method:  "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
  });

  if (!res.ok) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  // Layer 2: Transport Layer Sync (Set-Cookie Forwarding)
  const response = NextResponse.redirect(new URL(next, req.url));
  res.headers.getSetCookie().forEach(cookie => {
    response.headers.append("Set-Cookie", cookie);
  });
  return response;
}
