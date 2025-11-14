import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"

// Define role-based route access
const roleRouteMap: Record<string, UserRole[]> = {
  "/dashboard/admin": ["ADMIN"],
  "/dashboard/manager": ["ADMIN", "MANAGER"],
  "/dashboard/storekeeper": ["ADMIN", "MANAGER", "STOREKEEPER"],
  "/dashboard/technical": ["ADMIN", "MANAGER", "TECHNICAL"],
  "/dashboard/caretaker": ["ADMIN", "MANAGER", "CARETAKER"],
  "/dashboard/tenant": ["ADMIN", "MANAGER", "TENANT"],
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Check if the path requires role-based access
    for (const [route, allowedRoles] of Object.entries(roleRouteMap)) {
      if (path.startsWith(route)) {
        if (token && !allowedRoles.includes(token.role as UserRole)) {
          // Redirect to their appropriate dashboard
          const userRole = token.role as UserRole
          const dashboardPaths: Record<UserRole, string> = {
            ADMIN: "/dashboard/admin",
            MANAGER: "/dashboard/manager",
            STOREKEEPER: "/dashboard/storekeeper",
            TECHNICAL: "/dashboard/technical",
            CARETAKER: "/dashboard/caretaker",
            TENANT: "/dashboard/tenant",
          }
          return NextResponse.redirect(
            new URL(dashboardPaths[userRole] || "/", req.url)
          )
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*"
  ],
}
