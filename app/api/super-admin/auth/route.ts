import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getSuperAdminByEmail, updateLastLogin, seedOwnerIfEmpty } from '@/lib/super-admin-db'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'super_admin_token'
const SESSION_HOURS = 12

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

async function issueToken(user: { id: string; email: string; role: string; firstName: string; lastName: string }) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: 'super_admin',
    saRole: user.role,   // OWNER or VIEWER
    firstName: user.firstName,
    lastName: user.lastName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(JWT_SECRET)
}

/**
 * POST /api/super-admin/auth
 * Body: { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Seed owner from env on first boot (no-op if users already exist)
    await seedOwnerIfEmpty()

    const user = await getSuperAdminByEmail(email)
    if (!user) {
      // Constant-time fake compare to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingprotection000000000000000000000000')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.mustSetPassword) {
      return NextResponse.json({ error: 'You must set a new password before logging in. Check your invitation email.' }, { status: 403 })
    }

    await updateLastLogin(user.id)

    const token = await issueToken(user)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
    response.cookies.set(COOKIE_NAME, token, cookieOptions(SESSION_HOURS * 3600))
    return response
  } catch (err: any) {
    console.error('[super-admin auth] POST error:', err?.message)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

/**
 * GET /api/super-admin/auth
 * Returns current session user info.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) return NextResponse.json({ authenticated: false })
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.saRole,
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}

/**
 * DELETE /api/super-admin/auth — logout
 */
export async function DELETE(_req: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, '', cookieOptions(0))
  return response
}
