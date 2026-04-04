import { ReactNode } from "react"

// Standalone layout for unauthenticated super-admin routes (login page)
// This intentionally does NOT include the sidebar or auth check
export default function SuperAdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      {children}
    </div>
  )
}
