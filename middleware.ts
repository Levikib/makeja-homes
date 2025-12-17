import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  
  const publicPaths = [
    "/",                      
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/contact",               
  ];
  
  const isPublicPath = publicPaths.some((path) => 
    pathname === path || pathname.startsWith(path + "/")
  );

  // Get token from cookie
  const token = request.cookies.get("token")?.value;

  //  Allow public paths without authentication
  if (isPublicPath) {
    //  Only redirect logged-in users away from auth pages (login/register)
    if (token && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register"))) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        // Redirect based on role
        if (payload.role === "TENANT") {
          return NextResponse.redirect(new URL("/dashboard/tenant", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } catch {
        // Invalid token, allow access to auth pages
        return NextResponse.next();
      }
    }
    // Allow access to all other public paths (landing page, contact, etc.)
    return NextResponse.next();
  }

  //  Protected routes - require authentication
 
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Verify token for protected routes
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

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};