import { NextResponse, type NextRequest } from "next/server";

// Simple role-based guard using cookies (mock auth) for demo purposes.
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;

  const isAdminRoute = path.startsWith("/dashboard") || path.startsWith("/documents") || path.startsWith("/settings");

  const authenticated = request.cookies.get("authenticated")?.value === "true";
  const role = (request.cookies.get("role")?.value as "admin" | "user" | undefined) || undefined;

  // Root: always land on chat if authenticated, otherwise login
  if (path === "/") {
    const dest = authenticated ? "/chat" : "/login";
    if (url.pathname !== dest) {
      const redirectUrl = new URL(dest, url.origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Prevent visiting login/signup when already authenticated
  if (authenticated && (path === "/login" || path === "/signup")) {
    const redirectUrl = new URL("/chat", url.origin);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute) {
    if (!authenticated) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "admin") {
      const noAccess = new URL("/chat", url.origin);
      return NextResponse.redirect(noAccess);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/documents/:path*"],
};


