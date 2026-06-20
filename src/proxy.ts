import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;

  if (path === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isLogin = path.startsWith("/login");
  const isAuthApi = path.startsWith("/api/auth");

  const isAdminRoute =
    path.startsWith("/admin-dashboard") ||
    path.startsWith("/members") ||
    path.startsWith("/attendance") ||
    path.startsWith("/reports") ||
    path.startsWith("/settings");

  const isMemberRoute =
    path.startsWith("/member-dashboard") ||
    path.startsWith("/mark-attendance") ||
    path.startsWith("/my-records") ||
    path.startsWith("/activity");

  if (!token && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isLogin) {
    const role = (token as { role?: string }).role;
    if (role === "ADMIN" || role === "SUPERADMIN") {
      return NextResponse.redirect(new URL("/admin-dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/member-dashboard", req.url));
  }

  const role = (token as { role?: string })?.role;

  if ((role === "ADMIN" || role === "SUPERADMIN") && isMemberRoute) {
    return NextResponse.redirect(new URL("/admin-dashboard", req.url));
  }

  if ((role === "MEMBER" || role === "INCHARGE") && isAdminRoute) {
    return NextResponse.redirect(new URL("/member-dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin-dashboard/:path*",
    "/members/:path*",
    "/attendance/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/member-dashboard/:path*",
    "/mark-attendance/:path*",
    "/my-records/:path*",
    "/activity/:path*",
    "/change-password/:path*",
  ],
};
