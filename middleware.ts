import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/auth/login", "/auth/register"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Get token from cookie
  const token = request.cookies.get("token")?.value;

  // If accessing root, redirect to login or dashboard based on auth
  if (pathname === "/") {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } catch {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If accessing protected path without token, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // If accessing public path with valid token, redirect to dashboard
  if (isPublicPath && token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Redirect based on role
      if (payload.role === "TENANT") {
        return NextResponse.redirect(new URL("/dashboard/tenant", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    } catch {
      // Invalid token, allow access to login
      return NextResponse.next();
    }
  }

  // Verify token for protected routes
  if (!isPublicPath && token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(new URL("/auth/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
