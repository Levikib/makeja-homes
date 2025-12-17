import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
);

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
];

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, reason: "invalid" };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  
  // Get token from cookie
  const token = request.cookies.get("token")?.value;

  console.log(`[Middleware] Path: ${pathname}, Has Token: ${!!token}, Is Public: ${isPublicPath}`);

  // ========================================
  // CASE 1: Root path (/)
  // ========================================
  if (pathname === "/") {
    if (!token) {
      console.log("[Middleware] No token at root - redirecting to login");
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const verification = await verifyToken(token);
    
    if (!verification.valid) {
      console.log(`[Middleware] Invalid token at root (${verification.reason}) - redirecting to login`);
      const response = NextResponse.redirect(new URL("/auth/login", request.url));
      response.cookies.delete("token");
      return response;
    }

    // Valid token - redirect to appropriate dashboard
    console.log(`[Middleware] Valid token at root - redirecting to dashboard (role: ${verification.payload?.role})`);
    if (verification.payload?.role === "TENANT") {
      return NextResponse.redirect(new URL("/dashboard/tenant", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  // ========================================
  // CASE 2: Accessing public path (login, register, etc.)
  // ========================================
  if (isPublicPath) {
    if (!token) {
      // No token - allow access to public path
      console.log("[Middleware] No token at public path - allowing access");
      return NextResponse.next();
    }

    const verification = await verifyToken(token);

    if (!verification.valid) {
      // Invalid/expired token - clear it and allow access
      console.log(`[Middleware] Invalid token at public path (${verification.reason}) - clearing and allowing`);
      const response = NextResponse.next();
      response.cookies.delete("token");
      return response;
    }

    // Valid token at public path - redirect to dashboard (except for change-password)
    if (pathname === "/auth/change-password") {
      console.log("[Middleware] Valid token at change-password - allowing");
      return NextResponse.next();
    }

    console.log(`[Middleware] Valid token at public path - redirecting to dashboard (role: ${verification.payload?.role})`);
    if (verification.payload?.role === "TENANT") {
      return NextResponse.redirect(new URL("/dashboard/tenant", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  // ========================================
  // CASE 3: Protected path (dashboard, etc.)
  // ========================================
  if (!token) {
    console.log("[Middleware] No token at protected path - redirecting to login");
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const verification = await verifyToken(token);

  if (!verification.valid) {
    console.log(`[Middleware] Invalid token at protected path (${verification.reason}) - redirecting to login`);
    const expiredParam = verification.reason === "expired" ? "?session=expired" : "";
    const response = NextResponse.redirect(new URL(`/auth/login${expiredParam}`, request.url));
    response.cookies.delete("token");
    return response;
  }

  // Valid token - allow access
  console.log("[Middleware] Valid token at protected path - allowing access");
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
