import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export interface SuperAdminSession {
  id: string
  email: string
  firstName: string
  lastName: string
  saRole: 'OWNER' | 'VIEWER'
}

export async function getSuperAdminSession(req: NextRequest): Promise<SuperAdminSession | null> {
  // Legacy header secret (server-to-server / cron)
  const headerSecret = req.headers.get('x-super-admin-secret')
  if (headerSecret && (headerSecret === process.env.SUPER_ADMIN_PASSWORD || headerSecret === process.env.SUPER_ADMIN_SECRET)) {
    return { id: 'system', email: 'system', firstName: 'System', lastName: '', saRole: 'OWNER' }
  }

  const token = req.cookies.get('super_admin_token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.role !== 'super_admin') return null
    return {
      id: payload.sub as string,
      email: payload.email as string,
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
      saRole: (payload.saRole as 'OWNER' | 'VIEWER') ?? 'VIEWER',
    }
  } catch {
    return null
  }
}

/** Returns 401 response if not authenticated, null if ok */
export async function requireSuperAdmin(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return { session: null, error: Response }
  return { session, error: null }
}
